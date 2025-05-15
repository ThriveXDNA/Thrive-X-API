// src/routes/router.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const fitnessRoutes = require('./fitnessRoutes');

// Supabase setup (using environment variables from server.js)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Health check endpoint
router.get('/status', (req, res) => {
  res.json({ status: 'API is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Validate API key and return user profile
router.post('/fitness/api/auth/validate', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  // Fetch user from Supabase
  const { data, error } = await supabase
    .from('users')
    .select('plan, role')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid API key' });

  // Return user profile without Redis-based request counting
  res.json({ plan: data.plan || 'essential', role: data.role || 'user' });
});

// Mount fitness-specific routes at /api/fitness
router.use('/api/fitness', fitnessRoutes);

module.exports = router;