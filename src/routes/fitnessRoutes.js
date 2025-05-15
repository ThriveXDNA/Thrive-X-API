// src/routes/fitnessRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Must be set in Vercel env

// Import controllers from src/api/fitness/
const { generateWorkoutPlan } = require('../api/fitness/workoutController');
const { getExerciseDetails } = require('../api/fitness/exerciseController');
const { generateMealPlan } = require('../api/fitness/mealPlanController');
const { analyzeFoodPlate } = require('../api/fitness/analyzeFoodPlate');
const { getFoodIngredientDetails } = require('../api/fitness/foodIngredientController');
const { getNaturalRemedies } = require('../api/fitness/naturalRemediesController');

// Frontend URL for redirects
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://thrivexdna.com';

// Define routes with debug
router.post('/workout', (req, res, next) => {
  console.log('Reached /workout route');
  generateWorkoutPlan(req, res, next);
});
router.post('/exercise', (req, res, next) => {
  console.log('Reached /exercise route');
  getExerciseDetails(req, res, next);
});
router.post('/meal-plan', (req, res, next) => {
  console.log('Reached /meal-plan route');
  generateMealPlan(req, res, next);
});
router.post('/food-plate', upload.single('food_image'), (req, res, next) => {
  console.log('Reached /food-plate route');
  analyzeFoodPlate(req, res, next);
});
router.post('/food-ingredient', (req, res, next) => {
  console.log('Reached /food-ingredient route, User:', req.user);
  getFoodIngredientDetails(req, res, next);
});
router.post('/natural-remedies', (req, res, next) => {
  console.log('Reached /natural-remedies route');
  getNaturalRemedies(req, res, next);
});

// Webhook to handle Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature using your webhook secret
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Process the checkout session - you would update your database here
      console.log('Payment successful for session:', session.id);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      // Process the subscription - update user's subscription status in your database
      console.log('Subscription updated:', subscription.id);
      break;
    case 'invoice.paid':
      const invoice = event.data.object;
      // Update user's subscription status/billing period
      console.log('Invoice paid:', invoice.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({received: true});
});

// Subscription management route
router.get('/subscription-status', async (req, res) => {
  try {
    // Here you would fetch the user's subscription status from your database
    // For now, we'll just return a placeholder
    res.json({ 
      status: 'active', 
      planName: 'Elite',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      remainingRequests: 1850
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

module.exports = router;