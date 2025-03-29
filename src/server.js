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

// Load .env explicitly from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY); // Debug
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY); // Debug - Added
console.log('Current working directory:', process.cwd()); // Debug

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
  console.warn('Warning: STRIPE_SECRET_KEY not set in .env. Subscription features will fail.');
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1000, // Adjust as needed
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args), prefix: 'rate-limit:' }),
  skip: (req) => req.path.startsWith('/admin') || req.path === '/',
  message: (req) => ({
    error: 'Rate limit exceeded',
    tier_info: { current_tier: 'free', limit: 1000, current_count: req.rateLimit.current, reset_after: Math.max(0, req.rateLimit.resetTime - Date.now()) / 1000 },
    upgrade_options: { next_tier: 'core', benefits: ['500 requests/month'] }
  })
});

// Routes
app.use('/', router);
app.use('/api/fitness', limiter, fitnessRoutes);

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;