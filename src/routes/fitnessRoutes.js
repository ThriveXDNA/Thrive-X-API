const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase and Stripe
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
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
    .select('plan, role, email_verified')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    console.error('Supabase error or no user found for /auth/validate:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  console.log('API key validated:', data);
  res.json({ plan: data.plan, role: data.role, email_verified: data.email_verified });
});

// Check email verification
router.post('/check-email-verified', authenticateApiKey, async (req, res) => {
  const { email } = req.body;
  console.log('Reached /check-email-verified with email:', email);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('email_verified')
      .eq('email', email)
      .eq('api_key', req.headers['x-api-key'])
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

    const apiKey = uuidv4();

    const { data: userData, error } = await supabase
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId }],
      mode: 'subscription',
      success_url: 'https://thrive-x-api.vercel.app/fitness/subscribe?success=true',
      cancel_url: 'https://thrive-x-api.vercel.app/fitness/subscribe?canceled=true',
      metadata: {
        plan: planId,
        email
      },
      customer_email: email
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
      const email = session.metadata.email;

      console.log('Checkout session completed for email:', email, 'Plan:', plan);

      const apiKey = uuidv4();

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
router.post('/workout', authenticateApiKey, async (req, res) => {
  try {
    const {
      goals,
      fitnessLevel,
      preferences,
      bodyFocus,
      muscleGroups,
      includeWarmupCooldown,
      daysPerWeek,
      sessionDuration,
      planDurationWeeks
    } = req.body;

    if (!goals || !fitnessLevel || !daysPerWeek || !planDurationWeeks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const workoutPlan = {
      goal: goals,
      fitnessLevel,
      daysPerWeek,
      weeks: planDurationWeeks,
      days: []
    };

    res.json({ data: workoutPlan });
  } catch (error) {
    console.error('Error generating workout plan:', error);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

router.post('/meal-plan', authenticateApiKey, async (req, res) => {
  try {
    const {
      goals,
      dietType,
      gender,
      age,
      weight,
      heightCm,
      activityLevel,
      allergies,
      religiousPreferences,
      calorieTarget,
      mealsPerDay,
      numberOfDays
    } = req.body;

    if (!goals || !weight || !heightCm || !mealsPerDay || !numberOfDays) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const mealPlan = {
      macros: { protein: 0, fat: 0, carbs: 0, calories: calorieTarget || 0 },
      mealPlan: []
    };

    res.json({ data: mealPlan });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

router.post('/exercise', authenticateApiKey, async (req, res) => {
  try {
    const { exerciseId, includeVariations } = req.body;

    if (!exerciseId) {
      return res.status(400).json({ error: 'Exercise ID required' });
    }

    const exerciseDetails = {
      name: 'Sample Exercise',
      muscle_groups: ['Sample'],
      equipment_needed: ['None'],
      steps: ['Step 1', 'Step 2'],
      difficulty: 'Beginner',
      tips: ['Tip 1'],
      variations: includeVariations ? [{ name: 'Variation', description: 'Desc', difficulty: 'Moderate' }] : []
    };

    res.json({ data: exerciseDetails });
  } catch (error) {
    console.error('Error fetching exercise details:', error);
    res.status(500).json({ error: 'Failed to fetch exercise details' });
  }
});

router.post('/food-plate', authenticateApiKey, async (req, res) => {
  try {
    const formData = req.body;

    const foodAnalysis = {
      title: 'Food Plate Analysis',
      foods: [{ name: 'Sample Food', calories: 100, protein: 10, fat: 5, carbs: 15 }]
    };

    res.json({ data: foodAnalysis });
  } catch (error) {
    console.error('Error analyzing food plate:', error);
    res.status(500).json({ error: 'Failed to analyze food plate' });
  }
});

router.post('/food-ingredient', authenticateApiKey, async (req, res) => {
  try {
    const { ingredient } = req.body;

    if (!ingredient) {
      return res.status(400).json({ error: 'Ingredient name required' });
    }

    const ingredientDetails = {
      name: ingredient,
      category: 'Sample',
      origin: 'Sample',
      safety_rating: 'Safe',
      definition: 'Sample definition',
      layman_term: 'Sample term',
      production_process: 'Sample process',
      example_use: 'Sample use'
    };

    res.json({ data: ingredientDetails });
  } catch (error) {
    console.error('Error fetching ingredient details:', error);
    res.status(500).json({ error: 'Failed to fetch ingredient details' });
  }
});

router.post('/natural-remedies', authenticateApiKey, async (req, res) => {
  try {
    const { symptom, approach } = req.body;

    if (!symptom) {
      return res.status(400).json({ error: 'Symptom required' });
    }

    const remedies = {
      remedies: [{
        name: 'Sample Remedy',
        description: 'Sample description',
        preparation: 'Sample preparation',
        benefits: 'Sample benefits'
      }],
      disclaimer: 'Consult a healthcare professional before use.'
    };

    res.json({ data: remedies });
  } catch (error) {
    console.error('Error fetching natural remedies:', error);
    res.status(500).json({ error: 'Failed to fetch natural remedies' });
  }
});

module.exports = router;