import express from 'express';
import OpenAI from 'openai';
import CarnivoreAnalysis from '../utils/carnivoreAnalysis.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();
const analyzer = new CarnivoreAnalysis();

// OpenAI initialization with strict key validation
let openai;
try {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('fallback')) {
    throw new Error('Valid OpenAI API key not found');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('OpenAI initialized successfully');
} catch (error) {
  console.error('OpenAI initialization error:', error);
}

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    res.json({ 
      message: 'AI router is working',
      openaiStatus: openai ? 'initialized' : 'not initialized',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Test endpoint failed', 
      details: error.message 
    });
  }
});

// Updated analysis endpoint for food plate
router.post('/analyze', async (req, res) => {
  try {
    const { foods, userId } = req.body;

    if (!Array.isArray(foods) || foods.length === 0 || !userId) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        required: { 
          foods: 'Array of food names (e.g., ["Bacon", "Fried Eggs"])',
          userId: 'Valid user ID required'
        } 
      });
    }

    // Get user's subscription tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`Error fetching user subscription: ${userError?.message || 'User not found'}`);
    }

    // Analyze each food
    const baseAnalyses = foods.map(food => ({
      name: food,
      analysis: analyzer.analyzeFood(food)
    }));

    let aiAnalysis;

    if (user.subscription_tier === 'free') {
      // Basic analysis for free tier
      aiAnalysis = {
        result: {
          foods_identified: baseAnalyses.map(item => ({
            name: item.name,
            ...item.analysis
          })),
          meal_analysis: {
            balance_score: baseAnalyses.reduce((avg, item) => avg + (item.analysis.score || 0), 0) / baseAnalyses.length,
          }
        }
      };
    } else {
      // Full AI analysis for paid tiers
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a carnivore diet expert with deep knowledge of kosher practices.'
          },
          {
            role: 'user',
            content: `Analyze these foods for a kosher carnivore diet: ${JSON.stringify(baseAnalyses)}`
          }
        ]
      });

      aiAnalysis = {
        result: {
          ai_insights: completion.choices[0].message.content,
          foods_analyzed: baseAnalyses
        }
      };
    }

    res.json({
      success: true,
      subscription_tier: user.subscription_tier,
      base_analyses: baseAnalyses,
      ai_analysis: aiAnalysis
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      type: error.constructor.name 
    });
  }
});

export default router;