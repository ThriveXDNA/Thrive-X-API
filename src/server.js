// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const { rateLimit } = require('express-rate-limit');
const Redis = require('ioredis'); // Add ioredis
const { createClient } = require('@supabase/supabase-js');
const router = require('./routes/router');
const fitnessRoutes = require('./routes/fitnessRoutes');
const Stripe = require('stripe');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('Loaded env - OPENAI:', process.env.OPENAI_API_KEY ? 'set' : 'not set');
console.log('Loaded env - ANTHROPIC:', process.env.ANTHROPIC_API_KEY ? 'set' : 'not set');
console.log('Loaded env - SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'not set');
console.log('Loaded env - SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'set' : 'not set');
console.log('Loaded env - REDIS_URL:', process.env.REDIS_URL ? process.env.REDIS_URL : 'not set');
console.log('Loaded env - ADMIN_API_KEY:', process.env.ADMIN_API_KEY ? 'set' : 'not set');

// Configuration
const app = express();
app.set('trust proxy', 1); // Trust first proxy (Vercel)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Redis setup
let redis;
try {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL must be set in .env');
  }
  redis = new Redis(process.env.REDIS_URL);
  console.log('Redis client initialized');
} catch (err) {
  console.error('Redis setup failed:', err.message);
}

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
  essential: { id: 'essential', name: 'Essential', price: 0, priceId: null, description: '10 requests/month', requests: 10 },
  'essential-yearly': { id: 'essential-yearly', name: 'Essential', price: 0, priceId: null, description: '10 requests/month', requests: 10 },
  core: { id: 'core', name: 'Core', price: 14.99, priceId: process.env.STRIPE_PRICE_CORE, description: '500 requests/month', requests: 500 },
  'core-yearly': { id: 'core-yearly', name: 'Core', price: 161.89, priceId: process.env.STRIPE_PRICE_CORE_YEARLY, description: '500 requests/month', requests: 500 },
  elite: { id: 'elite', name: 'Elite', price: 49.99, priceId: process.env.STRIPE_PRICE_ELITE, description: '2,000 requests/month', requests: 2000 },
  'elite-yearly': { id: 'elite-yearly', name: 'Elite', price: 509.90, priceId: process.env.STRIPE_PRICE_ELITE_YEARLY, description: '2,000 requests/month', requests: 2000 },
  ultimate: { id: 'ultimate', name: 'Ultimate', price: 129.99, priceId: process.env.STRIPE_PRICE_ULTIMATE, description: '5,000 requests/month', requests: 5000 },
  'ultimate-yearly': { id: 'ultimate-yearly', name: 'Ultimate', price: 1247.90, priceId: process.env.STRIPE_PRICE_ULTIMATE_YEARLY, description: '5,000 requests/month', requests: 5000 }
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

// API key authentication middleware
const authenticateApiKey = async (req, res, next) => {
  console.log('Entering authenticateApiKey middleware');
  console.log('Request headers:', JSON.stringify(req.headers));
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers['X-Api-Key'];
    console.log('Checking API key:', apiKey || 'none provided');

    if (!apiKey) {
      console.log('No API key provided in headers');
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

    console.log('Invalid API key:', apiKey);
    return res.status(401).json({ error: 'Invalid API key' });
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
};

// Rate limiting with Redis
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: async (req) => {
    const plan = req.user?.plan || 'essential';
    return subscriptionPlans[plan]?.requests || 10; // Default to 10 if plan not found
  },
  store: redis ? new (require('rate-limit-redis'))({
    redis: redis,
    prefix: 'rate-limit:'
  }) : undefined, // Fallback to memory if Redis fails
  skip: (req) => {
    console.log('Rate limit check - Path:', req.path, 'User:', req.user);
    return req.path.startsWith('/admin') || req.path === '/' || (req.user && req.user.role === 'admin');
  },
  message: (req) => ({
    error: 'Rate limit exceeded',
    tier_info: { current_tier: req.user?.plan || 'essential', limit: subscriptionPlans[req.user?.plan || 'essential'].requests, current_count: req.rateLimit?.current || 0, reset_after: Math.max(0, (req.rateLimit?.resetTime || 0) - Date.now()) / 1000 },
    upgrade_options: { next_tier: 'core', benefits: ['500 requests/month'] }
  })
});

// Routes
app.use('/fitness/api/fitness', authenticateApiKey, limiter, fitnessRoutes);
app.use('/fitness', router);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'API is running', version: 'debug8-2025-04-04' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, 'Stack:', err.stack);
  res.status(500).json({ error: 'Server error', details: err.message });
});

module.exports = app;