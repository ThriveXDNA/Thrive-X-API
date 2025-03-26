import express from 'express';
import CarnivoreAnalysis from '../utils/carnivoreAnalysis.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();
const analyzer = new CarnivoreAnalysis();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// 1. Food Analysis Endpoint
router.get('/food/analyze', async (req, res) => {
  try {
    const { food, userId } = req.query;
    console.log('Analyzing food:', food);
    
    // Get user's subscription tier
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const analysis = analyzer.analyzeFood(food);
    
    // Filter response based on subscription tier
    if (user?.subscription_tier === 'free') {
      // Basic analysis for free tier
      return res.json({
        success: true,
        data: {
          recommendation: analysis.recommendation,
          score: analysis.score,
          basic_nutrients: analysis.nutrients?.slice(0, 2)
        }
      });
    }

    // Full analysis for paid tiers
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Daily Recommendations
router.get('/recommendations/daily', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const recommendation = analyzer.getDailyRecommendation();

    // Filter based on subscription tier
    if (user?.subscription_tier === 'free') {
      return res.json({
        success: true,
        data: {
          main_protein: recommendation.diet.main,
          basic_tip: recommendation.lifestyle
        }
      });
    }

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Toxin Information
router.get('/toxins/tip', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    // Only paid tiers get toxin information
    if (user?.subscription_tier === 'free') {
      return res.json({
        success: true,
        message: "Upgrade to access toxin avoidance tips"
      });
    }

    const tip = analyzer.getToxinAvoidanceTip();
    res.json({
      success: true,
      data: tip
    });
  } catch (error) {
    console.error('Toxin tip error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Implementation Phases
router.get('/implementation/:phase', async (req, res) => {
  try {
    const { phase } = req.params;
    const { userId } = req.query;
    
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const advice = analyzer.getImplementationAdvice(phase);

    if (user?.subscription_tier === 'free') {
      return res.json({
        success: true,
        data: {
          duration: advice.duration,
          basic_goals: advice.goals[0]
        }
      });
    }

    res.json({
      success: true,
      data: advice
    });
  } catch (error) {
    console.error('Implementation advice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Lifestyle Tips
router.get('/lifestyle/tip', async (req, res) => {
  try {
    const tip = analyzer.getLifestyleTip();
    res.json({
      success: true,
      data: tip
    });
  } catch (error) {
    console.error('Lifestyle tip error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;