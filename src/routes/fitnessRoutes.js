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

// Stripe checkout session route
router.post('/create-checkout-session', async (req, res) => {
  const { planId } = req.body;
  console.log('Reached /create-checkout-session route with planId:', planId);

  if (!planId || !subscriptionPlans[planId]) {
    console.error('Invalid planId:', planId);
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  const plan = subscriptionPlans[planId];
  if (!plan.priceId) {
    console.log('No Stripe priceId for free plan:', planId);
    return res.status(200).json({ message: 'Free plan selected, no checkout needed' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: plan.priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/fitness/subscribe?success=true`,
      cancel_url: `${req.headers.origin}/fitness/subscribe?canceled=true`,
    });
    console.log('Checkout session created:', session.id);
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

module.exports = router;