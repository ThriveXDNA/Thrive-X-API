import { supabase } from '../config/supabase.js';

// Tier limitations aligned with rateLimiter.js and aiAnalysis.js, with simplified structure
const tierLimits = {
  free: {
    searchResultsLimit: 5,
    features: ['basic_food_analysis'],
    requestsPerDay: 5,
    imageAnalysis: false,
    exerciseAccess: 'none',
    npiSearchLimit: 5,
    analysisDepth: 'basic'
  },
  active: {
    searchResultsLimit: 50,
    features: ['basic_food_analysis', 'meal_planning', 'basic_nutrition'],
    requestsPerDay: 20,
    imageAnalysis: true,
    exerciseAccess: 'basic',
    npiSearchLimit: 50,
    analysisDepth: 'detailed'
  },
  growth: {
    searchResultsLimit: 100,
    features: ['detailed_food_analysis', 'meal_planning', 'detailed_nutrition', 'health_insights'],
    requestsPerDay: 600,
    imageAnalysis: true,
    exerciseAccess: 'standard',
    npiSearchLimit: 500,
    analysisDepth: 'detailed'
  },
  thrive: {
    searchResultsLimit: -1,
    features: ['all', 'advanced_food_analysis', 'advanced_nutrition', 'advanced_insights'],
    requestsPerDay: -1,
    imageAnalysis: true,
    exerciseAccess: 'premium',
    npiSearchLimit: -1,
    analysisDepth: 'comprehensive'
  }
};

export async function checkSubscriptionTier(req, res, next) {
  try {
    const userId = req.headers['user-id'] || req.query.userId || (req.body && req.body.userId);

    if (!userId) {
      req.userTier = 'free';
      req.tierLimits = tierLimits.free;
      return next();
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_tier, requests_today, last_request_date')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.warn('User lookup failed:', error?.message || 'User not found');
      req.userTier = 'free';
      req.tierLimits = tierLimits.free;
      return next();
    }

    const today = new Date().toISOString().split('T')[0];
    const lastRequestDate = user.last_request_date?.split('T')[0];

    if (today !== lastRequestDate) {
      await supabase
        .from('users')
        .update({ requests_today: 0, last_request_date: new Date().toISOString() })
        .eq('id', userId);
      user.requests_today = 0;
    }

    const tier = user.subscription_tier || 'free';
    const limits = tierLimits[tier] || tierLimits.free;

    if (limits.requestsPerDay !== -1 && user.requests_today >= limits.requestsPerDay) {
      return res.status(429).json({
        error: 'Daily request limit exceeded',
        tier_info: {
          current_tier: tier,
          requests_per_day: limits.requestsPerDay,
          requests_used: user.requests_today,
          reset_date: new Date(new Date().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        upgrade_info: tier !== 'thrive' ? 'Upgrade your subscription for higher limits' : null
      });
    }

    await supabase
      .from('users')
      .update({ requests_today: user.requests_today + 1, last_request_date: new Date().toISOString() })
      .eq('id', userId);

    req.userTier = tier;
    req.tierLimits = limits;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    req.userTier = 'free';
    req.tierLimits = tierLimits.free;
    next();
  }
}