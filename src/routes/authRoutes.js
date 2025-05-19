// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { generateToken, verifyToken, refreshToken } = require('../utils/jwtAuth');
const { formatApiResponse, formatErrorResponse } = require('../utils/responseFormatter');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// List of common temporary email domains
const tempEmailDomains = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.net',
  'sharklasers.com', 'mailinator.com', '10minutemail.com', 'yopmail.com',
  'throwawaymail.com', 'getairmail.com', 'getnada.com', 'mailnesia.com',
  'tempr.email', 'tempmail.net', 'dispostable.com', 'mintemail.com',
  'mailcatch.com', 'anonbox.net', 'harakirimail.com', 'trashmail.com'
];

// Helper function to check if email is from a temporary domain
function isTemporaryEmail(email) {
  const domain = email.split('@')[1].toLowerCase();
  return tempEmailDomains.includes(domain);
}

// Helper function to determine plan type from Stripe price ID
function determinePlanFromPriceId(priceId) {
  // Map Stripe price IDs to plan types based on your subscription plans
  const priceMap = {
    [process.env.STRIPE_PRICE_CORE]: 'core',
    [process.env.STRIPE_PRICE_CORE_YEARLY]: 'core-yearly',
    [process.env.STRIPE_PRICE_ELITE]: 'elite',
    [process.env.STRIPE_PRICE_ELITE_YEARLY]: 'elite-yearly',
    [process.env.STRIPE_PRICE_ULTIMATE]: 'ultimate',
    [process.env.STRIPE_PRICE_ULTIMATE_YEARLY]: 'ultimate-yearly'
  };
  
  return priceMap[priceId] || 'core'; // Default to core if unknown
}

// Helper function to get request limit based on plan
function getRequestLimit(planType) {
  const planLimits = {
    'core': 500,
    'core-yearly': 500,
    'elite': 2000,
    'elite-yearly': 2000,
    'ultimate': 5000,
    'ultimate-yearly': 5000
  };
  
  return planLimits[planType] || 500;
}

// Create or update user from Stripe checkout
async function createOrUpdateUserFromStripe(email, planType, subscriptionId) {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, api_key')
      .eq('email', email)
      .single();
      
    let apiKey;
    
    if (existingUser) {
      // Update existing user
      apiKey = existingUser.api_key;
      await supabase
        .from('users')
        .update({
          plan: planType,
          subscription_id: subscriptionId,
          requestsRemaining: getRequestLimit(planType),
          email_verified: true // Payment confirms email ownership
        })
        .eq('email', email);
    } else {
      // Create new user with API key
      apiKey = uuidv4();
      
      // Create auth user if they don't exist yet
      const tempPassword = uuidv4(); // Random temporary password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
      });
      
      if (authError) {
        console.error('Failed to create Supabase auth user:', authError);
        throw new Error('Failed to create user account');
      }
      
      // Insert user into our users table
      await supabase
        .from('users')
        .insert({
          api_key: apiKey,
          plan: planType,
          role: 'user',
          requestsRemaining: getRequestLimit(planType),
          email,
          email_verified: true, // Payment confirms email ownership
          subscription_id: subscriptionId,
          supabase_user_id: authData.user?.id
        });
    }
    
    return apiKey;
  } catch (error) {
    console.error('Error in createOrUpdateUserFromStripe:', error);
    throw error;
  }
}

// Send API key welcome email
async function sendApiKeyWelcomeEmail(email, apiKey, planType) {
  const planName = planType.charAt(0).toUpperCase() + planType.slice(1);
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://thrivexdna.com';
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to Thrive-X Fitness API - Your API Key',
    html: `
      <h1>Welcome to Thrive-X Fitness API!</h1>
      <p>Thank you for subscribing to our ${planName} plan.</p>
      <p>Your API Key: <strong>${apiKey}</strong></p>
      <p>To get started:</p>
      <ol>
        <li>Visit our <a href="${FRONTEND_URL}/fitness/docs">API documentation</a></li>
        <li>Add your API key to the request headers as X-API-Key</li>
        <li>Start building amazing fitness applications!</li>
      </ol>
      <p>If you need any assistance, please contact our support team.</p>
      <p>Best,<br>Thrive-X Team</p>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Check for temporary email domains
    if (isTemporaryEmail(email)) {
      return res.status(400).json({ error: 'Temporary email addresses are not allowed' });
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Create user in Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(500).json({ error: 'Failed to register user', details: authError.message });
    }
    
    // Create user in our custom users table
    const apiKey = uuidv4();
    const { data, error } = await supabase
      .from('users')
      .insert({
        api_key: apiKey,
        plan: 'core',
        role: 'user',
        requestsRemaining: 500,
        email,
        email_verified: false,
        supabase_user_id: authData.user.id
      })
      .select('plan, role, requestsRemaining')
      .single();
      
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }
    
    // Send verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await supabase
      .from('verification_codes')
      .insert({ 
        email, 
        code, 
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() 
      });
      
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thrive-X Fitness API - Verification Code',
      text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nBest,\nThrive-X Team`
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(201).json({
      message: 'User registered successfully',
      apiKey,
      plan: data.plan,
      role: data.role,
      requestsRemaining: data.requestsRemaining,
      requiresVerification: true
    });
  } catch (err) {
    console.error('Error in /register:', err.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login and get API key
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Sign in with Supabase auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error('Supabase auth error:', signInError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get user data from our custom users table
    const { data, error } = await supabase
      .from('users')
      .select('api_key, plan, role, email_verified, requestsRemaining')
      .eq('email', email)
      .single();
      
    if (error || !data) {
      console.error('Supabase select error:', error);
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.status(200).json({
      apiKey: data.api_key,
      plan: data.plan,
      role: data.role,
      email_verified: data.email_verified,
      requestsRemaining: data.requestsRemaining,
      requiresVerification: !data.email_verified
    });
  } catch (err) {
    console.error('Error in /login:', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Validate API key
router.post('/validate', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;
  
  if (!apiKey) {
    console.error('No API key provided for /validate');
    return res.status(401).json({ error: 'API key required' });
  }

  console.log('Validating API key:', apiKey);

  const { data, error } = await supabase
    .from('users')
    .select('plan, role, email_verified, requestsRemaining')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    console.error('Supabase error or no user found for /validate:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  console.log('API key validated:', data);
  res.json({ 
    plan: data.plan, 
    role: data.role, 
    email_verified: data.email_verified,
    requestsRemaining: data.requestsRemaining || 500
  });
});

// Reset password request
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
      
    if (error || !data) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // Send password reset email via Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CORS_ORIGIN}/fitness/reset-password`,
    });
    
    if (resetError) {
      console.error('Password reset error:', resetError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
    
    res.status(200).json({ message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    console.error('Error in /reset-password-request:', err.message);
    res.status(500).json({ error: 'Server error during password reset request' });
  }
});

// Update API key (regenerate)
router.post('/regenerate-api-key', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Verify credentials with Supabase auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error('Supabase auth error:', signInError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate new API key
    const newApiKey = uuidv4();
    
    // Update user's API key
    const { data, error } = await supabase
      .from('users')
      .update({ api_key: newApiKey })
      .eq('email', email)
      .select('plan, role, email_verified, requestsRemaining')
      .single();
      
    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to regenerate API key' });
    }
    
    res.status(200).json({
      message: 'API key regenerated successfully',
      apiKey: newApiKey,
      plan: data.plan,
      role: data.role,
      email_verified: data.email_verified,
      requestsRemaining: data.requestsRemaining
    });
  } catch (err) {
    console.error('Error in /regenerate-api-key:', err.message);
    res.status(500).json({ error: 'Server error during API key regeneration' });
  }
});

// Process Stripe checkout completion (helper method for webhook)
router.post('/stripe-subscription-created', async (req, res) => {
  try {
    const { email, priceId, subscriptionId } = req.body;
    
    if (!email || !priceId || !subscriptionId) {
      return res.status(400).json({ error: 'Email, priceId, and subscriptionId are required' });
    }
    
    const planType = determinePlanFromPriceId(priceId);
    const apiKey = await createOrUpdateUserFromStripe(email, planType, subscriptionId);
    await sendApiKeyWelcomeEmail(email, apiKey, planType);
    
    res.status(200).json({ message: 'Subscription processed successfully' });
  } catch (err) {
    console.error('Error in /stripe-subscription-created:', err.message);
    res.status(500).json({ error: 'Server error processing subscription' });
  }
});

// Mobile token-based authentication endpoint
router.post('/mobile/token', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json(
        formatErrorResponse('Email and password are required', 400, 'AUTH_MISSING_CREDENTIALS')
      );
    }
    
    // Sign in with Supabase auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error('Supabase auth error:', signInError);
      return res.status(401).json(
        formatErrorResponse('Invalid credentials', 401, 'AUTH_INVALID_CREDENTIALS')
      );
    }
    
    // Get user data from our custom users table
    const { data, error } = await supabase
      .from('users')
      .select('id, api_key, plan, role, email_verified, requestsRemaining')
      .eq('email', email)
      .single();
      
    if (error || !data) {
      console.error('Supabase select error:', error);
      return res.status(404).json(
        formatErrorResponse('User profile not found', 404, 'AUTH_PROFILE_NOT_FOUND')
      );
    }

    // Generate JWT token for mobile clients
    const token = generateToken(data);
    
    res.status(200).json(formatApiResponse({
      token,
      apiKey: data.api_key,
      plan: data.plan,
      role: data.role,
      email_verified: data.email_verified,
      requestsRemaining: data.requestsRemaining,
      requiresVerification: !data.email_verified
    }));
  } catch (err) {
    console.error('Error in /mobile/token:', err.message);
    res.status(500).json(
      formatErrorResponse('Server error during authentication', 500, 'SERVER_ERROR')
    );
  }
});

// Mobile token refresh endpoint
router.post('/mobile/refresh-token', async (req, res) => {
  try {
    const { token: oldToken } = req.body;
    
    if (!oldToken) {
      return res.status(400).json(
        formatErrorResponse('Token is required', 400, 'AUTH_TOKEN_MISSING')
      );
    }
    
    // Refresh the token
    try {
      const newToken = refreshToken(oldToken);
      
      res.status(200).json(formatApiResponse({
        token: newToken
      }));
    } catch (tokenError) {
      return res.status(401).json(
        formatErrorResponse('Invalid token', 401, 'AUTH_TOKEN_INVALID')
      );
    }
  } catch (err) {
    console.error('Error in /mobile/refresh-token:', err.message);
    res.status(500).json(
      formatErrorResponse('Server error during token refresh', 500, 'SERVER_ERROR')
    );
  }
});

// Validate JWT token
router.post('/mobile/validate-token', verifyToken, (req, res) => {
  // If we get here, the token is valid (verifyToken middleware validated it)
  res.status(200).json(formatApiResponse({
    valid: true,
    user: {
      email: req.user.email,
      plan: req.user.plan,
      role: req.user.role
    }
  }));
});

module.exports = router;