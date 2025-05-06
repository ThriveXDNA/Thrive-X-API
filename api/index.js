// api/index.js - Main serverless entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const router = require('../src/routes/router');

// Initialize Express app
const app = express();

// Singleton Supabase client for connection reuse
let supabaseClient = null;
const getSupabaseClient = () => {
  if (!supabaseClient) {
    console.log('Creating new Supabase client');
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
  }
  return supabaseClient;
};

// Add the client to the global scope for reuse across functions
global.supabase = getSupabaseClient();

// Configure middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

app.use(cookieParser());

// Parse JSON request bodies (except for webhook routes which need raw bodies)
app.use((req, res, next) => {
  if (req.path === '/fitness/api/webhook' || req.path === '/fitness/api/stripe-webhook') {
    return next();
  }
  express.json()(req, res, next);
});

// Parse URL-encoded bodies (except for webhook routes)
app.use((req, res, next) => {
  if (req.path === '/fitness/api/webhook' || req.path === '/fitness/api/stripe-webhook') {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Mount the router with prefix
app.use('/fitness', router);
// Also mount at root for backward compatibility 
app.use('/', router);

// Export the serverless handler
module.exports = app;
