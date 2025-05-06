// api/workout.js - Serverless endpoint for workout plans
const express = require('express');
const cors = require('cors');
const { getSupabaseClient } = require('./utils/database');
const { handleAnthropicRequest } = require('../src/api/anthropic');

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// API key authentication middleware
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers['x-api-key'] || req.headers['X-Api-Key'];
  
  if (!apiKey) {
    console.error('No API key provided');
    return res.status(401).json({ error: 'API key required' });
  }

  console.log('Authenticating API key:', apiKey);

  try {
    const supabase = getSupabaseClient();
    // Query using the api_users table which is used in the webhook handler
    const { data, error } = await supabase
      .from('users')
      .select('plan, role, email, requestsRemaining')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      console.error('Supabase error or no user found:', error);
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Assume email verification is true if email exists
    if (data && data.email) {
      data.email_verified = true; // Add this property for compatibility
    }

    console.log('User authenticated:', data);
    
    req.user = data;
    next();
  } catch (err) {
    console.error('Error in authenticateApiKey middleware:', err.message);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
}

// Workout plan endpoint
app.post('/api/workout', authenticateApiKey, async (req, res) => {
  console.log('Inside workout endpoint, Body:', req.body, 'User:', req.user);
  try {
    const {
      fitnessLevel,
      goals,
      preferences,
      bodyFocus,
      muscleGroups,
      includeWarmupCooldown,
      daysPerWeek,
      sessionDuration,
      planDurationWeeks
    } = req.body;

    if (!fitnessLevel || !goals || !daysPerWeek || !sessionDuration || !planDurationWeeks) {
      console.log('Missing required parameters');
      return res.status(400).json({ 
        error: 'Missing required parameters: fitnessLevel, goals, daysPerWeek, sessionDuration, planDurationWeeks' 
      });
    }

    const result = await handleAnthropicRequest('generateWorkoutPlan', {
      fitnessLevel,
      goals,
      preferences: preferences || [],
      bodyFocus,
      muscleGroups: muscleGroups || [],
      includeWarmupCooldown: includeWarmupCooldown === 'true',
      daysPerWeek: parseInt(daysPerWeek),
      sessionDuration: parseInt(sessionDuration),
      planDurationWeeks: parseInt(planDurationWeeks)
    });
    console.log('Anthropic result:', result);

    // Update request count in database
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('users')
        .update({ 
          requestsRemaining: Math.max(0, (req.user.requestsRemaining || 500) - 1)
        })
        .eq('api_key', req.headers['x-api-key'] || req.headers['X-API-Key']);
    } catch (dbError) {
      console.error('Error updating request count:', dbError);
      // Continue despite DB error to ensure user gets response
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error generating workout plan:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate workout plan', details: error.message });
  }
});

// Export the serverless handler
module.exports = app;
