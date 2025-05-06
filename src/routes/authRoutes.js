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