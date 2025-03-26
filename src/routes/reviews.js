// src/routes/reviews.js
import express from 'express';

const router = express.Router();

// Review routes
router.get('/', (req, res) => {
  res.json({ message: 'Get all reviews' });
});

router.get('/:id', (req, res) => {
  res.json({ message: `Get review with ID: ${req.params.id}` });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create new review', data: req.body });
});

router.put('/:id', (req, res) => {
  res.json({ message: `Update review with ID: ${req.params.id}`, data: req.body });
});

router.delete('/:id', (req, res) => {
  res.json({ message: `Delete review with ID: ${req.params.id}` });
});

export default router;