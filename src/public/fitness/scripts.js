
// src/public/fitness/scripts.js

// Conversion constants
const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

// Disposable email domains
const disposableEmailDomains = [
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'sharklasers.com', 'throwawaymail.com', 'yopmail.com', 'dispostable.com'
];

// DOM elements - with safe access
const unitSystemSelect = document.getElementById('unit-system');

// Stripe initialization (dynamically loaded from server config)
let stripe;

// User profile object
let userProfile = {
  plan: 'essential',
  role: 'user',
  requestsRemaining: 10
};

// Email verification handling
let pendingApiRequest = null;
let userEmail = '';

// Function to show verification modal
function showVerificationModal(email) {
  userEmail = email;
  document.getElementById('verification-modal').style.display = 'block';
  document.getElementById('verification-message').textContent = '';
}

// Function to hide verification modal
function hideVerificationModal() {
  document.getElementById('verification-modal').style.display = 'none';
  pendingApiRequest = null;
}

// Function to handle API requests with verification
async function makeApiRequestWithVerification(endpoint, data, method = 'POST') {
  const apiKey = localStorage.getItem('apiKey');
  if (!apiKey) {
    showLoginModal();
    return null;
  }

  try {
    // Handle different data types properly
    let options = {
      method: method,
      headers: {
        'X-API-Key': apiKey
      }
    };
    
    // Handle FormData vs JSON differently
    if (endpoint === 'food-plate' && data instanceof FormData) {
      // Don't set Content-Type for FormData (browser sets it with boundary)
      options.body = data;
    } else if (typeof data === 'string') {
      // Already JSON string
      options.headers['Content-Type'] = 'application/json';
      options.body = data;
    } else {
      // Object needs to be stringified
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`/fitness/api/fitness/${endpoint}`, options);

    if (response.status === 403) {
      const responseData = await response.json();
      
      if (responseData.requiresVerification) {
        // Store the pending request to retry after verification
        pendingApiRequest = { endpoint, data, method };
        
        // Show verification modal
        showVerificationModal(responseData.email);
        
        // Automatically request a verification code
        await resendVerificationCode(responseData.email, apiKey);
        
        return null;
      }
    }

    return response;
  } catch (error) {
    console.error('API request error:', error);
    return null;
  }
}

// Function to verify email code
async function verifyEmailCode(code) {
  try {
    const apiKey = localStorage.getItem('apiKey');
    
    const response = await fetch('/fitness/api/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userEmail,
        code: code,
        apiKey: apiKey
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Update localStorage to indicate email is verified
      localStorage.setItem('emailVerified', 'true');
      return true;
    } else {
      document.getElementById('verification-message').textContent = data.error || 'Verification failed';
      return false;
    }
  } catch (err) {
    console.error('Error verifying code:', err);
    document.getElementById('verification-message').textContent = 'Server error during verification';
    return false;
  }
}

// Function to resend verification code
async function resendVerificationCode(email, apiKey) {
  try {
    const response = await fetch('/fitness/api/fitness/resend-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        apiKey: apiKey
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('verification-message').textContent = 'Verification code sent!';
      return true;
    } else {
      document.getElementById('verification-message').textContent = data.error || 'Failed to send code';
      return false;
    }
  } catch (error) {
    console.error('Resend code error:', error);
    document.getElementById('verification-message').textContent = 'Failed to send code';
    return false;
  }
}

// Event listeners for verification modal
document.addEventListener('DOMContentLoaded', function() {
  // Close button for verification modal
  document.querySelector('#verification-modal .close-button').addEventListener('click', hideVerificationModal);
  
  // Verify button
  document.getElementById('verify-button').addEventListener('click', async function() {
    const code = document.getElementById('verification-code').value;
    if (code.length !== 6) {
      document.getElementById('verification-message').textContent = 'Please enter a 6-digit code';
      return;
    }
    
    const result = await verifyEmailCode(code);
    if (result === true) {
      hideVerificationModal();
      showNotification('Email verified successfully!', 'success');
    }
  });
  
  // Resend code button
  document.getElementById('resend-code-button').addEventListener('click', async function() {
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey && userEmail) {
      await resendVerificationCode(userEmail, apiKey);
    }
  });
  
  // Update all API calls to use the new function
  // For example:
  document.getElementById('generate-workout-btn').addEventListener('click', async function() {
    // Get form data
    const formData = getWorkoutFormData();
    
    // Use the new function instead of direct fetch
    const response = await makeApiRequestWithVerification('generate-workout-plan', formData);
    if (response) {
      const data = await response.json();
      // Handle response...
    }
  });
  
  // Do the same for all other API call buttons
});

// Initialize Stripe with publishable key from server
async function initializeStripe() {
  try {
    const response = await fetch('/fitness/config');
    if (!response.ok) {
      throw new Error(`Failed to fetch Stripe config: ${response.status}`);
    }
    const { stripePublishableKey } = await response.json();
    if (stripePublishableKey) {
      stripe = Stripe(stripePublishableKey);
      console.log('Stripe initialized with publishable key');
      return true;
    } else {
      console.error('No Stripe publishable key found in config');
      return false;
    }
  } catch (error) {
    console.error('Failed to load Stripe configuration:', error);
    return false;
  }
}

// Format API response into HTML
function formatResult(result, endpoint) {
  if (!result) return '<p>No valid data returned.</p>';
  const data = result.data || result;
  if (!data) return '<p>No valid data returned.</p>';
  
  let html = '';
  
  switch (endpoint) {
    case 'generateWorkoutPlan':
      html = `<div class="result-card">
        <h2 class="result-title-large">${data.goal || 'Workout Plan'}</h2>
        <div class="result-summary">
          <h3>Summary</h3>
          <p>A workout plan has been generated.</p>
        </div></div>`;
      break;
      
    case 'exerciseDetails':
      html = `<div class="result-card">
        <h2 class="result-title-large">${data.name || 'Exercise'}</h2>
        <p><strong>Muscle Groups:</strong> ${Array.isArray(data.muscle_groups) ? data.muscle_groups.join(', ') : 'N/A'}</p>
        <p><strong>Difficulty:</strong> ${data.difficulty || 'N/A'}</p>
      </div>`;
      break;
      
    case 'nutritionMealPlan':
      html = `<div class="result-card">
        <h2 class="result-title-large">Nutrition & Meal Plan</h2>
        <p><strong>Macros:</strong> Protein: ${data.macros?.protein || 0}g, Fat: ${data.macros?.fat || 0}g, Carbs: ${data.macros?.carbs || 0}g</p>
      </div>`;
      break;
      
    case 'analyzeFoodPlate':
      html = `<div class="result-card">
        <h2 class="result-title-large">${data.title || 'Food Plate Analysis'}</h2>
        <p>Food analysis completed.</p>
      </div>`;
      break;
      
    case 'foodIngredientDirectory':
      html = `<div class="result-card">
        <h2>${data.name || 'Ingredient'}</h2>
        <p><strong>Definition:</strong> ${data.definition || 'N/A'}</p>
      </div>`;
      break;
      
    case 'naturalRemedies':
      html = `<div class="result-card">
        <h2 class="result-title-large">Natural Remedies</h2>
        <p>Remedies available for this condition.</p>
      </div>`;
      break;
      
    default:
      html = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
  return html;
}

// Handle form submissions - safely attaching event listeners
function handleFormSubmit(formId, resultId, endpoint) {
  const form = document.getElementById(formId);
  const resultContainer = document.getElementById(resultId);
  
  if (!form || !resultContainer) return;
  
  const resultContent = resultContainer.querySelector('.result-content');
  const statusBadge = resultContainer.querySelector('.status-badge');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted:', formId);
    
    const apiKey = localStorage.getItem('apiKey');
    const emailVerified = localStorage.getItem('emailVerified') === 'true';
    
    // If no API key, prompt for login
    if (!apiKey) {
      showLoginModal();
      return;
    }
    
    // If email not verified, show verification modal
    if (!emailVerified) {
      // We need to get the user's email first
      try {
        const response = await fetch('/fitness/api/validate-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ apiKey })
        });
        
        const data = await response.json();
        if (response.ok && data.email) {
          userEmail = data.email;
          showVerificationModal(data.email);
        } else {
          throw new Error('Could not retrieve user information');
        }
      } catch (error) {
        console.error('Error getting user info:', error);
        resultContent.innerHTML = `<p>Error: ${error.message}</p>`;
        statusBadge.textContent = 'Error';
        statusBadge.className = 'status-badge status-error';
      }
      return;
    }
    
    // Show loading state
    resultContainer.style.display = 'block';
    resultContent.innerHTML = '<div class="loading">Processing your request...</div>';
    statusBadge.textContent = 'Processing';
    statusBadge.className = 'status-badge';
    
    // Prepare form data
    let formData;
    if (endpoint === 'food-plate') {
      formData = new FormData(form);
    } else {
      formData = new FormData(form);
      const formDataObj = Object.fromEntries(formData);
      formData = JSON.stringify(formDataObj);
    }
    
    try {
      // Make the API call
      let response;
      if (endpoint === 'food-plate') {
        response = await fetch(`/fitness/api/${endpoint.toLowerCase()}`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey
          },
          body: formData
        });
      } else {
        response = await fetch(`/fitness/api/${endpoint.toLowerCase()}`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: formData
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const result = await response.json();
      resultContent.innerHTML = formatResult(result, endpoint);
      statusBadge.textContent = 'Success';
      statusBadge.className = 'status-badge status-success';
      
    } catch (error) {
      console.error('Error:', error);
      resultContent.innerHTML = `<p>Error: ${error.message}</p>`;
      statusBadge.textContent = 'Error';
      statusBadge.className = 'status-badge status-error';
    }
  });
}

// Initialize form listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and scripts initialized');
  
  // Initialize Stripe
  initializeStripe();
  
  // Fix for API feature buttons
  const apiFeatureButtons = document.querySelectorAll('.sidebar-item, .tab-button');
  apiFeatureButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const tabName = this.getAttribute('data-tab');
      console.log('API feature clicked:', tabName);
      
      // Remove active class from all tabs and content
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      document.querySelectorAll(`.tab-button[data-tab="${tabName}"]`).forEach(btn => btn.classList.add('active'));
      const tabContent = document.getElementById(`${tabName}-tab`);
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });
  
  // Fix for form submissions
  const forms = document.querySelectorAll('form[data-api-endpoint]');
  forms.forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const endpoint = this.getAttribute('data-api-endpoint');
      const resultId = this.getAttribute('data-result-id');
      console.log(`Form submitted: ${this.id}, endpoint: ${endpoint}`);
      
      const resultContainer = document.getElementById(resultId);
      if (!resultContainer) return;
      
      const resultContent = resultContainer.querySelector('.result-content');
      const statusBadge = resultContainer.querySelector('.status-badge');
      
      // Show loading state
      if (resultContent) {
        resultContent.innerHTML = '<div class="loading">Processing request...</div>';
      }
      if (statusBadge) {
        statusBadge.textContent = 'Loading';
        statusBadge.className = 'status-badge status-loading';
      }
      
      try {
        // Prepare form data
        let formData;
        if (endpoint === 'food-plate') {
          formData = new FormData(this);
        } else {
          const formDataObj = {};
          new FormData(this).forEach((value, key) => {
            formDataObj[key] = value;
          });
          formData = formDataObj;
        }
        
        // Make API request
        const response = await makeApiRequestWithVerification(endpoint, formData);
        if (!response) return;
        
        const result = await response.json();
        if (resultContent) {
          resultContent.innerHTML = formatResult(result, endpoint);
        }
        if (statusBadge) {
          statusBadge.textContent = 'Success';
          statusBadge.className = 'status-badge status-success';
        }
      } catch (error) {
        console.error('API request error:', error);
        if (resultContent) {
          resultContent.innerHTML = `<p>Error: ${error.message}</p>`;
        }
        if (statusBadge) {
          statusBadge.textContent = 'Error';
          statusBadge.className = 'status-badge status-error';
        }
      }
    });
  });

  // Tab navigation
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  
  if (tabs.length > 0 && contents.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const content = document.getElementById(`${tab.dataset.tab}-tab`);
        if (content) {
          content.classList.add('active');
        }
      });
    });
  }

  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      menuToggle.textContent = sidebar.classList.contains('collapsed') ? '☰' : '✕';
    });
  }
});

// Function to handle login
async function handleLogin(apiKey) {
  try {
    const response = await fetch('/fitness/api/validate-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store API key and user info
      localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('userPlan', data.plan);
      localStorage.setItem('emailVerified', data.email_verified);
      
      // If email is not verified, show verification modal
      if (!data.email_verified) {
        userEmail = data.email; // Make sure to capture the email
        showVerificationModal(data.email);
      } else {
        // Email already verified, proceed normally
        updateUIForLoggedInUser(data.plan);
        hideLoginModal();
      }
      
      return true;
    } else {
      throw new Error(data.error || 'Invalid API key');
    }
  } catch (error) {
    console.error('Login error:', error);
    document.getElementById('login-error').textContent = error.message;
    return false;
  }
}

// Function to submit verification code
async function submitVerificationCode() {
  const code = document.getElementById('verification-code').value.trim();
  if (!code) {
    document.getElementById('verification-message').textContent = 'Please enter the verification code';
    return;
  }

  try {
    const response = await fetch('/api/fitness/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: userEmail, code })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Update local storage to indicate email is verified
      localStorage.setItem('emailVerified', 'true');
      
      document.getElementById('verification-message').textContent = 'Email verified successfully!';
      document.getElementById('verification-message').style.color = 'green';
      
      // Hide modal after a short delay
      setTimeout(() => {
        hideVerificationModal();
      }, 1500);
    } else {
      document.getElementById('verification-message').textContent = data.error || 'Verification failed';
      document.getElementById('verification-message').style.color = 'red';
    }
  } catch (error) {
    console.error('Verification error:', error);
    document.getElementById('verification-message').textContent = 'Server error during verification';
    document.getElementById('verification-message').style.color = 'red';
  }
}
