// src/routes/router.js
import express from 'express';

const router = express.Router();

// API endpoints
router.get('/status', (req, res) => {
  res.json({ status: 'API is running', version: '1.0.0' });
});

// Add your existing routes here - these are examples you can modify
router.get('/user/:id', (req, res) => {
  res.json({ message: `User data for ID: ${req.params.id}` });
});

router.post('/data', (req, res) => {
  res.json({ message: 'Data received', data: req.body });
});

export default router;