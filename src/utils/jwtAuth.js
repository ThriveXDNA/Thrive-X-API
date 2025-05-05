/**
 * JWT Authentication utility for mobile clients
 * Provides JWT token generation and verification
 */

const jwt = require('jsonwebtoken');

// Default secret key - should be overridden by environment variable
const DEFAULT_SECRET = 'thrive-x-fitness-api-jwt-secret-key';

/**
 * Generates a JWT token for a user
 * @param {Object} user - The user object containing id, email, plan, and role
 * @param {string} secret - Secret key for signing the token (defaults to environment variable)
 * @param {Object} options - Additional options for token generation
 * @returns {string} - The generated JWT token
 */
function generateToken(user, secret = null, options = {}) {
  // Use environment variable if available, fallback to provided secret or default
  const jwtSecret = process.env.JWT_SECRET || secret || DEFAULT_SECRET;
  
  // Default expiration to 30 days
  const defaultOptions = {
    expiresIn: '30d'
  };
  
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role,
      // Include api_key hash for verification but never the actual API key
      apiKeyHash: user.api_key ? require('crypto').createHash('sha256').update(user.api_key).digest('hex') : undefined
    },
    jwtSecret,
    { ...defaultOptions, ...options }
  );
}

/**
 * Middleware to verify JWT token in request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function verifyToken(req, res, next) {
  // Get token from Authorization header or from query parameter
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : req.query.token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Access token is required',
        code: 'AUTH_TOKEN_MISSING',
        statusCode: 401
      }
    });
  }
  
  try {
    // Use environment variable if available, fallback to default
    const jwtSecret = process.env.JWT_SECRET || DEFAULT_SECRET;
    
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    
    // Add device-specific info to the token verification
    if (req.deviceType) {
      req.user.deviceType = req.deviceType;
    }
    
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID',
        statusCode: 401
      }
    });
  }
}

/**
 * Refreshes an existing JWT token
 * @param {string} token - The existing token to refresh
 * @param {string} secret - Secret key for signing the token (defaults to environment variable)
 * @param {Object} options - Additional options for token generation
 * @returns {string} - The refreshed JWT token
 */
function refreshToken(token, secret = null, options = {}) {
  try {
    // Use environment variable if available, fallback to provided secret or default
    const jwtSecret = process.env.JWT_SECRET || secret || DEFAULT_SECRET;
    
    // Verify the existing token
    const decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true });
    
    // Remove unnecessary fields
    delete decoded.iat;
    delete decoded.exp;
    delete decoded.nbf;
    delete decoded.jti;
    
    // Generate a new token
    return generateToken(decoded, secret, options);
  } catch (err) {
    throw new Error('Invalid token for refresh');
  }
}

module.exports = {
  generateToken,
  verifyToken,
  refreshToken
};
