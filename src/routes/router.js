// src/routes/router.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

const router = express.Router();
const fitnessRoutes = require('./fitnessRoutes');

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Redis setup
const redisClient = new Redis();

// Health check endpoint
router.get('/status', (req, res) => {
  res.json({ status: 'API is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Validate API key and return user profile
router.post('/api/auth/validate', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  // Fetch user from Supabase
  const { data, error } = await supabase
    .from('users')
    .select('plan, role')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid API key' });

  // Get or set request count from Redis
  const redisKey = `requests:${apiKey}:${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
  let requestsRemaining = await redisClient.get(redisKey);
  const planLimits = {
    essential: 10, 'essential-yearly': 10,
    core: 500, 'core-yearly': 500,
    elite: 2000, 'elite-yearly': 2000,
    ultimate: 5000, 'ultimate-yearly': 5000
  };

  if (requestsRemaining === null) {
    requestsRemaining = planLimits[data.plan || 'essential'];
    await redisClient.set(redisKey, requestsRemaining, 'EX', 30 * 24 * 60 * 60); // 30-day expiry
  } else {
    requestsRemaining = parseInt(requestsRemaining, 10);
  }

  res.json({ plan: data.plan || 'essential', role: data.role || 'user', requestsRemaining });
});

// Mount fitness-specific routes at /api/fitness
router.use('/api/fitness', fitnessRoutes);

module.exports = router;