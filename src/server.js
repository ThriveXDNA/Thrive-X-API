// src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const Redis = require('ioredis');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('@supabase/supabase-js');
const router = require('./routes/router');
const fitnessRoutes = require('./routes/fitnessRoutes');
const Stripe = require('stripe');

// Load .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('Loaded env - OPENAI:', process.env.OPENAI_API_KEY ? 'set' : 'not set');
console.log('Loaded env - ANTHROPIC:', process.env.ANTHROPIC_API_KEY ? 'set' : 'not set');

// Configuration
const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Redis setup
const redisClient = new Redis();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY not set in .env');
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
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy violation'));
  },
  credentials: true
}));
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

// Rate limiting (global, not subscription-specific)
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1000,
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args), prefix: 'rate-limit:' }),
  skip: (req) => req.path.startsWith('/admin') || req.path === '/',
  message: (req) => ({
    error: 'Rate limit exceeded',
    tier_info: { current_tier: 'free', limit: 1000, current_count: req.rateLimit.current, reset_after: Math.max(0, req.rateLimit.resetTime - Date.now()) / 1000 },
    upgrade_options: { next_tier: 'core', benefits: ['500 requests/month'] }
  })
});

// Middleware to handle API key and subscription limits
app.use(async (req, res, next) => {
  if (req.path.startsWith('/fitness/api/fitness')) {  // Updated to match new route
    req.appKey = req.headers['x-api-key'];
    if (!req.appKey) return res.status(401).json({ error: 'API key is required' });

    // Validate API key and fetch user profile from Supabase
    const { data, error } = await supabase
      .from('users')
      .select('plan, role')
      .eq('api_key', req.appKey)
      .single();

    if (error || !data) return res.status(401).json({ error: 'Invalid API key' });
    req.user = { plan: data.plan || 'essential', role: data.role || 'user' };

    // Skip subscription limits for admins
    if (req.user.role === 'admin') return next();

    // Check and enforce subscription limits via Redis
    const redisKey = `requests:${req.appKey}:${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    let requestsRemaining = await redisClient.get(redisKey);

    if (requestsRemaining === null) {
      const planLimits = subscriptionPlans[req.user.plan].requests;
      requestsRemaining = planLimits;
      await redisClient.set(redisKey, planLimits, 'EX', 30 * 24 * 60 * 60); // 30-day expiry
    } else {
      requestsRemaining = parseInt(requestsRemaining, 10);
    }

    if (requestsRemaining <= 0) {
      return res.status(429).json({
        error: 'Monthly request limit exceeded',
        tier_info: { current_tier: req.user.plan, limit: subscriptionPlans[req.user.plan].requests, remaining: 0 },
        upgrade_options: { next_tier: req.user.plan === 'essential' ? 'core' : 'elite', benefits: ['More requests/month'] }
      });
    }

    req.requestsRemaining = requestsRemaining;
    if (req.path !== '/fitness/api/fitness/food-plate') {  // Updated path
      console.log('Stripping X-API-Key for:', req.path);
      delete req.headers['x-api-key'];
    }
  }
  next();
});

// Routes
app.use('/fitness', router);  // Moved from '/' to '/fitness'
app.use('/fitness/api/fitness', limiter, fitnessRoutes);  // Moved from '/api/fitness'

// Decrement request count on successful response
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (req.path.startsWith('/fitness/api/fitness') && res.statusCode === 200 && req.user?.role !== 'admin') {  // Updated path
      const redisKey = `requests:${req.appKey}:${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
      redisClient.decr(redisKey);
    }
    originalJson.call(this, body);
  };
  next();
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;