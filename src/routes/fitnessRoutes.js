const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Import the controllers
const { generateWorkoutPlan } = require('../api/fitness/workoutController');
const { generateMealPlan } = require('../api/fitness/mealPlanController');
const { getExerciseDetails } = require('../api/fitness/exerciseController');
const { getNaturalRemedies } = require('../api/fitness/naturalRemediesController');
const { analyzeFoodPlate } = require('../api/fitness/analyzeFoodPlate');
const { getIngredientDetails } = require('../api/fitness/foodIngredientController');

// Initialize Supabase and Stripe
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Middleware to authenticate API key
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    console.error('No API key provided');
    return res.status(401).json({ error: 'API key required' });
  }

  console.log('Extracted API key:', apiKey);
  console.log('Querying Supabase for API key:', apiKey);

  const { data, error } = await supabase
    .from('users')
    .select('plan, role, email')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    console.error('Supabase error or no user found:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  console.log('Supabase response:', { data, error: 'none' });
  console.log('User authenticated:', data);
  req.user = data;
  next();
}

// Validate API key
router.post('/auth/validate', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    console.error('No API key provided for /auth/validate');
    return res.status(401).json({ error: 'API key required' });
  }

  console.log('Validating API key:', apiKey);

  const { data, error } = await supabase
    .from('users')
    .select('plan, role, email_verified, requestsRemaining')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    console.error('Supabase error or no user found for /auth/validate:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  console.log('API key validated:', data);
  res.json({ 
    plan: data.plan, 
    role: data.role, 
    email_verified: data.email_verified,
    requestsRemaining: data.requestsRemaining || 10
  });
});

// Check email verification
router.post('/check-email-verified', async (req, res) => {
  const { email } = req.body;
  const apiKey = req.headers['x-api-key'];
  
  console.log('Reached /check-email-verified with email:', email);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('email_verified')
      .eq('email', email)
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      console.error('Supabase error or no user found:', error);
      return res.status(400).json({ error: 'User not found' });
    }

    res.status(200).json({ verified: data.email_verified });
  } catch (err) {
    console.error('Error in /check-email-verified:', err.message);
    res.status(500).json({ error: 'Server error during verification check' });
  }
});

// Send verification code
router.post('/send-verification-code', async (req, res) => {
  const { email } = req.body;
  console.log('Reached /send-verification-code with email:', email);

  try {
    if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      console.error('Invalid email:', email);
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check for rate limiting of codes (max 3 within 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existingCodes, error: countError } = await supabase
      .from('verification_codes')
      .select('id')
      .eq('email', email)
      .gte('created_at', fifteenMinutesAgo);

    if (countError) {
      console.error('Error checking existing codes:', countError);
      return res.status(500).json({ error: 'Failed to check rate limits' });
    }

    if (existingCodes && existingCodes.length >= 3) {
      console.error('Rate limit exceeded for email:', email);
      return res.status(429).json({ error: 'Too many verification attempts. Please try again in 15 minutes.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabase
      .from('verification_codes')
      .insert({ email, code, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to store verification code' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thrive-X Fitness Verification Code',
      text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nBest,\nThrive-X Team`
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification code sent to:', email);

    res.status(200).json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('Error in /send-verification-code:', err.message);
    res.status(500).json({ error: 'Server error during code sending' });
  }
});

// Verify code
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  console.log('Reached /verify-code with email:', email, 'code:', code);

  try {
    const { data, error } = await supabase
      .from('verification_codes')
      .select('code, expires_at')
      .eq('email', email)
      .eq('code', code)
      .single();

    if (error || !data) {
      console.error('Invalid or expired code:', error);
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    if (new Date(data.expires_at) < new Date()) {
      console.error('Code expired for email:', email);
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('email', email);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email);

    console.log('Email verified for:', email);
    res.status(200).json({ message: 'Email verified' });
  } catch (err) {
    console.error('Error in /verify-code:', err.message);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// Activate free plan
router.post('/activate-free-plan', async (req, res) => {
  const { planId, email } = req.body;
  console.log('Reached /activate-free-plan with planId:', planId, 'email:', email);
  try {
    if (!['essential', 'essential-yearly'].includes(planId)) {
      console.error('Invalid free planId:', planId);
      return res.status(400).json({ error: `Invalid planId: ${planId}` });
    }
    if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      console.error('Invalid email:', email);
      return res.status(400).json({ error: 'Invalid email address' });
    }
    const disposableDomains = ['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'sharklasers.com', 'throwawaymail.com', 'yopmail.com', 'dispostable.com'];
    if (disposableDomains.some(domain => email.toLowerCase().endsWith(`@${domain}`))) {
      console.error('Disposable email detected:', email);
      return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
    }

    // Check if user with this email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('api_key')
      .eq('email', email)
      .single();

    let apiKey;
    let userData;

    if (existingUser) {
      // Update existing user
      apiKey = existingUser.api_key;
      const { data, error } = await supabase
        .from('users')
        .update({
          plan: planId,
          requestsRemaining: 10,
          email_verified: false
        })
        .eq('email', email)
        .select('plan, role, requestsRemaining')
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ error: 'Failed to update user profile' });
      }
      
      userData = data;
    } else {
      // Create new user
      apiKey = uuidv4();
      const { data, error } = await supabase
        .from('users')
        .insert({
          api_key: apiKey,
          plan: planId,
          role: 'user',
          requestsRemaining: 10,
          email,
          email_verified: false
        })
        .select('plan, role, requestsRemaining')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
      
      userData = data;
    }

    // Send welcome email with API key
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Thrive-X Fitness API - Your API Key',
      text: `Welcome to Thrive-X Fitness API!

Your Essential plan has been activated. Here are your account details:

API Key: ${apiKey}
Plan: ${planId}
Requests Remaining: 10

Please keep your API key secure as it provides access to our services.

To verify your email address, we've sent a separate verification code to your email. Please check your inbox and enter the code on our website.

Best regards,
The Thrive-X Team`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue despite email error
    }

    console.log(`Free plan ${planId} activated for email:`, email);

    res.status(200).json({
      apiKey,
      plan: userData.plan,
      role: userData.role,
      requestsRemaining: userData.requestsRemaining
    });
  } catch (err) {
    console.error('Error in /activate-free-plan:', err.message);
    res.status(500).json({ error: 'Server error during free plan activation' });
  }
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  const { planId, email } = req.body;
  console.log('Reached /create-checkout-session route with planId:', planId, 'email:', email);

  const planPriceIds = {
    'core': process.env.STRIPE_PRICE_CORE,
    'core-yearly': process.env.STRIPE_PRICE_CORE_YEARLY,
    'elite': process.env.STRIPE_PRICE_ELITE,
    'elite-yearly': process.env.STRIPE_PRICE_ELITE_YEARLY,
    'ultimate': process.env.STRIPE_PRICE_ULTIMATE,
    'ultimate-yearly': process.env.STRIPE_PRICE_ULTIMATE_YEARLY
  };

  const priceId = planPriceIds[planId];
  if (!priceId) {
    console.error('Invalid planId:', planId);
    return res.status(400).json({ error: `Invalid planId: ${planId}` });
  }
  if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
    console.error('Invalid email:', email);
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const disposableDomains = ['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'sharklasers.com', 'throwawaymail.com', 'yopmail.com', 'dispostable.com'];
  if (disposableDomains.some(domain => email.toLowerCase().endsWith(`@${domain}`))) {
    console.error('Disposable email detected:', email);
    return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
  }

  try {
    console.log('Validating price ID:', priceId);
    const price = await stripe.prices.retrieve(priceId);
    if (!price) {
      console.error('Price ID does not exist:', priceId);
      return res.status(400).json({ error: 'Invalid price ID' });
    }

    // Use the request origin or default to production URL
    const origin = req.headers.origin || 'https://thrive-x-api.vercel.app';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId }],
      mode: 'subscription',
      success_url: `${origin}/fitness/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/fitness/subscribe?canceled=true`,
      metadata: {
        plan: planId,
        email
      },
      customer_email: email,
      billing_address_collection: 'required'
    });

    console.log('Checkout session created:', session.id);
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('Webhook event received:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const plan = session.metadata.plan;
      const email = session.metadata.email || session.customer_email;

      console.log('Checkout session completed for email:', email, 'Plan:', plan);

      // Create API key for the user
      const apiKey = uuidv4();
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
        
      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({
            api_key: apiKey,
            plan,
            role: 'user',
            requestsRemaining: plan.startsWith('core') ? 500 : plan.startsWith('elite') ? 2000 : 5000,
            email_verified: false
          })
          .eq('email', email);
          
        if (updateError) {
          console.error('Error updating user in Supabase:', updateError);
        } else {
          console.log('User updated in Supabase:', { apiKey, plan, email });
        }
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert({
            api_key: apiKey,
            plan,
            role: 'user',
            requestsRemaining: plan.startsWith('core') ? 500 : plan.startsWith('elite') ? 2000 : 5000,
            email,
            email_verified: false
          });

        if (error) {
          console.error('Error inserting user in Supabase:', error);
        } else {
          console.log('User created in Supabase:', { apiKey, plan, email });
        }
      }
      
      // Send email with API key
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Thrive-X Fitness API Subscription',
        text: `Thank you for subscribing to Thrive-X Fitness API!

Your subscription has been activated. Here are your account details:

API Key: ${apiKey}
Plan: ${plan}
Requests: ${plan.startsWith('core') ? '500' : plan.startsWith('elite') ? '2,000' : '5,000'} per month

Please keep your API key secure as it provides access to our services.

To verify your email address, please visit our website and enter the verification code we'll send separately.

Best regards,
The Thrive-X Team`
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('Subscription email sent to:', email);
      } catch (emailError) {
        console.error('Error sending subscription email:', emailError);
      }

      break;
    case 'invoice.paid':
      console.log('Invoice paid:', event.data.object);
      break;
    case 'invoice.payment_failed':
      console.log('Invoice payment failed:', event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// API routes (unchanged)
router.post('/workout', authenticateApiKey, generateWorkoutPlan);
router.post('/meal-plan', authenticateApiKey, generateMealPlan);
router.post('/exercise', authenticateApiKey, getExerciseDetails);
router.post('/natural-remedies', authenticateApiKey, getNaturalRemedies);
router.post('/food-plate', authenticateApiKey, analyzeFoodPlate);
router.post('/food-ingredient', authenticateApiKey, getIngredientDetails);

module.exports = router;
