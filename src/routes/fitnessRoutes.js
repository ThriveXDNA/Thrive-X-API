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

// Import controllers from src/api/fitness/
const { generateWorkoutPlan } = require('../api/fitness/workoutController');
const { getExerciseDetails } = require('../api/fitness/exerciseController');
const { generateMealPlan } = require('../api/fitness/mealPlanController');
const { analyzeFoodPlate } = require('../api/fitness/analyzeFoodPlate');
const { getFoodIngredientDetails } = require('../api/fitness/foodIngredientController');
const { getNaturalRemedies } = require('../api/fitness/naturalRemediesController');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Subscription plan request limits
const subscriptionPlans = {
  'core': { requests: 500 },
  'core-yearly': { requests: 500 },
  'elite': { requests: 2000 },
  'elite-yearly': { requests: 2000 },
  'ultimate': { requests: 5000 },
  'ultimate-yearly': { requests: 5000 }
};

// Frontend URL for redirects
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://thrivexdna.com';

// Helper function to determine plan from Stripe price ID
function determinePlanFromPriceId(priceId) {
  const priceMap = {
    [process.env.STRIPE_PRICE_CORE]: 'core',
    [process.env.STRIPE_PRICE_CORE_YEARLY]: 'core-yearly',
    [process.env.STRIPE_PRICE_ELITE]: 'elite',
    [process.env.STRIPE_PRICE_ELITE_YEARLY]: 'elite-yearly',
    [process.env.STRIPE_PRICE_ULTIMATE]: 'ultimate',
    [process.env.STRIPE_PRICE_ULTIMATE_YEARLY]: 'ultimate-yearly'
  };
  
  return priceMap[priceId] || 'core'; // Default to core if unknown
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
      
      try {
        // Extract customer email and subscription ID
        const customerEmail = session.customer_details.email;
        const subscriptionId = session.subscription;
        
        if (customerEmail && subscriptionId) {
          console.log(`Processing subscription for ${customerEmail}, subscription ID: ${subscriptionId}`);
          
          // Retrieve subscription details to get product/pricing information
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;
          const planType = determinePlanFromPriceId(priceId);
          
          // Check if user exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, api_key')
            .eq('email', customerEmail)
            .single();
          
          let apiKey;
          
          if (existingUser) {
            // Update existing user
            apiKey = existingUser.api_key;
            await supabase
              .from('users')
              .update({
                plan: planType,
                subscription_id: subscriptionId,
                requestsRemaining: subscriptionPlans[planType]?.requests || 500,
                email_verified: true // Payment confirms email
              })
              .eq('email', customerEmail);
              
            console.log(`Updated existing user: ${customerEmail} to plan: ${planType}`);
          } else {
            // Create new user with API key
            apiKey = uuidv4();
            
            // Create auth user if they don't exist yet
            const tempPassword = uuidv4(); // Random temporary password
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: customerEmail,
              password: tempPassword,
            });
            
            if (authError) {
              console.error('Failed to create auth user:', authError);
              throw new Error('Auth user creation failed');
            }
            
            // Create user entry in users table
            await supabase
              .from('users')
              .insert({
                api_key: apiKey,
                plan: planType,
                role: 'user',
                requestsRemaining: subscriptionPlans[planType]?.requests || 500,
                email: customerEmail,
                email_verified: true,
                subscription_id: subscriptionId,
                supabase_user_id: authData.user?.id
              });
              
            console.log(`Created new user: ${customerEmail} with plan: ${planType}`);
          }
          
          // Send welcome email with API key
          const planName = planType.charAt(0).toUpperCase() + planType.slice(1);
          
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: 'Welcome to Thrive-X Fitness API - Your API Key',
            html: `
              <h1>Welcome to Thrive-X Fitness API!</h1>
              <p>Thank you for subscribing to our ${planName} plan.</p>
              <p>Your API Key: <strong>${apiKey}</strong></p>
              <p>To get started:</p>
              <ol>
                <li>Visit our <a href="${FRONTEND_URL}/fitness/docs">API documentation</a></li>
                <li>Add your API key to the request headers as X-API-Key</li>
                <li>Start building amazing fitness applications!</li>
              </ol>
              <p>If you need any assistance, please contact our support team.</p>
              <p>Best,<br>Thrive-X Team</p>
            `
          };
          
          await transporter.sendMail(mailOptions);
          console.log(`Sent welcome email to ${customerEmail}`);
        }
      } catch (error) {
        console.error('Error processing checkout session:', error);
        // Don't return error to Stripe - it will retry the webhook
      }
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      // Process the subscription - update user's subscription status in your database
      console.log('Subscription updated:', subscription.id);
      
      try {
        const customerId = subscription.customer;
        const priceId = subscription.items.data[0].price.id;
        const planType = determinePlanFromPriceId(priceId);
        
        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = customer.email;
        
        if (customerEmail) {
          // Update user plan in database
          await supabase
            .from('users')
            .update({
              plan: planType,
              requestsRemaining: subscriptionPlans[planType]?.requests || 500,
              subscription_id: subscription.id
            })
            .eq('email', customerEmail);
            
          console.log(`Updated subscription for ${customerEmail} to plan: ${planType}`);
        }
      } catch (error) {
        console.error('Error updating subscription:', error);
      }
      break;
      
    case 'invoice.paid':
      const invoice = event.data.object;
      // Update user's subscription status/billing period
      console.log('Invoice paid:', invoice.id);
      
      try {
        if (invoice.customer) {
          // Get customer info
          const customer = await stripe.customers.retrieve(invoice.customer);
          const customerEmail = customer.email;
          
          if (customerEmail) {
            // Reset request count for billing cycle
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const priceId = subscription.items.data[0].price.id;
            const planType = determinePlanFromPriceId(priceId);
            
            await supabase
              .from('users')
              .update({
                requestsRemaining: subscriptionPlans[planType]?.requests || 500,
                last_billing_date: new Date().toISOString()
              })
              .eq('email', customerEmail);
              
            console.log(`Reset request count for ${customerEmail} - new billing cycle`);
          }
        }
      } catch (error) {
        console.error('Error processing invoice payment:', error);
      }
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
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('plan, subscription_id, requestsRemaining, last_billing_date')
      .eq('api_key', apiKey)
      .single();
      
    if (error || !data) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Calculate next billing date (for demonstration)
    const lastBillingDate = data.last_billing_date 
      ? new Date(data.last_billing_date) 
      : new Date();
    const nextBillingDate = new Date(lastBillingDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    res.json({
      status: 'active',
      planName: data.plan.charAt(0).toUpperCase() + data.plan.slice(1).split('-')[0],
      nextBillingDate: nextBillingDate.toISOString(),
      remainingRequests: data.requestsRemaining
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

module.exports = router;