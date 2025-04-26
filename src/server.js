
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const { rateLimit } = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const router = require('./routes/router');
const fitnessRoutes = require('./routes/fitnessRoutes');
const authRoutes = require('./routes/authRoutes');
const Stripe = require('stripe');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('Loaded env - OPENAI:', process.env.OPENAI_API_KEY ? 'set' : 'not set');
console.log('Loaded env - ANTHROPIC:', process.env.ANTHROPIC_API_KEY ? 'set' : 'not set');
console.log('Loaded env - SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'not set');
console.log('Loaded env - SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'set' : 'not set');
console.log('Loaded env - REDIS_URL:', process.env.REDIS_URL ? process.env.REDIS_URL : 'not set');
console.log('Loaded env - ADMIN_API_KEY:', process.env.ADMIN_API_KEY ? 'set' : 'not set');
console.log('Loaded env - EMAIL_USER:', process.env.EMAIL_USER ? 'set' : 'not set');
console.log('Loaded env - EMAIL_PASS:', process.env.EMAIL_PASS ? 'set' : 'not set');
console.log('Loaded env - STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? 'set' : 'not set');
console.log('Loaded env - STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'set' : 'not set');
console.log('Loaded env - STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'not set');

// Configuration
const app = express();
app.set('trust proxy', 1); // Trust first proxy (Vercel)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase;
try {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in .env');
  }
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');
} catch (err) {
  console.error('Supabase setup failed:', err.message);
}

// Stripe setup
let stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe initialized');
} catch (err) {
  console.error('Stripe setup failed:', err.message);
}

// Subscription plans
const subscriptionPlans = {
  'essential': { id: 'essential', name: 'Essential', price: 0, description: '10 requests/month', requests: 10 },
  'essential-yearly': { id: 'essential-yearly', name: 'Essential', price: 0, description: '10 requests/month', requests: 10 },
  'core': { id: 'core', name: 'Core', price: 14.99, priceId: process.env.STRIPE_PRICE_CORE, description: '500 requests/month', requests: 500 },
  'core-yearly': { id: 'core-yearly', name: 'Core', price: 149.90, priceId: process.env.STRIPE_PRICE_CORE_YEARLY, description: '500 requests/month', requests: 500 },
  'elite': { id: 'elite', name: 'Elite', price: 49.99, priceId: process.env.STRIPE_PRICE_ELITE, description: '2,000 requests/month', requests: 2000 },
  'elite-yearly': { id: 'elite-yearly', name: 'Elite', price: 479.90, priceId: process.env.STRIPE_PRICE_ELITE_YEARLY, description: '2,000 requests/month', requests: 2000 },
  'ultimate': { id: 'ultimate', name: 'Ultimate', price: 129.99, priceId: process.env.STRIPE_PRICE_ULTIMATE, description: '5,000 requests/month', requests: 5000 },
  'ultimate-yearly': { id: 'ultimate-yearly', name: 'Ultimate', price: 1169.90, priceId: process.env.STRIPE_PRICE_ULTIMATE_YEARLY, description: '5,000 requests/month', requests: 5000 }
};

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'], credentials: true }));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Add route for /fitness/docs
app.get('/fitness/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fitness', 'docs.html'));
});

// Add route for /fitness/subscribe
app.get('/fitness/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fitness', 'subscribe.html'));
});

// Add route to expose Stripe publishable key to frontend
app.get('/fitness/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// API key authentication middleware
const authenticateApiKey = async (req, res, next) => {
  console.log('Entering authenticateApiKey middleware for path:', req.path);
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers['x-api-key'] || req.headers['X-Api-Key'];
    console.log('Extracted API key:', apiKey || 'none provided');

    if (!apiKey) {
      console.log('No API key provided in headers for path:', req.path);
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!supabase) {
      console.log('Supabase not initialized');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('Querying Supabase for API key:', apiKey);
    const { data, error } = await supabase
      .from('users')
      .select('plan, role')
      .eq('api_key', apiKey)
      .single();

    console.log('Supabase response:', { data: data || 'none', error: error?.message || 'none' });

    if (data && !error) {
      req.user = { plan: data.plan || 'essential', role: data.role || 'user' };
      console.log('User authenticated:', req.user);
      return next();
    }

    console.log('Checking ADMIN_API_KEY:', ADMIN_API_KEY ? 'set' : 'not set');
    if (apiKey === ADMIN_API_KEY) {
      req.user = { plan: 'ultimate', role: 'admin' };
      console.log('Admin authenticated via ADMIN_API_KEY');
      return next();
    }

    console.log('Invalid API key:', apiKey, 'for path:', req.path);
    return res.status(401).json({ error: 'Invalid API key' });
  } catch (err) {
    console.error('Auth middleware error:', err.message, 'Path:', req.path);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1000,
  skip: (req) => {
    console.log('Rate limit check - Path:', req.path, 'User:', req.user);
    return req.path.startsWith('/admin') || req.path === '/' || (req.user && req.user.role === 'admin');
  },
  message: (req) => ({
    error: 'Rate limit exceeded',
    tier_info: { current_tier: 'free', limit: 1000, current_count: req.rateLimit?.current || 0, reset_after: Math.max(0, (req.rateLimit?.resetTime || 0) - Date.now()) / 1000 },
    upgrade_options: { next_tier: 'core', benefits: ['500 requests/month'] }
  })
});

// Add this route handler for email verification
app.post('/fitness/api/fitness/verify-code', async (req, res) => {
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

// Add route handler for resending verification code
app.post('/fitness/api/fitness/resend-verification-code', async (req, res) => {
  const { email, apiKey } = req.body;
  console.log('Reached /resend-verification-code with email:', email);
  
  if (!email || !apiKey) {
    return res.status(400).json({ error: 'Email and API key are required' });
  }

  try {
    // Verify the API key
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, email_verified')
      .eq('api_key', apiKey)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'Invalid API key' });
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
    console.error('Error in /resend-verification-code:', err.message);
    res.status(500).json({ error: 'Server error during code sending' });
  }
});

// Routes
try {
  app.use('/fitness/api/fitness', limiter, fitnessRoutes);
  app.use('/fitness/api/auth', authRoutes); // Changed from fitnessRoutes to authRoutes
  app.use('/fitness', router);
  console.log('Routes mounted successfully - /fitness/api/fitness and /fitness/api/auth');
} catch (err) {
  console.error('Error mounting routes:', err.message);
  process.exit(1);
}

// Debug route for /auth/validate
app.post('/fitness/api/auth/validate', (req, res) => {
  console.log('Debug: /fitness/api/auth/validate route hit');
  res.status(200).json({ message: 'Debug: /auth/validate route is registered' });
});

// Root route
app.get('/', (req, res) => {
  if (req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers['X-Api-Key']) {
    return res.json({ message: 'API is running', version: 'debug8-2025-04-04' });
  }
  res.sendFile(path.join(__dirname, 'public', 'fitness', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, 'Stack:', err.stack, 'Path:', req.path);
  res.status(500).json({ error: 'Server error', details: err.message });
});

console.log('Server setup complete');
module.exports = app;
