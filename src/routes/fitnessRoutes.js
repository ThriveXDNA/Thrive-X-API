const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize Supabase and Stripe
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware to authenticate API key
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  console.log('Extracted API key:', apiKey);
  console.log('Querying Supabase for API key:', apiKey);

  const { data, error } = await supabase
    .from('users')
    .select('plan, role')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    console.error('Supabase error or no user found:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  console.log('Supabase response:', { data, error: 'none' });
  console.log('User authenticated:', data);
  req.user = data;
  next();
}

// Create checkout session
router.post('/create-checkout-session', authenticateApiKey, async (req, res) => {
  const { planId } = req.body;
  console.log('Reached /create-checkout-session route with planId:', planId);

  // Rate limit check (simplified)
  console.log('Rate limit check - Path: /create-checkout-session User:', req.user);

  // Map planId to Stripe Price IDs from .env
  const planPriceIds = {
    'core': process.env.STRIPE_PRICE_CORE,
    'elite': process.env.STRIPE_PRICE_ELITE,
    'ultimate': process.env.STRIPE_PRICE_ULTIMATE,
    'core-yearly': process.env.STRIPE_PRICE_CORE_YEARLY,
    'elite-yearly': process.env.STRIPE_PRICE_ELITE_YEARLY,
    'ultimate-yearly': process.env.STRIPE_PRICE_ULTIMATE_YEARLY
  };

  if (!planPriceIds[planId]) {
    return res.status(400).json({ error: 'Invalid planId' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: planPriceIds[planId],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: 'https://thrive-x-api.vercel.app/fitness/subscribe?success=true',
      cancel_url: 'https://thrive-x-api.vercel.app/fitness/subscribe?canceled=true',
      metadata: {
        user_api_key: req.headers['x-api-key'],
        plan: planId
      }
    });

    console.log('Checkout session created:', session.id);
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('Webhook event received:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const apiKey = session.metadata.user_api_key;
      const plan = session.metadata.plan;

      console.log('Checkout session completed for user:', apiKey, 'Plan:', plan);

      // Update user plan in Supabase
      const { error } = await supabase
        .from('users')
        .update({ plan })
        .eq('api_key', apiKey);

      if (error) {
        console.error('Error updating user plan in Supabase:', error);
      } else {
        console.log('User plan updated in Supabase:', { apiKey, plan });
      }
      break;
    case 'invoice.paid':
      console.log('Invoice paid:', event.data.object);
      break;
    case 'invoice.payment_failed':
      console.log('Invoice payment failed:', event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// API routes
router.post('/workout', authenticateApiKey, async (req, res) => {
  try {
    const {
      goals,
      fitnessLevel,
      preferences,
      bodyFocus,
      muscleGroups,
      includeWarmupCooldown,
      daysPerWeek,
      sessionDuration,
      planDurationWeeks
    } = req.body;

    // Validate inputs
    if (!goals || !fitnessLevel || !daysPerWeek || !planDurationWeeks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Your existing workout generation logic here
    // Example: Call AI service or database query
    const workoutPlan = {
      goal: goals,
      fitnessLevel,
      daysPerWeek,
      weeks: planDurationWeeks,
      days: [] // Populate with your logic
    };

    res.json({ data: workoutPlan });
  } catch (error) {
    console.error('Error generating workout plan:', error);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

router.post('/meal-plan', authenticateApiKey, async (req, res) => {
  try {
    const {
      goals,
      dietType,
      gender,
      age,
      weight,
      heightCm,
      activityLevel,
      allergies,
      religiousPreferences,
      calorieTarget,
      mealsPerDay,
      numberOfDays
    } = req.body;

    // Validate inputs
    if (!goals || !weight || !heightCm || !mealsPerDay || !numberOfDays) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Your existing meal plan generation logic here
    const mealPlan = {
      macros: { protein: 0, fat: 0, carbs: 0, calories: calorieTarget || 0 },
      mealPlan: [] // Populate with your logic
    };

    res.json({ data: mealPlan });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

router.post('/exercise', authenticateApiKey, async (req, res) => {
  try {
    const { exerciseId, includeVariations } = req.body;

    // Validate inputs
    if (!exerciseId) {
      return res.status(400).json({ error: 'Exercise ID required' });
    }

    // Your existing exercise details logic here
    const exerciseDetails = {
      name: 'Sample Exercise',
      muscle_groups: ['Sample'],
      equipment_needed: ['None'],
      steps: ['Step 1', 'Step 2'],
      difficulty: 'Beginner',
      tips: ['Tip 1'],
      variations: includeVariations ? [{ name: 'Variation', description: 'Desc', difficulty: 'Moderate' }] : []
    };

    res.json({ data: exerciseDetails });
  } catch (error) {
    console.error('Error fetching exercise details:', error);
    res.status(500).json({ error: 'Failed to fetch exercise details' });
  }
});

router.post('/food-plate', authenticateApiKey, async (req, res) => {
  try {
    // Handle multipart/form-data for image upload
    const formData = req.body; // Requires multer or similar for actual file handling

    // Your existing food plate analysis logic here
    const foodAnalysis = {
      title: 'Food Plate Analysis',
      foods: [{ name: 'Sample Food', calories: 100, protein: 10, fat: 5, carbs: 15 }]
    };

    res.json({ data: foodAnalysis });
  } catch (error) {
    console.error('Error analyzing food plate:', error);
    res.status(500).json({ error: 'Failed to analyze food plate' });
  }
});

router.post('/food-ingredient', authenticateApiKey, async (req, res) => {
  try {
    const { ingredient } = req.body;

    // Validate inputs
    if (!ingredient) {
      return res.status(400).json({ error: 'Ingredient name required' });
    }

    // Your existing food ingredient logic here
    const ingredientDetails = {
      name: ingredient,
      category: 'Sample',
      origin: 'Sample',
      safety_rating: 'Safe',
      definition: 'Sample definition',
      layman_term: 'Sample term',
      production_process: 'Sample process',
      example_use: 'Sample use'
    };

    res.json({ data: ingredientDetails });
  } catch (error) {
    console.error('Error fetching ingredient details:', error);
    res.status(500).json({ error: 'Failed to fetch ingredient details' });
  }
});

router.post('/natural-remedies', authenticateApiKey, async (req, res) => {
  try {
    const { symptom, approach } = req.body;

    // Validate inputs
    if (!symptom) {
      return res.status(400).json({ error: 'Symptom required' });
    }

    // Your existing natural remedies logic here
    const remedies = {
      remedies: [{
        name: 'Sample Remedy',
        description: 'Sample description',
        preparation: 'Sample preparation',
        benefits: 'Sample benefits'
      }],
      disclaimer: 'Consult a healthcare professional before use.'
    };

    res.json({ data: remedies });
  } catch (error) {
    console.error('Error fetching natural remedies:', error);
    res.status(500).json({ error: 'Failed to fetch natural remedies' });
  }
});

module.exports = router;