const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { rateLimit } = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const compression = require('compression');

// Log environment variables at startup (without sensitive values)
console.log('Environment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Not set');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set');
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set');
console.log('STRIPE_PRICE_CORE:', process.env.STRIPE_PRICE_CORE ? 'Set' : 'Not set');
console.log('STRIPE_PRICE_ELITE:', process.env.STRIPE_PRICE_ELITE ? 'Set' : 'Not set');
console.log('STRIPE_PRICE_ULTIMATE:', process.env.STRIPE_PRICE_ULTIMATE ? 'Set' : 'Not set');
console.log('STRIPE_PRICE_CORE_YEARLY:', process.env.STRIPE_PRICE_CORE_YEARLY ? 'Set' : 'Not set');
console.log('STRIPE_PRICE_ELITE_YEARLY:', process.env.STRIPE_PRICE_ELITE_YEARLY ? 'Set' : 'Not set');
console.log('STRIPE_PRICE_ULTIMATE_YEARLY:', process.env.STRIPE_PRICE_ULTIMATE_YEARLY ? 'Set' : 'Not set');
console.log('STRIPE_PRICE_ESSENTIAL:', process.env.STRIPE_PRICE_ESSENTIAL ? 'Set' : 'Not set');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
console.log('EMAIL_SMTP_HOST:', process.env.EMAIL_SMTP_HOST ? 'Set' : 'Not set');
console.log('EMAIL_SMTP_PORT:', process.env.EMAIL_SMTP_PORT ? 'Set' : 'Not set');
console.log('EMAIL_SMTP_SECURE:', process.env.EMAIL_SMTP_SECURE ? 'Set' : 'Not set');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configure email transporter with SMTP settings
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Subscription plans configuration
const subscriptionPlans = {
  'core': { id: 'core', name: 'Core', price: 14.99, priceId: process.env.STRIPE_PRICE_CORE, requestLimit: 500, icon: 'dumbbell' },
  'elite': { id: 'elite', name: 'Elite', price: 49.99, priceId: process.env.STRIPE_PRICE_ELITE, requestLimit: 2000, icon: 'trophy' },
  'ultimate': { id: 'ultimate', name: 'Ultimate', price: 129.99, priceId: process.env.STRIPE_PRICE_ULTIMATE, requestLimit: 5000, icon: 'crown' },
  'core-yearly': { id: 'core-yearly', name: 'Core (Yearly)', price: 149.90, priceId: process.env.STRIPE_PRICE_CORE_YEARLY, requestLimit: 500, icon: 'dumbbell' },
  'elite-yearly': { id: 'elite-yearly', name: 'Elite (Yearly)', price: 479.90, priceId: process.env.STRIPE_PRICE_ELITE_YEARLY, requestLimit: 2000, icon: 'trophy' },
  'ultimate-yearly': { id: 'ultimate-yearly', name: 'Ultimate (Yearly)', price: 1169.90, priceId: process.env.STRIPE_PRICE_ULTIMATE_YEARLY, requestLimit: 5000, icon: 'crown' }
};

// Initialize Express app
const app = express();

// Import the router
const router = require('./routes/router');

// Configure middleware
// Allow CORS - use environment variable or default value
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
};
app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Cookie parser
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON request bodies (except for webhook endpoint)
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Mount the router
app.use('/', router);

// Priority middleware for Stripe webhooks
// This must come before express.json() and other body parsers
app.post('/fitness/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Processing checkout.session.completed event:', session.id);

        // Extract customer email and subscription details
        const customerEmail = session.customer_details.email;
        const subscriptionId = session.subscription;

        if (customerEmail) {
          let planId = null;
          let requestLimit = 0;

          if (subscriptionId) {
            // This is a paid plan - get details from subscription
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0].price.id;

            // Map price ID to our plan
            planId = getPlanFromPriceId(priceId);
            if (planId) {
              requestLimit = subscriptionPlans[planId].requestLimit;
            } else {
              console.error('Unknown price ID from subscription:', priceId);
              return;
            }
          } else if (session.amount_total === 0) {
            // Free plans are now handled as core
            planId = 'core';
            requestLimit = subscriptionPlans[planId].requestLimit;
          } else {
            console.error('Unable to determine plan from session:', session.id);
            return;
          }

          if (planId) {
            // Generate API key
            const apiKey = generateApiKey();

            // Store user and subscription in database
            const { data, error } = await supabase
              .from('api_users')
              .insert([
                {
                  email: customerEmail,
                  api_key: apiKey,
                  plan: planId,
                  requests_used: 0,
                  requests_limit: requestLimit,
                  subscription_id: subscriptionId || null,
                  status: 'active',
                  created_at: new Date()
                }
              ]);

            if (error) {
              console.error('Error saving user to database:', error);
            } else {
              // Send welcome email with API key
              await sendSubscriptionEmail(customerEmail, apiKey, planId);
              console.log(`User ${customerEmail} subscribed to ${planId} plan successfully`);
            }
          }
        }
        break;

      case 'invoice.paid':
        const invoice = event.data.object;
        console.log('Processing invoice.paid event:', invoice.id);

        // Update subscription status if needed
        if (invoice.subscription) {
          const { data, error } = await supabase
            .from('api_users')
            .update({ status: 'active' })
            .eq('subscription_id', invoice.subscription);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        console.log('Processing invoice.payment_failed event:', failedInvoice.id);

        // Handle failed payment
        if (failedInvoice.customer_email && failedInvoice.subscription) {
          // Update user status
          const { data, error } = await supabase
            .from('api_users')
            .update({ status: 'payment_failed' })
            .eq('subscription_id', failedInvoice.subscription);

          if (error) {
            console.error('Error updating subscription status for failed payment:', error);
          } else {
            // Send payment failed email
            await sendPaymentFailedEmail(failedInvoice.customer_email);
          }
        }
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        console.log('Processing customer.subscription.updated event:', updatedSubscription.id);

        // Update subscription status in our database
        if (updatedSubscription.id) {
          const { data, error } = await supabase
            .from('api_users')
            .update({
              status: updatedSubscription.status,
              updated_at: new Date()
            })
            .eq('subscription_id', updatedSubscription.id);

          if (error) {
            console.error('Error updating subscription status:', error);
          }
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log('Processing customer.subscription.deleted event:', deletedSubscription.id);

        // Update user's subscription status to canceled
        if (deletedSubscription.id) {
          const { data, error } = await supabase
            .from('api_users')
            .update({
              status: 'canceled',
              updated_at: new Date()
            })
            .eq('subscription_id', deletedSubscription.id);

          if (error) {
            console.error('Error updating subscription status to canceled:', error);
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event: ${error.message}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

// Helper function to map Stripe price ID to our plan ID
function getPlanFromPriceId(priceId) {
  for (const [planId, plan] of Object.entries(subscriptionPlans)) {
    if (plan.priceId === priceId) {
      return planId;
    }
  }
  // Check if this is a Price ID from the Pricing Table
  // This is important because the Pricing Table might use different price IDs
  // than what we have in our subscriptionPlans object
  if (priceId.startsWith('price_')) {
    // For paid plans
    if (priceId === process.env.STRIPE_PRICE_CORE || priceId === process.env.STRIPE_PRICE_CORE_YEARLY) {
      return priceId.includes('yearly') ? 'core-yearly' : 'core';
    } else if (priceId === process.env.STRIPE_PRICE_ELITE || priceId === process.env.STRIPE_PRICE_ELITE_YEARLY) {
      return priceId.includes('yearly') ? 'elite-yearly' : 'elite';
    } else if (priceId === process.env.STRIPE_PRICE_ULTIMATE || priceId === process.env.STRIPE_PRICE_ULTIMATE_YEARLY) {
      return priceId.includes('yearly') ? 'ultimate-yearly' : 'ultimate';
    }
    // If price ID doesn't match any of our stored IDs, check the amount
    // This is useful if Stripe Pricing Table uses different price IDs
    try {
      // This would require an async function, so we handle it in the calling function
      // Just return the price ID for now
      return priceId;
    } catch (error) {
      console.error('Error fetching price details:', error);
    }
  }
  return null;
}

// Generate an API key
function generateApiKey() {
  return 'thrivefit_' + crypto.randomBytes(16).toString('hex');
}

// Send subscription welcome email with API key
async function sendSubscriptionEmail(email, apiKey, planId) {
  const plan = subscriptionPlans[planId];
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to Thrive X Fitness API - ${plan.name} Plan`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1ECBE1;">Thank You for Subscribing to Thrive X Fitness API!</h2>
          <p>Your ${plan.name} plan is now active.</p>
          <p><strong>Your API Key:</strong> ${apiKey}</p>
          <p>Please keep this key secure and use it for all API requests. Here's how to use it:</p>
          <ol>
            <li>Add the following header to all API requests:<br>
            <code>X-API-Key: ${apiKey}</code></li>
            <li>You can make up to ${plan.requestLimit} requests per month with your current plan.</li>
            <li>Visit our <a href="https://thrive-x-cotdc5nyc-nhtms3s-projects.vercel.app/fitness/docs">API documentation</a> for more details.</li>
          </ol>
          <p>If you have any questions, please reply to this email.</p>
          <p>Happy fitness programming!</p>
          <p>The Thrive X Team</p>
        </div>
      `
    });
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

// Send payment failed email notification
async function sendPaymentFailedEmail(email) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thrive X Fitness API - Payment Failed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E1341E;">Payment Failed Notice</h2>
          <p>We were unable to process your recent payment for the Thrive X Fitness API subscription.</p>
          <p>Please update your payment method in your Stripe account to avoid any interruption to your service.</p>
          <p>If you need assistance, please reply to this email.</p>
          <p>Thank you,<br>The Thrive X Team</p>
        </div>
      `
    });
    console.log(`Payment failed email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending payment failed email:', error);
    return false;
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/fitness/docs`);
});
