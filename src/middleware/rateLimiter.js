import Redis from 'ioredis';
import { supabase } from '../config/supabase.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379'); // Default for local dev

// Window sizes in seconds (24 hours for all tiers)
const WINDOW_SIZE_IN_SECONDS = {
  free: 86400, // 24 hours
  active: 86400,
  growth: 86400,
  thrive: 86400
};

// Rate limits aligned with checkSubscriptionTier.js daily requests
const RATE_LIMIT_BY_TIER = {
  free: 5,     // Matches 5/day from checkSubscriptionTier.js
  active: 20,  // Matches 20/day
  growth: 600, // Matches 600/day
  thrive: -1   // Unlimited (-1 in checkSubscriptionTier.js)
};

export async function rateLimiter(req, res, next) {
  try {
    // Use userId from checkSubscriptionTier.js if available, fallback to IP
    const userId = req.headers['user-id'] || req.query.userId || (req.body && req.body.userId);
    const ip = req.ip;
    const key = userId || ip; // Unique key for rate limiting

    // Skip rate limiting if no user ID or unlimited tier (checked via req.tierLimits)
    if (!key || req.tierLimits?.requestsPerDay === -1 || req.userTier === 'thrive') {
      res.setHeader('X-RateLimit-Exempt', 'true');
      return next();
    }

    // Get tier from req.userTier (set by checkSubscriptionTier.js) or default to 'free'
    const tier = req.userTier || 'free';
    const maxRequests = RATE_LIMIT_BY_TIER[tier];
    const windowSize = WINDOW_SIZE_IN_SECONDS[tier];

    // Use Redis for sliding window rate limiting
    const now = Date.now();
    const windowStart = now - (windowSize * 1000);

    const multi = redis.multi();
    multi.zadd(`requests:${key}`, now, now.toString()); // Store timestamp
    multi.zremrangebyscore(`requests:${key}`, '-inf', windowStart); // Remove old requests
    multi.zcard(`requests:${key}`); // Count current requests

    const [,, requestCount] = await multi.exec();
    const currentCount = requestCount[1]; // Number of requests in window

    if (currentCount > maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        tier_info: {
          current_tier: tier,
          limit: maxRequests,
          current_count: currentCount,
          window_size: `${windowSize} seconds (24 hours)`,
          reset_after: Math.ceil((windowStart + (windowSize * 1000) - now) / 1000)
        },
        upgrade_options: getUpgradeOptions(tier)
      });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
    res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + (windowSize * 1000)) / 1000));

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Allow request through on error to avoid blocking legitimate traffic
    next();
  }
}

function getUpgradeOptions(currentTier) {
  switch (currentTier) {
    case 'free':
      return { 
        next_tier: 'active', 
        benefits: ['20 requests/day', 'Meal planning', 'Basic nutrition insights']
      };
    case 'active':
      return { 
        next_tier: 'growth', 
        benefits: ['600 requests/day', 'Detailed nutrition', 'Health insights']
      };
    case 'growth':
      return { 
        next_tier: 'thrive', 
        benefits: ['Unlimited requests', 'Advanced analysis', 'Comprehensive insights']
      };
    default:
      return null;
  }
}