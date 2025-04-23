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
  
  if (!form || !resultContainer) {
    console.log(`Form #${formId} or result container #${resultId} not found`);
    return;
  }
  
  const resultContent = resultContainer.querySelector('.result-content');
  const statusBadge = resultContainer.querySelector('.status-badge');
  
  if (!resultContent || !statusBadge) {
    console.error(`Required elements not found in result container #${resultId}`);
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted:', formId);
    const apiKey = localStorage.getItem('apiKey') || 'rees-admin-key-789';
    const formData = new FormData(form);

    resultContainer.classList.add('visible');
    resultContent.innerHTML = '<p>Loading...</p>';
    statusBadge.textContent = 'Processing';
    statusBadge.className = 'status-badge';

    try {
      // Simplified request handling
      const response = await fetch(`/api/fitness/${endpoint.toLowerCase()}`, {
        method: 'POST',
        headers: { 
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
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
  
  const formEndpoints = [
    { formId: 'workout-form', resultId: 'workout-result', endpoint: 'workout' },
    { formId: 'exercise-form', resultId: 'exercise-result', endpoint: 'exercise' },
    { formId: 'nutrition-meal-form', resultId: 'nutrition-meal-result', endpoint: 'meal-plan' },
    { formId: 'food-form', resultId: 'food-result', endpoint: 'food-plate' },
    { formId: 'food-ingredient-directory-form', resultId: 'food-ingredient-directory-result', endpoint: 'food-ingredient' },
    { formId: 'natural-remedies-form', resultId: 'natural-remedies-result', endpoint: 'natural-remedies' }
  ];

  formEndpoints.forEach(({ formId, resultId, endpoint }) => {
    if (document.getElementById(formId) && document.getElementById(resultId)) {
      handleFormSubmit(formId, resultId, endpoint);
    }
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
