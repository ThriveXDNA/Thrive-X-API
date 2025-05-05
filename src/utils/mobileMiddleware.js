/**
 * Mobile middleware for the API
 * Handles detection and optimization for mobile clients
 */

const { isMobileDevice, getDeviceType } = require('./deviceDetection');
const { compactObject } = require('./responseFormatter');

/**
 * Middleware to detect mobile devices and set appropriate headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function detectMobileDevice(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  
  // Set mobile detection properties on request object
  req.isMobile = isMobileDevice(userAgent);
  req.deviceType = getDeviceType(userAgent);
  
  // Add appropriate headers for mobile
  if (req.isMobile) {
    // Optimize headers for mobile responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
  
  next();
}

/**
 * Middleware to optimize payloads for mobile devices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function optimizeForMobile(req, res, next) {
  const originalJson = res.json;
  
  // Override the json method to optimize responses for mobile
  res.json = function(data) {
    // If client is mobile and the response is large, optimize it
    if (req.isMobile && data && typeof data === 'object') {
      // For large responses, apply optimizations
      const dataSize = JSON.stringify(data).length;
      
      if (dataSize > 5000) { // Only compact large responses
        let optimizedData;
        
        // Handle arrays
        if (Array.isArray(data)) {
          optimizedData = data.map(item => compactObject(item));
        } else {
          optimizedData = compactObject(data);
        }
        
        return originalJson.call(this, optimizedData);
      }
    }
    
    // For non-mobile or small responses, proceed normally
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Middleware to add device-appropriate caching headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function addMobileCacheHeaders(req, res, next) {
  const path = req.path.split('/')[1];
  const staticAssetPaths = ['img', 'css', 'js', 'fonts', 'assets', 'static'];
  
  if (staticAssetPaths.includes(path)) {
    // Cache static assets longer on mobile devices to reduce network usage
    if (req.isMobile) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  } else {
    // Don't cache API responses by default
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

module.exports = {
  detectMobileDevice,
  optimizeForMobile,
  addMobileCacheHeaders
};
