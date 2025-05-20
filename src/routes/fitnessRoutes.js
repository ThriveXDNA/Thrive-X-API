// src/routes/fitnessRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Must be set in Vercel env
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Import controllers from src/api/fitness/
const { generateWorkoutPlan } = require('../api/fitness/workoutController');
const { getExerciseDetails } = require('../api/fitness/exerciseController');
const { generateMealPlan } = require('../api/fitness/mealPlanController');
const { analyzeFoodPlate } = require('../api/fitness/analyzeFoodPlate');
const { getFoodIngredientDetails } = require('../api/fitness/foodIngredientController');
const { getNaturalRemedies } = require('../api/fitness/naturalRemediesController');

// Frontend URL for redirects
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://thrivexdna.com';

// Email transport setup (reusing your existing setup)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper to send API key email (simple implementation)
async function sendApiKeyEmail(email, apiKey, planName) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Thrive-X Fitness API',
      html: `
        <h1>Welcome to Thrive-X Fitness API!</h1>
        <p>Thank you for subscribing to our ${planName} plan.</p>
        <p>Your API Key is now available in your account dashboard.</p>
        <p>Visit our <a href="${FRONTEND_URL}/fitness/dashboard">dashboard</a> to retrieve your API key and <a href="${FRONTEND_URL}/fitness/docs">documentation</a> to get started.</p>
      `
    };
    
    // Then add a separate function to create a temporary access link for the dashboard
    // Or implement a secure dashboard view where users can see their API key after authentication
    
    await transporter.sendMail(mailOptions);
    console.log(`API key email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send API key email:', error);
  }
}

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
  console.log('Reached /food-ingredient route, User ID:', req.user?.id || 'unknown');
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
      console.log('Payment successful for session:', session.id);
      
      // Handle user creation in a non-blocking way
      setTimeout(async () => {
        try {
          // Get customer email from session
          const customerEmail = session.customer_details?.email;
          if (!customerEmail) return;
          
          // Get subscription details if exists
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            const priceId = subscription.items.data[0].price.id;
            
            // Determine plan type
            let planType = 'core';
            if (priceId === process.env.STRIPE_PRICE_ELITE || 
                priceId === process.env.STRIPE_PRICE_ELITE_YEARLY) {
              planType = 'elite';
            } else if (priceId === process.env.STRIPE_PRICE_ULTIMATE || 
                       priceId === process.env.STRIPE_PRICE_ULTIMATE_YEARLY) {
              planType = 'ultimate';
            }
            
            // Get requests limit based on plan
            const requestsLimit = planType === 'core' ? 500 :
                                 planType === 'elite' ? 2000 : 5000;
            
            // Check if user exists
            const { data: user } = await supabase
              .from('users')
              .select('id, api_key')
              .eq('email', customerEmail)
              .single();
              
            let apiKey;
            
            if (user) {
              // Update existing user
              apiKey = user.api_key;
              await supabase
                .from('users')
                .update({
                  plan: planType,
                  requestsRemaining: requestsLimit,
                  subscription_id: subscription.id,
                  email_verified: true
                })
                .eq('email', customerEmail);
            } else {
              // Create new user
              apiKey = uuidv4();
              await supabase
                .from('users')
                .insert({
                  email: customerEmail,
                  api_key: apiKey,
                  plan: planType,
                  role: 'user',
                  requestsRemaining: requestsLimit,
                  email_verified: true,
                  subscription_id: subscription.id
                });
            }
            
            // Send welcome email with API key
            await sendApiKeyEmail(customerEmail, apiKey, planType);
          }
        } catch (err) {
          console.error('Error processing checkout session:', err);
        }
      }, 0);
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription.id);
      // Process subscription updates if needed
      break;
      
    case 'invoice.paid':
      const invoice = event.data.object;
      console.log('Invoice paid:', invoice.id);
      // Handle invoice payment if needed
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