/**
 * Device detection utility for mobile-friendly API
 * Detects mobile devices and provides device type information
 */

const mobileDevicePatterns = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Mobile/i,
  /Tablet/i,
  /IEMobile/i
];

/**
 * Determines if a user agent string is from a mobile device
 * @param {string} userAgent - The user agent string to check
 * @returns {boolean} - True if from a mobile device, false otherwise
 */
function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  return mobileDevicePatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Gets the device type from a user agent string
 * @param {string} userAgent - The user agent string to check
 * @returns {string} - 'tablet', 'mobile', 'desktop', or 'unknown'
 */
function getDeviceType(userAgent) {
  if (!userAgent) {
    return 'unknown';
  }
  
  if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) {
    return 'tablet';
  } else if (isMobileDevice(userAgent)) {
    return 'mobile';
  } else {
    return 'desktop';
  }
}

module.exports = {
  isMobileDevice,
  getDeviceType
};
