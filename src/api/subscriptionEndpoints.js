import express from 'express';
import Stripe from 'stripe';
import { supabase } from '../config/supabase.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Subscription tiers configuration
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    stripe_price_id: null
  },
  active: {
    name: 'Active',
    price: 9.99,
    stripe_price_id: 'price_xxx' // Your Stripe price ID
  },
  growth: {
    name: 'Growth',
    price: 19.99,
    stripe_price_id: 'price_yyy'
  },
  thrive: {
    name: 'Thrive',
    price: 29.99,
    stripe_price_id: 'price_zzz'
  }
};

// Create subscription
router.post('/subscription', async (req, res) => {
  try {
    const { userId, tier, paymentMethodId } = req.body;

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    let stripeCustomerId = user.stripe_customer_id;

    // Create or get Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: SUBSCRIPTION_TIERS[tier].stripe_price_id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    // Update user subscription in Supabase
    await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status
      })
      .eq('id', userId);

    res.json({
      success: true,
      subscription: subscription,
      client_secret: subscription.latest_invoice.payment_intent.client_secret
    });

  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook to handle Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;
  }

  res.json({received: true});
});

// Verify payment for reviews
router.post('/verify-payment', async (req, res) => {
  try {
    const { userId } = req.body;

    // Get user's subscription and payment status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_status, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Check if user has valid payment method
    const customer = await stripe.customers.retrieve(user.stripe_customer_id, {
      expand: ['sources']
    });

    const hasValidPayment = customer.sources.data.length > 0 || user.subscription_status === 'active';

    if (hasValidPayment) {
      // Update user verification status
      await supabase
        .from('user_verification')
        .upsert({
          user_id: userId,
          payment_method_verified: true,
          verification_status: 'verified',
          verification_method: 'stripe'
        });
    }

    res.json({
      success: true,
      verified: hasValidPayment
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function handleSubscriptionUpdate(subscription) {
  // Update user subscription status in Supabase
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_end_date: new Date(subscription.current_period_end * 1000)
      })
      .eq('id', user.id);
  }
}

async function handleSuccessfulPayment(paymentIntent) {
  // Handle successful payment logic
}

export default router;