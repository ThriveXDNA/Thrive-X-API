// src/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from '@supabase/supabase-js';
import router from './routes/router.js';
import reviewRouter from './routes/reviews.js';
import createFitnessRoutes from './routes/fitnessRoutes.js';
import { adminAuth } from './middleware/adminAuth.js';
import { analyzeFoodPlate } from './api/fitness/foodPlateController.js';
import multer from 'multer';
import OpenAI from 'openai';
import fuzzy from 'fuzzy';
import fetch from 'node-fetch';
import Stripe from 'stripe';

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('https://') || !supabaseKey || supabaseKey.length < 20) {
    console.error('Error: Valid SUPABASE_URL (starting with "https://") and SUPABASE_KEY (minimum 20 chars) must be set in the .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Redis setup
const redisClient = new Redis();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Open AI setup - kept only for food analyze functionality
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY must be set in the .env file');
    process.exit(1);
}

// Check for Anthropic API key - this is now required
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
    console.error('Error: ANTHROPIC_API_KEY must be set in the .env file. Most features will not work.');
    process.exit(1);
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Warning: STRIPE_SECRET_KEY not set in the .env file. Stripe subscription features will not work correctly.');
}

// Define subscription plans configuration
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

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));

// IMPORTANT: The webhook route needs raw body parser
// This needs to be defined before any routes that use json body parser
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_XXXXXXXXXXXX' // Fallback for testing
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle specific events
  switch (event.type) {
    case 'customer.subscription.created':
      // Handle new subscription
      console.log('New subscription created:', event.data.object.id);
      break;
    case 'customer.subscription.updated':
      // Handle subscription update
      console.log('Subscription updated:', event.data.object.id);
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      console.log('Subscription cancelled:', event.data.object.id);
      break;
    case 'invoice.payment_succeeded':
      // Handle successful payment
      console.log('Payment succeeded for invoice:', event.data.object.id);
      break;
    case 'invoice.payment_failed':
      // Handle failed payment
      console.log('Payment failed for invoice:', event.data.object.id);
      break;
  }
  
  res.json({received: true});
});

// Setup regular middleware AFTER the webhook middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up Handlebars view engine
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts')
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting for API routes
const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1000, // Increased for development
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rate-limit:'
    }),
    skip: (req) => {
        return req.path.startsWith('/admin') || 
               req.path === '/admin-login' || 
               req.path === '/';
    },
    message: (req) => ({
        error: "Rate limit exceeded",
        tier_info: {
            current_tier: "free",
            limit: 1000,
            current_count: req.rateLimit.current,
            window_size: "86400 seconds (24 hours)",
            reset_after: Math.max(0, req.rateLimit.resetTime - Date.now()) / 1000
        },
        upgrade_options: {
            next_tier: "active",
            benefits: ["20 requests/day", "Meal planning", "Basic nutrition insights"]
        }
    })
});

// Pass supabase to fitnessRoutes
const fitnessRoutes = createFitnessRoutes(supabase);

// Routes
app.get('/', (req, res) => res.render('home'));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('/fitness', (req, res) => res.sendFile(path.join(__dirname, 'public', 'fitness', 'index.html')));
app.get('/fitness/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'fitness', 'docs.html')));
app.get('/fitness/api-interface', (req, res) => res.sendFile(path.join(__dirname, 'public', 'fitness', 'api-interface.html')));

// Subscription Routes
app.get('/fitness/subscribe', (req, res) => {
  const { plan, email } = req.query;
  
  if (!plan || !subscriptionPlans[plan] || !email) {
    return res.redirect('/fitness/api-interface'); // Redirect to API interface if plan or email is invalid
  }
  
  // For free plan, register the user with email verification
  if (plan === 'essential') {
    const apiKey = generateApiKey();
    storeCustomerApiKey(null, apiKey, plan, email)
      .then(() => {
        res.render('subscribe-success', { 
          plan: subscriptionPlans[plan],
          apiKey,
          emailMessage: 'Check your email to verify your account!'
        });
      })
      .catch((error) => {
        console.error('Error handling Essential plan:', error);
        res.redirect('/fitness/api-interface');
      });
  } else {
    // Render subscription page for paid plans
    res.render('subscribe', { 
      plan: subscriptionPlans[plan],
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_XXXXXXXXXXXX', // Fallback for testing
      email
    });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { planId, email } = req.body;
    
    if (!planId || !subscriptionPlans[planId] || planId === 'essential' || !email) {
      return res.status(400).json({ error: 'Invalid plan selected or email missing' });
    }
    
    const plan = subscriptionPlans[planId];
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email, // Pre-fill email in Stripe Checkout
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/fitness/subscribe-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
      cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/fitness/api-interface`
    });
    
    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/fitness/subscribe-success', async (req, res) => {
  try {
    const { session_id, email } = req.query;
    
    if (!session_id || !email) {
      return res.redirect('/fitness/api-interface');
    }
    
    // Retrieve the session to get customer details
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const customerId = session.customer;
    
    // Generate API key for the customer
    const apiKey = generateApiKey();
    
    // Store customer and API key mapping in your database with email verification
    await storeCustomerApiKey(customerId, apiKey, session.subscription ? getPlanIdFromSubscription(await stripe.subscriptions.retrieve(session.subscription)) : 'essential', email);
    
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const planId = getPlanIdFromSubscription(subscription);
    
    res.render('subscribe-success', {
      plan: subscriptionPlans[planId],
      apiKey,
      emailMessage: 'Check your email to verify your account!'
    });
  } catch (error) {
    console.error('Subscription retrieval error:', error);
    res.redirect('/fitness/api-interface');
  }
});

// API Key Validation Route (Added for email verification enforcement)
app.post('/api/auth/validate', async (req, res) => {
  const { apiKey } = req.body;
  try {
    const { data, error } = await supabase.from('api_keys')
      .select('plan, user_id')
      .eq('api_key', apiKey)
      .single();
    if (error || !data) throw new Error('Invalid API key');

    // Check if user has verified their email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id);
    if (userError || !userData.user.email_confirmed_at) {
      return res.status(403).json({ error: 'Email not verified. Please check your inbox.' });
    }

    const plan = subscriptionPlans[data.plan] || subscriptionPlans.essential;
    res.json({
      plan: data.plan,
      role: apiKey === process.env.ADMIN_API_KEY ? 'admin' : 'user',
      requestsRemaining: plan.requests
    });
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Admin routes
app.get('/admin-login', (req, res) => res.render('admin-login'));
app.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).single();
        if (!roles || roles.role !== 'admin') {
            await supabase.auth.signOut();
            return res.status(403).render('admin-login', { error: 'Not authorized' });
        }

        res.cookie('supabase_auth_token', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.redirect('/admin-dashboard');
    } catch (error) {
        res.status(401).render('admin-login', { error: error.message });
    }
});
app.get('/admin-dashboard', adminAuth, (req, res) => res.render('admin-dashboard', { user: req.user }));

// Helper function to make Anthropic API requests directly
async function callAnthropicAPI(prompt, endpoint) {
    console.log(`Processing ${endpoint} request with Anthropic API. Full prompt: ${prompt}`);
    
    let enhancedPrompt = `You are acting as a fitness and nutrition API. Respond in valid JSON format matching the endpoint requirements. For this ${endpoint} endpoint, provide appropriate data using the following prompt: ${prompt}
    
    IMPORTANT: Your ENTIRE response must be valid JSON. Do not include any explanatory text outside the JSON. Ensure all fields are complete and specific to the request.`;

    if (endpoint === 'naturalRemedies') {
        enhancedPrompt = `${prompt}
        
        Ensure the response strictly adheres to the specified approach and provides unique remedies tailored to it. For the "comprehensive" approach, include exactly 2-3 remedies, each from a different category (e.g., herbal, dietary, lifestyle, supplements), to ensure variety. Return JSON: {
            "symptom": string,
            "approach": string,
            "remedies": [{
                "name": string,
                "source": string,
                "ingredients": string | string[],
                "preparation": string | string[],
                "usage": string,
                "warnings"?: string | string[],
                "notes"?: string
            }]
        }`;
    } else if (endpoint === 'foodIngredientDirectory') {
        enhancedPrompt = `You are acting as a fitness and nutrition API. Respond with information about the food ingredient in this exact format:
        
        {
          "ingredients": [
            {
              "name": "Ingredient Name",
              "definition": "Scientific definition",
              "layman_term": "Simple explanation",
              "production_process": "How it's made",
              "example_use": "Example of food applications",
              "health_insights": {
                "general": "General health information",
                "precautions": "Who should avoid this ingredient",
                "sensitivities": "Potential sensitivities or allergies",
                "daily_limit": "Recommended daily limit",
                "quality": "High, Medium, or Low based on health quality"
              },
              "nutritional_profile": {
                "calories": "Caloric content",
                "protein": "Protein content",
                "fat": "Fat content",
                "carbs": "Carbohydrate content",
                "consumption_insight": "Typical consumption effects"
              },
              "commonly_found_in": ["Food 1", "Food 2", "Food 3"],
              "category": "Food category (e.g., Food Additive, Sweetener, etc.)",
              "origin": "Natural or synthetic origin"
            }
          ]
        }
        
        For this prompt: ${prompt}
        
        IMPORTANT: Your ENTIRE response must be valid JSON exactly as specified above. Do not include any explanatory text outside the JSON. Fill ALL fields with information - do not leave any field empty, undefined or with placeholder text.`;
    } else if (endpoint === 'generateWorkoutPlan') {
        enhancedPrompt = `You are acting as a fitness and nutrition API. ${prompt}
        
        IMPORTANT: Your ENTIRE response must be valid JSON. Do not include any explanatory text outside the JSON. Ensure all exercise details are specific and actionable with proper form cues and progression strategies.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            messages: [
                { role: 'user', content: enhancedPrompt }
            ]
        })
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("Error from Anthropic API:", data);
        throw new Error(data.error?.message || "Error from Anthropic API");
    }
    
    const claudeResponse = data.content && data.content[0] && data.content[0].text
        ? data.content[0].text
        : null;
        
    if (!claudeResponse) {
        throw new Error("Invalid response format from Anthropic API");
    }
    
    console.log("Full Claude response:", claudeResponse); // Log full response for debugging
    
    const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        return { 
            success: true, 
            data: parsedJson.data || parsedJson 
        };
    } else {
        throw new Error("No valid JSON found in Claude's response");
    }
}

// Updated Anthropic endpoint to match frontend expectations
app.post('/api/anthropic', limiter, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        console.log(`Received Anthropic request with prompt: ${prompt.substring(0, 100)}...`);

        // Determine the endpoint type from the prompt to apply specific formatting
        let endpointType;
        if (prompt.includes('Generate a detailed workout plan')) {
            endpointType = 'generateWorkoutPlan';
        } else if (prompt.includes('Provide detailed info for') && prompt.includes('exercise')) {
            endpointType = 'exerciseDetails';
        } else if (prompt.includes('Generate a') && prompt.includes('meal plan')) {
            endpointType = 'nutritionMealPlan';
        } else if (prompt.includes('Provide detailed info for') && prompt.includes('ingredient')) {
            endpointType = 'foodIngredientDirectory';
        } else if (prompt.includes('Provide specific natural remedies')) {
            endpointType = 'naturalRemedies';
        } else {
            endpointType = 'generic';
        }

        // Enhance the prompt for naturalRemedies with approach-specific logic
        let finalPrompt = prompt;
        if (endpointType === 'naturalRemedies') {
            const approachMatch = prompt.match(/using a (\w+) approach/);
            const symptomMatch = prompt.match(/for "([^"]+)"/);
            const approach = approachMatch ? approachMatch[1] : 'comprehensive';
            const symptom = symptomMatch ? symptomMatch[1] : 'unknown condition';

            let approachInstruction = '';
            switch (approach) {
                case 'comprehensive':
                    approachInstruction = 'Provide exactly 2-3 varied remedies, each from a different category: one herbal (e.g., teas or infusions), one dietary (e.g., whole foods or ancestral diet changes), and optionally one lifestyle (e.g., rest or hydration) or supplement (e.g., vitamins). Ensure diversity across categories and avoid generic or repetitive remedies.';
                    break;
                case 'dietary':
                    approachInstruction = 'Suggest only dietary changes based on ancestral or traditional eating patterns (e.g., avoiding processed foods, increasing alkaline foods). Exclude herbs, supplements, or lifestyle changes.';
                    break;
                case 'herbs':
                    approachInstruction = 'List only herbal remedies (e.g., teas, infusions) using traditional plant-based solutions. Exclude dietary advice, supplements, or lifestyle changes. Avoid generic remedies like honey unless explicitly herbal.';
                    break;
                case 'lifestyle':
                    approachInstruction = 'Provide only lifestyle and environmental changes (e.g., rest, hydration, steam inhalation) to address the condition. Exclude herbs, supplements, or dietary changes.';
                    break;
                case 'supplements':
                    approachInstruction = 'Recommend only nutritional supplements (e.g., vitamin C, zinc) to support healing. Exclude herbs, dietary changes, or lifestyle advice.';
                    break;
                case 'oneminute':
                    approachInstruction = 'Provide quick, simple remedies inspired by the "One Minute Cure" philosophy (e.g., hydrogen peroxide gargle if safe, or rapid natural protocols). Exclude complex or multi-step remedies.';
                    break;
                case 'sebi':
                    approachInstruction = 'Offer remedies strictly following Dr. Sebi\'s use of alkaline herbs (e.g., burdock root, sarsaparilla), spring water, and avoid acidic foods (e.g., garlic, lemon). Exclude non-alkaline or hybrid ingredients.';
                    break;
                default:
                    approachInstruction = 'Provide a general set of natural remedies from various traditional sources, avoiding overlap with specific methodologies unless specified.';
            }

            finalPrompt = `Provide specific natural remedies for "${symptom}" using a ${approach} approach. ${approachInstruction} Ensure remedies align strictly with the specified approach and differ from other approaches. Return JSON: {
                "symptom": string,
                "approach": string,
                "remedies": [{
                    "name": string,
                    "source": string,
                    "ingredients": string | string[],
                    "preparation": string | string[],
                    "usage": string,
                    "warnings"?: string | string[],
                    "notes"?: string
                }]
            } with detailed, actionable instructions. [Request ID: ${Math.random().toString(36).substring(2)}]`;
        }

        const data = await callAnthropicAPI(finalPrompt, endpointType);
        res.json(data);
    } catch (error) {
        console.error('Anthropic API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Other API routes
app.post('/api/fitness/analyzeFoodPlate', limiter, upload.single('food_image'), analyzeFoodPlate);
app.use('/api', limiter, router);
app.use('/api/reviews', limiter, reviewRouter);
app.use('/api/fitness', limiter, fitnessRoutes);

// Updated Food Ingredients endpoint to use Anthropic directly
app.post('/api/food-ingredients', limiter, async (req, res) => {
    try {
        const { ingredient } = req.body;
        if (!ingredient) {
            return res.status(400).json({ success: false, error: 'Ingredient is required' });
        }

        const commonIngredients = [
            'sugar', 'salt', 'flour', 'aspartame', 'citric acid', 'sucrose', 
            'fructose', 'glucose', 'lactose', 'msg', 'sodium', 'potassium', 
            'maltodextrin', 'xanthan gum', 'carrageenan', 'soy lecithin', 
            'ascorbic acid', 'calcium carbonate', 'titanium dioxide', 'modified corn starch',
            'high fructose corn syrup', 'artificial flavor', 'natural flavor'
        ];

        const fuzzyResults = fuzzy.filter(ingredient.toLowerCase(), commonIngredients, {
            pre: '<b>',
            post: '</b>',
            extract: (item) => item
        });
        
        const correctedIngredient = fuzzyResults.length > 0 && fuzzyResults[0].score > 50 
            ? fuzzyResults[0].original 
            : ingredient;

        const prompt = `Provide detailed information about the food ingredient "${correctedIngredient}".`;
        
        console.log(`Food Ingredient Prompt: ${prompt}`);
        
        try {
            const data = await callAnthropicAPI(prompt, 'foodIngredientDirectory');
            
            if (!data.data?.ingredients || data.data.ingredients.length === 0) {
                console.log('No ingredients found for:', correctedIngredient, 'Creating fallback response');
                
                const fallbackIngredient = {
                    name: correctedIngredient,
                    definition: `${correctedIngredient} is a food ingredient used in various food products.`,
                    layman_term: `${correctedIngredient} is commonly used to enhance flavor, texture, or shelf life in foods.`,
                    production_process: "The production process varies depending on the specific type and grade of this ingredient.",
                    example_use: "Used in various processed and packaged foods as well as some home cooking applications.",
                    health_insights: {
                        general: "Limited health information is available for this ingredient.",
                        precautions: "Those with specific dietary restrictions or allergies should consult product labels.",
                        sensitivities: "Some individuals may experience sensitivity reactions.",
                        daily_limit: "Consume in moderation as part of a balanced diet.",
                        quality: "Medium"
                    },
                    nutritional_profile: {
                        calories: "Varies by specific form",
                        protein: "Typically minimal",
                        fat: "Typically minimal",
                        carbs: "Varies by specific form",
                        consumption_insight: "Typically consumed in small amounts as part of processed foods."
                    },
                    commonly_found_in: ["Processed foods", "Packaged products", "Commercial food items"],
                    category: "Food Additive",
                    origin: "Origin Not Specified"
                };
                
                const responseData = {
                    success: true,
                    data: {
                        ingredients: [fallbackIngredient]
                    }
                };
                
                if (correctedIngredient !== ingredient) {
                    responseData.data.fuzzyMatch = {
                        original: ingredient,
                        corrected: correctedIngredient,
                        message: `Did you mean "${correctedIngredient}"? Showing generalized results.`
                    };
                }
                
                return res.json(responseData);
            }

            data.data.ingredients = data.data.ingredients.slice(0, 1);

            if (correctedIngredient !== ingredient) {
                data.data.fuzzyMatch = {
                    original: ingredient,
                    corrected: correctedIngredient,
                    message: `Did you mean "${correctedIngredient}"? Showing results for the corrected term.`
                };
            }

            res.json(data);
        } catch (error) {
            console.error('Error with Anthropic API:', error);
            
            const fallbackResponse = {
                success: true,
                data: {
                    ingredients: [{
                        name: req.body.ingredient || "Unknown ingredient",
                        definition: "A food ingredient or additive used in various food products.",
                        layman_term: "A substance added to food products for various purposes like flavor, preservation, or texture.",
                        production_process: "Production methods vary depending on the specific ingredient.",
                        example_use: "Used in various food products depending on its properties.",
                        health_insights: {
                            general: "Limited health information is available for this ingredient.",
                            precautions: "Those with specific dietary restrictions or allergies should consult product labels.",
                            sensitivities: "Some individuals may experience sensitivity reactions.",
                            daily_limit: "Consume in moderation as part of a balanced diet.",
                            quality: "Medium"
                        },
                        nutritional_profile: {
                            calories: "Varies by specific form",
                            protein: "Typically minimal",
                            fat: "Typically minimal",
                            carbs: "Varies by specific form",
                            consumption_insight: "Typically consumed in small amounts as part of processed foods."
                        },
                        commonly_found_in: ["Processed foods", "Packaged products", "Commercial food items"],
                        category: "Food Additive",
                        origin: "Origin Not Specified"
                    }]
                }
            };
            
            if (correctedIngredient !== ingredient) {
                fallbackResponse.data.fuzzyMatch = {
                    original: ingredient,
                    corrected: correctedIngredient,
                    message: `Did you mean "${correctedIngredient}"? Showing generalized results.`
                };
            }
            
            res.json(fallbackResponse);
        }
    } catch (error) {
        console.error('Food Ingredients Error:', error);
        
        const fallbackResponse = {
            success: true,
            data: {
                ingredients: [{
                    name: req.body.ingredient || "Unknown ingredient",
                    definition: "A food ingredient or additive used in various food products.",
                    layman_term: "A substance added to food products for various purposes like flavor, preservation, or texture.",
                    production_process: "Production methods vary depending on the specific ingredient.",
                    example_use: "Used in various food products depending on its properties.",
                    health_insights: {
                        general: "Limited health information is available for this ingredient.",
                        precautions: "Those with specific dietary restrictions or allergies should consult product labels.",
                        sensitivities: "Some individuals may experience sensitivity reactions.",
                        daily_limit: "Consume in moderation as part of a balanced diet.",
                        quality: "Medium"
                    },
                    nutritional_profile: {
                        calories: "Varies by specific form",
                        protein: "Typically minimal",
                        fat: "Typically minimal",
                        carbs: "Varies by specific form",
                        consumption_insight: "Typically consumed in small amounts as part of processed foods."
                    },
                    commonly_found_in: ["Processed foods", "Packaged products", "Commercial food items"],
                    category: "Food Additive",
                    origin: "Origin Not Specified"
                }]
            }
        };
        
        res.json(fallbackResponse);
    }
});

// Updated Natural Remedies endpoint to use Anthropic directly
app.post('/api/natural-remedies', limiter, async (req, res) => {
    try {
        const { symptom, approach = 'comprehensive', contextInfo = '' } = req.body;
        if (!symptom) {
            return res.status(400).json({ success: false, error: 'Symptom is required' });
        }

        console.log(`Processing natural remedy request for: ${symptom}, approach: ${approach}`);

        let approachModifier = '';
        switch (approach) {
            case 'dietary':
                approachModifier = 'Focus primarily on dietary changes following Paul Saladino\'s ancestral/carnivore approach';
                break;
            case 'herbs':
                approachModifier = 'Focus primarily on herbal and traditional medicine approaches';
                break;
            case 'lifestyle':
                approachModifier = 'Focus primarily on lifestyle and environmental changes';
                break;
            case 'supplements':
                approachModifier = 'Focus primarily on nutritional supplements and vitamins';
                break;
            case 'oneminute':
                approachModifier = 'Focus primarily on the One Minute Cure approach using food-grade hydrogen peroxide';
                break;
            case 'sebi':
                approachModifier = 'Focus primarily on Dr. Sebi\'s alkaline electric diet and herbal compounds';
                break;
            case 'comprehensive':
            default:
                approachModifier = 'Provide a comprehensive approach including dietary, herbal, lifestyle, and supplement options';
        }

        const prompt = `Generate natural healing approaches for the symptom "${symptom}". ${approachModifier}. ${contextInfo} Provide suggested remedies based on traditional wisdom and holistic perspectives, not medical advice. Include Paul Saladino's dietary framework, focusing on animal-based foods for healing. Ensure all response fields are complete with no undefined values.`;
        
        try {
            const responseData = await callAnthropicAPI(prompt, 'naturalRemedies');

            const defaultData = {
                symptom: symptom,
                approach: approach,
                dietary_approach: {
                    overview: "An ancestral diet focuses on whole, unprocessed animal foods as the foundation of healing.",
                    recommendations: ["Prioritize animal-based foods", "Eliminate plant toxins and antinutrients", "Focus on nutrient density"],
                    foods_to_eat: ["Grass-fed meat", "Organ meats", "Animal fats", "Wild-caught seafood", "Eggs", "Raw dairy (if tolerated)"],
                    foods_to_avoid: ["Seed oils", "Grains", "Legumes", "Processed foods", "Sugar", "Industrial seed oils"]
                },
                remedies: [
                    {
                        name: "Traditional Herbal Remedy",
                        source: "Folk Medicine",
                        efficacy_rating: 3.5,
                        research_level: "Traditional",
                        ingredients: [
                            {
                                name: "Healing herbs",
                                amount: "As directed",
                                substitutes: []
                            }
                        ],
                        preparation: ["Follow traditional preparation methods"],
                        usage: "Use as directed by a healthcare professional",
                        warnings: ["Consult with a healthcare provider before use"],
                        notes: "This is a traditional suggestion, not a guaranteed cure. Effects may vary."
                    }
                ],
                lifestyle_changes: [
                    "Prioritize quality sleep (7-9 hours in a dark room)",
                    "Regular sun exposure for vitamin D and circadian rhythm regulation",
                    "Reduce exposure to environmental toxins",
                    "Regular movement throughout the day",
                    "Stress management through meditation or breathwork"
                ]
            };

            if (approach === 'oneminute') {
                defaultData.oneminute_cure = {
                    overview: "The One Minute Cure approach centers on using food-grade hydrogen peroxide to increase oxygen levels in the body. The theory suggests that disease cannot thrive in an oxygen-rich environment.",
                    protocol: [
                        "Begin with 3 drops of 35% food-grade hydrogen peroxide (diluted in 8oz of water) three times daily",
                        "Gradually increase dosage by 1 drop per day until reaching 25 drops three times daily",
                        "After 3 weeks at maximum dosage, gradually decrease back to maintenance level of 3 drops three times daily"
                    ],
                    cautions: [
                        "Only use food-grade hydrogen peroxide (35%), never standard drugstore hydrogen peroxide",
                        "Always dilute properly with distilled water",
                        "Start with very low doses to monitor tolerance",
                        "May cause temporary detoxification symptoms",
                        "Consult a healthcare professional before beginning any protocol"
                    ]
                };
            }
            
            if (approach === 'sebi') {
                defaultData.sebi_approach = {
                    overview: "Dr. Sebi's methodology is based on the belief that disease is caused by mucus build-up in the body due to consuming acidic foods. His electric alkaline diet aims to restore the body's natural alkaline state.",
                    foods: [
                        "Sea vegetables (dulse, kelp, wakame)",
                        "Alkaline fruits (apples, bananas, dates, figs, grapes)",
                        "Alkaline vegetables (amaranth greens, avocado, cucumber, okra)",
                        "Alkaline grains (spelt, quinoa, rye)",
                        "Spring water"
                    ],
                    herbs: [
                        "Burdock Root - for blood purification",
                        "Yellow Dock - for cleansing the blood",
                        "Bladderwrack - rich in iodine for thyroid health",
                        "Blue Vervain - for nervous system support",
                        "Elderberry - for immune support"
                    ]
                };
            }

            if (approach === 'supplements' || approach === 'comprehensive') {
                defaultData.supplements = [
                    "Vitamin D3 (5,000-10,000 IU daily) - supports immune function",
                    "Vitamin K2 (100-200 mcg daily) - works synergistically with vitamin D",
                    "Magnesium (300-600 mg daily) - involved in over 300 enzymatic reactions",
                    "Zinc (30-50 mg daily) - supports immune function and hormone production",
                    "Omega-3 fatty acids (1-3g daily) - reduces inflammation"
                ];
            }

            let data = { success: true, data: defaultData };
            
            if (responseData.data && typeof responseData.data === 'object') {
                data.data = {
                    ...defaultData,
                    ...responseData.data,
                    approach: approach,
                    symptom: responseData.data.symptom || symptom
                };

                if (responseData.data.dietary_approach) {
                    data.data.dietary_approach = {
                        ...defaultData.dietary_approach,
                        ...responseData.data.dietary_approach
                    };
                }

                if (responseData.data.remedies && Array.isArray(responseData.data.remedies) && responseData.data.remedies.length > 0) {
                    data.data.remedies = responseData.data.remedies.map(remedy => {
                        const defaultRemedy = defaultData.remedies[0];
                        return {
                            name: remedy.name || defaultRemedy.name,
                            source: remedy.source || defaultRemedy.source,
                            efficacy_rating: remedy.efficacy_rating || defaultRemedy.efficacy_rating,
                            research_level: remedy.research_level || defaultRemedy.research_level,
                            ingredients: (remedy.ingredients && Array.isArray(remedy.ingredients)) ? 
                                remedy.ingredients.map(ing => ({
                                    name: ing.name || "Ingredient",
                                    amount: ing.amount || "As needed",
                                    substitutes: (ing.substitutes && Array.isArray(ing.substitutes)) ? ing.substitutes : []
                                })) : 
                                defaultRemedy.ingredients,
                            preparation: (remedy.preparation && Array.isArray(remedy.preparation)) ? 
                                remedy.preparation : 
                                defaultRemedy.preparation,
                            usage: remedy.usage || defaultRemedy.usage,
                            warnings: (remedy.warnings && Array.isArray(remedy.warnings)) ? 
                                remedy.warnings : 
                                defaultRemedy.warnings,
                            notes: remedy.notes || defaultRemedy.notes
                        };
                    });
                }
            }

            console.log(`Successfully processed remedy data for: ${symptom}`);
            res.json(data);
        } catch (error) {
            console.error('Error calling Anthropic API:', error);
            throw error;
        }
    } catch (error) {
        console.error('Natural Remedies Error:', error);
        const defaultResponse = {
            success: true,
            data: {
                symptom: req.body.symptom || "Unknown condition",
                approach: req.body.approach || "comprehensive",
                dietary_approach: {
                    overview: "An ancestral diet focuses on whole, unprocessed animal foods as the foundation of healing.",
                    recommendations: ["Prioritize animal-based foods", "Eliminate processed foods", "Focus on nutrient density"],
                    foods_to_eat: ["Grass-fed meat", "Organ meats", "Animal fats", "Seafood", "Eggs"],
                    foods_to_avoid: ["Seed oils", "Grains", "Processed foods", "Sugar"]
                },
                remedies: [
                    {
                        name: "Basic Healing Protocol",
                        source: "Traditional Medicine",
                        efficacy_rating: 3.0,
                        research_level: "Traditional",
                        ingredients: [{ name: "Natural healing foods", amount: "Daily", substitutes: [] }],
                        preparation: ["Follow a nutrient-dense diet", "Prioritize sleep and stress management"],
                        usage: "Follow consistently for best results",
                        warnings: ["Consult with a healthcare provider for serious conditions"],
                        notes: "This is a general approach that may support overall health."
                    }
                ],
                lifestyle_changes: [
                    "Prioritize quality sleep (7-9 hours in a dark room)",
                    "Regular sun exposure for vitamin D",
                    "Daily movement and exercise",
                    "Stress management"
                ]
            }
        };
        
        if (req.body.approach === 'oneminute') {
            defaultResponse.data.oneminute_cure = {
                overview: "The One Minute Cure approach centers on using food-grade hydrogen peroxide to increase oxygen in the body.",
                protocol: ["Always follow proper dilution guidelines", "Start with minimal doses", "Increase gradually"],
                cautions: ["Only use food-grade hydrogen peroxide", "Always dilute properly", "Consult a healthcare professional"]
            };
        } else if (req.body.approach === 'sebi') {
            defaultResponse.data.sebi_approach = {
                overview: "Dr. Sebi's methodology is based on alkaline foods to cleanse and restore the body.",
                foods: ["Alkaline fruits and vegetables", "Sea vegetables", "Spring water"],
                herbs: ["Burdock Root", "Yellow Dock", "Elderberry"]
            };
        }
        
        console.log('Returning fallback remedy response due to error');
        res.json(defaultResponse);
    }
});

// Update Dish Analysis endpoint to use Anthropic directly
app.post('/api/dish-analysis', limiter, async (req, res) => {
    try {
        const { dish } = req.body;
        if (!dish) {
            return res.status(400).json({ success: false, error: 'Dish name is required' });
        }

        const prompt = `Provide a nutritional breakdown and health quality analysis for the dish "${dish}" (e.g., "Berry Pancake Stack"). Use provided data if included, otherwise estimate based on typical recipes.`;
        
        try {
            const data = await callAnthropicAPI(prompt, 'dishAnalysis');
            res.json(data);
        } catch (error) {
            console.error('Error calling Anthropic API:', error);
            throw error;
        }
    } catch (error) {
        console.error('Dish Analysis Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add enhanced workout plan endpoint
app.post('/api/workout-plan', limiter, async (req, res) => {
    try {
        const {
            goal,
            fitnessLevel,
            preferences = [],
            daysPerWeek,
            sessionDuration,
            planDurationWeeks,
            bodyFocus = 'full_body',
            muscleGroups = [],
            includeWarmupCooldown = 'true'
        } = req.body;

        if (!goal || !fitnessLevel || !daysPerWeek || !sessionDuration || !planDurationWeeks) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const prompt = `Generate a detailed workout plan for a ${fitnessLevel} with goal ${goal}, 
            preferring ${preferences.length > 0 ? preferences.join(', ') : 'any'} exercises, 
            ${daysPerWeek} days/week, ${sessionDuration} min sessions, 
            over ${planDurationWeeks} weeks. 
            Body focus ${bodyFocus}, muscle groups [${muscleGroups.join(', ')}], 
            include warm-up & cool-down ${includeWarmupCooldown}.
            
            Generate a comprehensive, scientifically-sound workout plan tailored to the user's fitness level (${bodyFocus === 'full_body' ? 'full body approach' : bodyFocus === 'upper_body' ? 'focusing on upper body' : 'focusing on lower body'}${muscleGroups.length > 0 ? `, with special emphasis on: ${muscleGroups.join(', ')}` : ''}).

            Adjust rep ranges based on the specified goal:
            - For strength: 4-6 reps with heavier weights, longer rest (2-3 minutes)
            - For muscle gain: 8-12 reps with moderate weights, medium rest (60-90 seconds)
            - For endurance: 15-20 reps with lighter weights, shorter rest (30-45 seconds)
            - For weight loss: 10-15 reps with moderate weights, short rest periods (45-60 seconds)
            
            ${includeWarmupCooldown === 'true' ? `Include specific warm-up exercises (5-10 minutes) before each workout session, featuring:
            - Light cardio to enhance blood circulation
            - Dynamic stretches appropriate for the following exercises
            - Progressive activation of target muscle groups
            
            Also include cool-down routines (5-10 minutes) after each session with:
            - Static stretches for worked muscle groups
            - Gradual reduction in intensity
            - Breathing and recovery focus` : 'Exclude warm-up and cool-down details as per user preference.'}
            
            For each exercise provide:
            - Clear exercise name
            - Target rep range based on goal
            - Recommended sets
            - Rest period (seconds)
            - Form cues for proper execution
            - Progression strategy as user advances
            
            Structure the plan around these components:
            1. ${includeWarmupCooldown === 'true' ? 'Warm-up exercises specific to the day\'s workout' : 'Main workout exercises'}
            2. Strength training focus with appropriate exercises
            3. Optional cardio component based on goals
            4. ${includeWarmupCooldown === 'true' ? 'Cool-down and flexibility work' : 'Optional flexibility work if relevant'}
            
            Return JSON with {
                name: string, 
                goals: string, 
                fitnessLevel: string, 
                daysPerWeek: string, 
                planDurationWeeks: string, 
                bodyFocus: string,
                muscleGroups: [string],
                days: [
                {
                    name: string, 
                    sessionDuration: string, 
                    ${includeWarmupCooldown === 'true' ? 'warmup: [{name: string, duration: string, description: string}],' : ''}
                    exercises: [
                    {
                        name: string, 
                        muscleGroup: string,
                        sets: number, 
                        reps: string, 
                        restSeconds: number, 
                        formCues: string,
                        progression: string
                    }
                    ],
                    ${includeWarmupCooldown === 'true' ? 'cooldown: [{name: string, duration: string, description: string}]' : ''}
                }
                ]
            }`;

        try {
            const data = await callAnthropicAPI(prompt, 'generateWorkoutPlan');
            res.json(data);
        } catch (error) {
            console.error('Error calling Anthropic API for workout plan:', error);
            throw error;
        }
    } catch (error) {
        console.error('Workout Plan Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stripe helper functions
function generateApiKey() {
  // A simple function to generate a random API key
  return 'api_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function storeCustomerApiKey(customerId, apiKey, planId, email) {
  try {
    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: Math.random().toString(36).slice(-8) // Temporary password, user resets later
    });
    if (authError) throw authError;

    const userId = authData.user.id;

    // Store in users table
    const { error: userError } = await supabase.from('users').insert([
      { id: userId, email, stripe_customer_id: customerId }
    ]);
    if (userError) throw userError;

    // Store API key linked to user
    const { error } = await supabase.from('api_keys').insert([
      { customer_id: customerId, api_key: apiKey, plan: planId, user_id: userId, created_at: new Date().toISOString() }
    ]);
    if (error) throw error;

    return userId;
  } catch (error) {
    console.error('Error storing API key:', error);
    throw error;
  }
}

function getPlanIdFromSubscription(subscription) {
  try {
    // Extract the price ID from the subscription
    const priceId = subscription.items.data[0].price.id;
    
    // Find the plan that matches this price ID
    for (const [planId, plan] of Object.entries(subscriptionPlans)) {
      if (plan.priceId === priceId) {
        return planId;
      }
    }
    
    // Default to essential if no match found
    console.log('No matching plan found for priceId:', priceId);
    return 'essential';
  } catch (error) {
    console.error('Error getting plan ID from subscription:', error);
    return 'essential'; // Default to free plan on error
  }
}

// Error handling
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.url }));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;