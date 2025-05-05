/**
 * Response formatter utility for mobile-friendly API
 * Provides consistent API response formatting
 */

/**
 * Formats API responses in a consistent way for clients
 * @param {any} data - The main response data
 * @param {Object} meta - Additional metadata to include with the response
 * @param {Object} options - Formatting options
 * @returns {Object} - The formatted response object
 */
function formatApiResponse(data, meta = {}, options = {}) {
  const { compact = false } = options;
  
  // Base response object
  const response = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      apiVersion: 'v1',
      ...meta
    }
  };
  
  // For mobile clients, optionally compact the response
  if (compact && data) {
    // If data is an array, optimize each item
    if (Array.isArray(data)) {
      response.data = data.map(item => compactObject(item));
    } 
    // Otherwise just optimize the data object
    else if (typeof data === 'object') {
      response.data = compactObject(data);
    }
  }
  
  return response;
}

/**
 * Formats error responses consistently
 * @param {string} message - The error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code identifier
 * @param {Object} details - Additional error details
 * @returns {Object} - The formatted error response
 */
function formatErrorResponse(message, statusCode = 500, code = 'SERVER_ERROR', details = null) {
  return {
    success: false,
    error: {
      message,
      code,
      statusCode,
      ...(details ? { details } : {})
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Creates a compact version of an object by removing verbose fields
 * @param {Object} obj - The object to compact
 * @returns {Object} - A more compact version of the object
 */
function compactObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  // Remove verbose fields often not needed on mobile
  const verboseFields = [
    'verbose_description', 'full_detail', 'extended_notes',
    'detailed_explanation', 'raw_data'
  ];
  
  verboseFields.forEach(field => {
    if (field in result) {
      // For descriptions, keep a shorter version
      if (field === 'verbose_description' && typeof result[field] === 'string') {
        result.description = result.description || result[field].substring(0, 100);
      }
      delete result[field];
    }
  });
  
  return result;
}

module.exports = {
  formatApiResponse,
  formatErrorResponse,
  compactObject
};
