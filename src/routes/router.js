// src/routes/router.js
const express = require('express');
const router = express.Router();
const fitnessRoutes = require('./fitnessRoutes');

// Health check endpoint
router.get('/status', (req, res) => {
  res.json({ status: 'API is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Mount fitness-specific routes at /api/fitness
router.use('/api/fitness', fitnessRoutes);

module.exports = router;