
// src/routes/router.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fitnessRoutes = require('./fitnessRoutes');

const router = express.Router();

// Supabase setup (using environment variables from server.js)
// Supabase setup (using environment variables from server.js)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Health check endpoint
router.get('/status', (req, res) => {
  res.json({ status: 'API is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Validate API key and return user profile
router.post('/fitness/api/auth/validate', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }

  try {
    // Fetch user from Supabase
    const { data, error } = await supabase
      .from('users')
      .select('plan, role, email, email_verified, requestsRemaining')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Return user profile
    res.json({ 
      plan: data.plan || 'essential', 
      role: data.role || 'user',
      email: data.email,
      email_verified: data.email_verified,
      requestsRemaining: data.requestsRemaining
    });
  } catch (err) {
    console.error('Error in /auth/validate:', err.message);
    res.status(500).json({ error: 'Server error during validation' });
  }
});

// Mount fitness-specific routes at /api/fitness
router.use('/api/fitness', fitnessRoutes);

module.exports = router;
