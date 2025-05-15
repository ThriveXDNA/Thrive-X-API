// src/public/fitness/scripts.js

// Conversion constants
const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

// DOM elements
const unitSystemSelect = document.getElementById('unit-system');

// Initialize Stripe (if on subscription page)
let stripe;
if (typeof Stripe !== 'undefined') {
  stripe = Stripe('pk_live_51QXEvIBiUs9vvIkwd8zmWPqbRN2UzK2VjYBfgvyJD1qPmgZY4dNCw5juRmUIgRlZFrbVaNv90przGsiPqp8dirfP005P8e5gRB');
}

// User profile object - Updated to use Core as default (removed Essential)
let userProfile = {
  plan: 'core',  
  role: 'user',
  requestsRemaining: 500  // Changed from 10 to 500
};

// Form validation utility function
function validateField(field, errorElement) {
  if (!field.value.trim()) {
    errorElement.textContent = `${field.placeholder || 'This field'} is required`;
    errorElement.style.display = 'block';
    field.classList.add('error');
    return false;
  } else {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
    field.classList.remove('error');
    return true;
  }
}

// Force mobile sidebar to collapse on page load for better UX
document.addEventListener('DOMContentLoaded', () => {
  // Redirect from success/canceled pages
  const urlParams = new URLSearchParams(window.location.search);
  const isSuccess = urlParams.get('success') === 'true';
  const isCanceled = urlParams.get('canceled') === 'true';

  // Show appropriate messages based on Stripe redirect parameters
  if (isSuccess && window.location.pathname.includes('/subscribe')) {
    const plansElement = document.getElementById('subscription-plans');
    const successElement = document.getElementById('success-message');
    if (plansElement && successElement) {
      plansElement.classList.add('hidden');
      successElement.classList.remove('hidden');
    }
  } else if (isCanceled && window.location.pathname.includes('/subscribe')) {
    const plansElement = document.getElementById('subscription-plans');
    const cancelElement = document.getElementById('cancel-message');
    if (plansElement && cancelElement) {
      plansElement.classList.add('hidden');
      cancelElement.classList.remove('hidden');
    }
  }

  // Initialize layout components
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 992) {
    sidebar.classList.add('collapsed');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.textContent = '☰';
    }
  }

  // Toggle between content sections if tabs exist
  const tabLinks = document.querySelectorAll('.tab-link');
  if (tabLinks.length > 0) {
    tabLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all tabs and hide all content
        tabLinks.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Add active class to current tab and show its content
        this.classList.add('active');
        const targetId = this.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
    
    // Activate first tab by default
    tabLinks[0].click();
  }

  // Add event listener for mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      menuToggle.textContent = sidebar.classList.contains('collapsed') ? '☰' : '✕';
    });
  }

  // Workout form setup
  setupWorkoutForm();
  
  // Diet & nutrition form setup
  setupNutritionForm();
  
  // Food plate form setup
  setupFoodPlateForm();
  
  // Exercise details form setup
  setupExerciseForm();
  
  // Food ingredient details form setup
  setupFoodIngredientForm();
  
  // Natural remedies form setup
  setupNaturalRemediesForm();

  // Set up unit system toggle
  setupUnitSystem();

  // Fetch and validate user profile with API key
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    validateApiKey(apiKey);
  } else {
    // If no stored API key, show API key form
    const apiKeyForm = document.getElementById('api-key-form');
    if (apiKeyForm) {
      apiKeyForm.style.display = 'block';
    }
    
    // Hide all forms until API key is verified
    document.querySelectorAll('.api-form').forEach(form => {
      form.style.display = 'none';
    });
    
    // Show remaining requests counter
    updateRequestCounter();
  }

  // Handle API key form submission
  const apiKeyForm = document.getElementById('api-key-form');
  if (apiKeyForm) {
    apiKeyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const apiKeyInput = document.getElementById('api-key-input');
      const apiKey = apiKeyInput.value.trim();
      
      if (!apiKey) {
        document.getElementById('api-key-error').textContent = 'Please enter a valid API key';
        return;
      }
      
      validateApiKey(apiKey);
    });
  }

  // Subscription button event handlers
  const navSubscribeBtn = document.getElementById('sidebar-subscribe-btn');
  if (navSubscribeBtn) {
    navSubscribeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '/fitness/subscribe';
    });
  }

  // Guide user to subscription page if they have API key issues
  const getApiKeyBtn = document.getElementById('get-api-key-btn');
  if (getApiKeyBtn) {
    getApiKeyBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '/fitness/subscribe';
    });
  }
});

// Global form submission handler
function handleFormSubmission(formId, event) {
  event.preventDefault();
  const form = event.target;
  
  // Check API key
  const apiKey = localStorage.getItem('apiKey');
  if (!apiKey) {
    alert('Please enter your API key to use this feature.');
    return;
  }
  
  // Check requests remaining
  if (userProfile.requestsRemaining <= 0) {
    alert('You have reached your API request limit. Please upgrade your plan for more requests.');
    return;
  }
  
  // Clear previous results
  const resultContainer = document.getElementById(`${formId}-result`);
  if (resultContainer) {
    resultContainer.innerHTML = '<p class="loading">Generating results...</p>';
    resultContainer.style.display = 'block';
  }
  
  let endpoint = '';
  let requestData = {
    unitSystem: getUnitSystem()
  };
  
  // Build request data based on form type
  if (formId === 'workout-form') {
    const preferences = Array.from(form.querySelectorAll('input[name="preferences"]:checked')).map(el => el.value);
    const equipmentOptions = Array.from(form.querySelectorAll('input[name="equipment"]:checked')).map(el => el.value);
    
    requestData = {
      ...requestData,
      age: parseInt(form.querySelector('#age').value),
      gender: form.querySelector('#gender').value,
      weight: parseFloat(form.querySelector('#weight').value),
      height: parseFloat(form.querySelector('#height').value),
      fitnessLevel: form.querySelector('#fitness-level').value,
      fitnessGoal: form.querySelector('#fitness-goal').value,
      workoutDuration: parseInt(form.querySelector('#workout-duration').value),
      workoutFrequency: parseInt(form.querySelector('#workout-frequency').value),
      preferences: preferences,
      healthIssues: form.querySelector('#health-issues').value,
      equipmentAvailable: equipmentOptions
    };
    
    endpoint = '/fitness/api/fitness/workout';
  } else if (formId === 'nutrition-form') {
    const dietaryRestrictions = Array.from(form.querySelectorAll('input[name="dietary-restrictions"]:checked')).map(el => el.value);
    const cuisinePreferences = Array.from(form.querySelectorAll('input[name="cuisine-preferences"]:checked')).map(el => el.value);
    
    requestData = {
      ...requestData,
      age: parseInt(form.querySelector('#nutrition-age').value),
      gender: form.querySelector('#nutrition-gender').value,
      weight: parseFloat(form.querySelector('#nutrition-weight').value),
      height: parseFloat(form.querySelector('#nutrition-height').value),
      activityLevel: form.querySelector('#activity-level').value,
      nutritionGoal: form.querySelector('#nutrition-goal').value,
      mealsPerDay: parseInt(form.querySelector('#meals-per-day').value),
      budgetLevel: form.querySelector('#budget-level').value,
      dietaryRestrictions: dietaryRestrictions,
      allergies: form.querySelector('#allergies').value,
      cuisinePreferences: cuisinePreferences
    };
    
    endpoint = '/fitness/api/fitness/meal-plan';
  } else if (formId === 'food-plate-form') {
    const formData = new FormData();
    const fileInput = form.querySelector('#food-image');
    
    if (fileInput.files.length === 0) {
      alert('Please select an image to analyze.');
      
      if (resultContainer) {
        resultContainer.innerHTML = '';
      }
      
      return;
    }
    
    formData.append('food_image', fileInput.files[0]);
    formData.append('unitSystem', getUnitSystem());
    
    // AJAX call for food plate analysis
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/fitness/api/fitness/food-plate', true);
    xhr.setRequestHeader('X-API-Key', apiKey);
    
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          displayFoodPlateResult(response);
          
          // Decrement requests
          userProfile.requestsRemaining -= 1;
          updateRequestCounter();
        } catch (e) {
          if (resultContainer) {
            resultContainer.innerHTML = '<p class="error">Error parsing response. Please try again.</p>';
          }
        }
      } else {
        handleApiError(xhr);
      }
    };
    
    xhr.onerror = function() {
      if (resultContainer) {
        resultContainer.innerHTML = '<p class="error">Network error. Please check your connection and try again.</p>';
      }
    };
    
    xhr.send(formData);
    return; // Exit early as we're using XMLHttpRequest for file upload
  } else if (formId === 'exercise-form') {
    requestData = {
      ...requestData,
      exerciseName: form.querySelector('#exercise-name').value,
      muscleGroup: form.querySelector('#muscle-group').value
    };
    
    endpoint = '/fitness/api/fitness/exercise';
  } else if (formId === 'food-ingredient-form') {
    requestData = {
      ...requestData,
      ingredientName: form.querySelector('#ingredient-name').value,
      includeNutrition: form.querySelector('#include-nutrition').checked,
      includeRecipes: form.querySelector('#include-recipes').checked,
      includeHealthBenefits: form.querySelector('#include-health-benefits').checked
    };
    
    endpoint = '/fitness/api/fitness/food-ingredient';
  } else if (formId === 'remedies-form') {
    requestData = {
      ...requestData,
      condition: form.querySelector('#condition').value,
      preferredType: form.querySelector('#remedy-type').value
    };
    
    endpoint = '/fitness/api/fitness/natural-remedies';
  }
  
  // Make the API request
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(requestData)
  })
  .then(response => {
    if (!response.ok) {
      throw response;
    }
    return response.json();
  })
  .then(data => {
    // Display result based on form type
    if (formId === 'workout-form') {
      displayWorkoutResult(data);
    } else if (formId === 'nutrition-form') {
      displayNutritionResult(data);
    } else if (formId === 'exercise-form') {
      displayExerciseResult(data);
    } else if (formId === 'food-ingredient-form') {
      displayFoodIngredientResult(data);
    } else if (formId === 'remedies-form') {
      displayRemediesResult(data);
    }
    
    // Decrement requests
    userProfile.requestsRemaining -= 1;
    updateRequestCounter();
  })
  .catch(err => {
    if (err instanceof Response) {
      err.json().then(errorData => {
        if (resultContainer) {
          resultContainer.innerHTML = `<p class="error">${errorData.error || 'An error occurred. Please try again.'}</p>`;
        }
      }).catch(() => {
        if (resultContainer) {
          resultContainer.innerHTML = `<p class="error">Error: ${err.statusText}</p>`;
        }
      });
    } else {
      if (resultContainer) {
        resultContainer.innerHTML = `<p class="error">Error: ${err.message}</p>`;
      }
    }
  });
}

// Handle API errors
function handleApiError(xhr) {
  const resultContainer = document.querySelector('.result-container');
  
  try {
    const response = JSON.parse(xhr.responseText);
    if (resultContainer) {
      resultContainer.innerHTML = `<p class="error">${response.error || 'An error occurred. Please try again.'}</p>`;
    }
  } catch (e) {
    if (resultContainer) {
      resultContainer.innerHTML = `<p class="error">Error: ${xhr.statusText}</p>`;
    }
  }
}

// Validate API key with server
function validateApiKey(apiKey) {
  fetch('/fitness/api/auth/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Invalid API key');
    }
    return response.json();
  })
  .then(data => {
    // Store API key
    localStorage.setItem('apiKey', apiKey);
    
    // Update user profile
    userProfile = {
      ...userProfile,
      plan: data.plan || 'core',
      role: data.role || 'user',
      requestsRemaining: data.requestsRemaining || 500
    };
    
    // Show forms and hide API key form
    const apiKeyForm = document.getElementById('api-key-form');
    if (apiKeyForm) {
      apiKeyForm.style.display = 'none';
    }
    
    // Show API forms
    document.querySelectorAll('.api-form').forEach(form => {
      form.style.display = 'block';
    });
    
    // Update dropdown options based on plan
    updateDropdownOptions();
    
    // Show success message
    const formMessage = document.getElementById('form-message');
    if (formMessage) {
      formMessage.textContent = 'API key validated successfully!';
      formMessage.className = 'success-message';
      formMessage.style.display = 'block';
      
      // Hide message after 3 seconds
      setTimeout(() => {
        formMessage.style.display = 'none';
      }, 3000);
    }
    
    // Update requests counter
    updateRequestCounter();
  })
  .catch(error => {
    // Show error message
    const apiKeyError = document.getElementById('api-key-error');
    if (apiKeyError) {
      apiKeyError.textContent = error.message;
    }
  });
}

// Update dropdown options based on user's plan
function updateDropdownOptions() {
  // All plans now have access to all options, as we've removed the free tier
  // No restrictions needed here anymore
}

// Update requests counter
function updateRequestCounter() {
  const requestCounter = document.getElementById('requests-counter');
  if (requestCounter) {
    requestCounter.textContent = userProfile.requestsRemaining;
    
    // Add warning class if low on requests
    if (userProfile.requestsRemaining < 50) {
      requestCounter.classList.add('low-requests');
    } else {
      requestCounter.classList.remove('low-requests');
    }
  }
  
  // Show upgrade message if low on requests
  const upgradeMessage = document.getElementById('upgrade-message');
  if (upgradeMessage) {
    if (userProfile.requestsRemaining < 50) {
      upgradeMessage.style.display = 'block';
    } else {
      upgradeMessage.style.display = 'none';
    }
  }
}

// Set up workout form
function setupWorkoutForm() {
  const workoutForm = document.getElementById('workout-form');
  if (workoutForm) {
    workoutForm.addEventListener('submit', event => handleFormSubmission('workout-form', event));
  }
}

// Set up nutrition form
function setupNutritionForm() {
  const nutritionForm = document.getElementById('nutrition-form');
  if (nutritionForm) {
    nutritionForm.addEventListener('submit', event => handleFormSubmission('nutrition-form', event));
  }
}

// Set up food plate form
function setupFoodPlateForm() {
  const foodPlateForm = document.getElementById('food-plate-form');
  if (foodPlateForm) {
    foodPlateForm.addEventListener('submit', event => handleFormSubmission('food-plate-form', event));
  }
  
  // Preview image on file selection
  const foodImageInput = document.getElementById('food-image');
  if (foodImageInput) {
    foodImageInput.addEventListener('change', function() {
      const preview = document.getElementById('image-preview');
      if (preview) {
        if (this.files && this.files[0]) {
          const reader = new FileReader();
          reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
          };
          reader.readAsDataURL(this.files[0]);
        } else {
          preview.style.display = 'none';
        }
      }
    });
  }
}

// Set up exercise form
function setupExerciseForm() {
  const exerciseForm = document.getElementById('exercise-form');
  if (exerciseForm) {
    exerciseForm.addEventListener('submit', event => handleFormSubmission('exercise-form', event));
  }
}

// Set up food ingredient form
function setupFoodIngredientForm() {
  const foodIngredientForm = document.getElementById('food-ingredient-form');
  if (foodIngredientForm) {
    foodIngredientForm.addEventListener('submit', event => handleFormSubmission('food-ingredient-form', event));
  }
}

// Set up natural remedies form
function setupNaturalRemediesForm() {
  const remediesForm = document.getElementById('remedies-form');
  if (remediesForm) {
    remediesForm.addEventListener('submit', event => handleFormSubmission('remedies-form', event));
  }
}

// Set up unit system toggle
function setupUnitSystem() {
  if (unitSystemSelect) {
    // Set default unit system
    const savedUnitSystem = localStorage.getItem('unitSystem');
    if (savedUnitSystem) {
      unitSystemSelect.value = savedUnitSystem;
    } else {
      localStorage.setItem('unitSystem', unitSystemSelect.value);
    }
    
    // Handle unit system change
    unitSystemSelect.addEventListener('change', function() {
      localStorage.setItem('unitSystem', this.value);
      updateUnitLabels();
    });
    
    // Initial update of unit labels
    updateUnitLabels();
  }
}

// Get current unit system
function getUnitSystem() {
  return localStorage.getItem('unitSystem') || 'metric';
}

// Update unit labels based on selected system
function updateUnitLabels() {
  const unitSystem = getUnitSystem();
  const weightLabels = document.querySelectorAll('.weight-unit');
  const heightLabels = document.querySelectorAll('.height-unit');
  
  weightLabels.forEach(label => {
    label.textContent = unitSystem === 'metric' ? 'kg' : 'lb';
  });
  
  heightLabels.forEach(label => {
    label.textContent = unitSystem === 'metric' ? 'cm' : 'in';
  });
}

// Convert units for display
function convertWeight(weight, toSystem) {
  if (toSystem === 'metric') {
    return (weight * LB_TO_KG).toFixed(1);
  } else {
    return (weight / LB_TO_KG).toFixed(1);
  }
}

function convertHeight(height, toSystem) {
  if (toSystem === 'metric') {
    return (height * IN_TO_CM).toFixed(1);
  } else {
    return (height / IN_TO_CM).toFixed(1);
  }
}

// Display workout result
function displayWorkoutResult(data) {
  const resultContainer = document.getElementById('workout-form-result');
  if (!resultContainer) return;
  
  resultContainer.innerHTML = '';
  
  // Summary section
  const summarySection = document.createElement('div');
  summarySection.className = 'result-section';
  summarySection.innerHTML = `
    <h3>Workout Summary</h3>
    <p>${data.summary}</p>
  `;
  resultContainer.appendChild(summarySection);
  
  // Workout schedule
  const scheduleSection = document.createElement('div');
  scheduleSection.className = 'result-section';
  scheduleSection.innerHTML = `<h3>Weekly Schedule</h3>`;
  
  const scheduleTable = document.createElement('table');
  scheduleTable.className = 'workout-schedule';
  scheduleTable.innerHTML = `
    <thead>
      <tr>
        <th>Day</th>
        <th>Focus</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      ${data.schedule.map(day => `
        <tr>
          <td>${day.day}</td>
          <td>${day.focus}</td>
          <td>${day.duration} min</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  
  scheduleSection.appendChild(scheduleTable);
  resultContainer.appendChild(scheduleSection);
  
  // Detailed workouts
  const detailedSection = document.createElement('div');
  detailedSection.className = 'result-section';
  detailedSection.innerHTML = `<h3>Detailed Workout Plan</h3>`;
  
  // Create accordion for each day
  data.detailedPlan.forEach((day, index) => {
    const accordion = document.createElement('div');
    accordion.className = 'accordion';
    
    const accordionHeader = document.createElement('div');
    accordionHeader.className = 'accordion-header';
    accordionHeader.innerHTML = `
      <span>${day.day}: ${day.focus}</span>
      <span class="accordion-icon">+</span>
    `;
    
    const accordionContent = document.createElement('div');
    accordionContent.className = 'accordion-content';
    
    // Create workout sections
    const warmup = document.createElement('div');
    warmup.className = 'workout-section';
    warmup.innerHTML = `
      <h4>Warm-up (${day.warmup.duration} min)</h4>
      <ul>
        ${day.warmup.exercises.map(ex => `<li>${ex}</li>`).join('')}
      </ul>
    `;
    accordionContent.appendChild(warmup);
    
    // Main workout
    const mainWorkout = document.createElement('div');
    mainWorkout.className = 'workout-section';
    mainWorkout.innerHTML = `
      <h4>Main Workout (${day.mainWorkout.duration} min)</h4>
      <table class="exercise-table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Sets</th>
            <th>Reps/Time</th>
            <th>Rest</th>
          </tr>
        </thead>
        <tbody>
          ${day.mainWorkout.exercises.map(ex => `
            <tr>
              <td>
                <span class="exercise-name">${ex.name}</span>
                ${ex.notes ? `<span class="exercise-notes">${ex.notes}</span>` : ''}
              </td>
              <td>${ex.sets}</td>
              <td>${ex.reps || ex.duration}</td>
              <td>${ex.rest}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    accordionContent.appendChild(mainWorkout);
    
    // Cooldown
    const cooldown = document.createElement('div');
    cooldown.className = 'workout-section';
    cooldown.innerHTML = `
      <h4>Cooldown (${day.cooldown.duration} min)</h4>
      <ul>
        ${day.cooldown.exercises.map(ex => `<li>${ex}</li>`).join('')}
      </ul>
    `;
    accordionContent.appendChild(cooldown);
    
    // Add tips if available
    if (day.tips && day.tips.length > 0) {
      const tips = document.createElement('div');
      tips.className = 'workout-tips';
      tips.innerHTML = `
        <h4>Tips</h4>
        <ul>
          ${day.tips.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
      `;
      accordionContent.appendChild(tips);
    }
    
    // Assemble accordion
    accordion.appendChild(accordionHeader);
    accordion.appendChild(accordionContent);
    detailedSection.appendChild(accordion);
    
    // Add click event for accordion
    accordionHeader.addEventListener('click', function() {
      this.classList.toggle('active');
      const icon = this.querySelector('.accordion-icon');
      icon.textContent = icon.textContent === '+' ? '−' : '+';
      
      const content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
  
  resultContainer.appendChild(detailedSection);
  
  // Add additional notes
  if (data.notes && data.notes.length > 0) {
    const notesSection = document.createElement('div');
    notesSection.className = 'result-section';
    notesSection.innerHTML = `
      <h3>Additional Notes</h3>
      <ul>
        ${data.notes.map(note => `<li>${note}</li>`).join('')}
      </ul>
    `;
    resultContainer.appendChild(notesSection);
  }
  
  // Add visualizer if available
  if (data.metrics && data.metrics.muscleGroupFocus) {
    const chartSection = document.createElement('div');
    chartSection.className = 'result-section';
    chartSection.innerHTML = `
      <h3>Workout Focus Analysis</h3>
      <div class="chart-container">
        <canvas id="muscle-focus-chart"></canvas>
      </div>
    `;
    resultContainer.appendChild(chartSection);
    
    // Create chart
    const ctx = document.getElementById('muscle-focus-chart').getContext('2d');
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: Object.keys(data.metrics.muscleGroupFocus),
        datasets: [{
          label: 'Muscle Group Focus',
          data: Object.values(data.metrics.muscleGroupFocus),
          backgroundColor: 'rgba(30, 203, 225, 0.2)',
          borderColor: 'rgba(30, 203, 225, 1)',
          pointBackgroundColor: 'rgba(30, 203, 225, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(30, 203, 225, 1)'
        }]
      },
      options: {
        scale: {
          ticks: {
            beginAtZero: true,
            max: 10
          }
        }
      }
    });
  }
}

// Display nutrition result
function displayNutritionResult(data) {
  const resultContainer = document.getElementById('nutrition-form-result');
  if (!resultContainer) return;
  
  resultContainer.innerHTML = '';
  
  // Summary section
  const summarySection = document.createElement('div');
  summarySection.className = 'result-section';
  summarySection.innerHTML = `
    <h3>Nutrition Plan Summary</h3>
    <p>${data.summary}</p>
    
    <div class="nutrition-stats">
      <div class="stat-item">
        <span class="stat-value">${data.dailyCalories}</span>
        <span class="stat-label">Daily Calories</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.macronutrients.protein}</span>
        <span class="stat-label">Protein (g)</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.macronutrients.carbs}</span>
        <span class="stat-label">Carbs (g)</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.macronutrients.fat}</span>
        <span class="stat-label">Fat (g)</span>
      </div>
    </div>
  `;
  resultContainer.appendChild(summarySection);
  
  // Macronutrient chart
  const chartSection = document.createElement('div');
  chartSection.className = 'result-section';
  chartSection.innerHTML = `
    <h3>Macronutrient Breakdown</h3>
    <div class="chart-container">
      <canvas id="macro-chart"></canvas>
    </div>
  `;
  resultContainer.appendChild(chartSection);
  
  // Create macronutrient chart
  const macroCtx = document.getElementById('macro-chart').getContext('2d');
  new Chart(macroCtx, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [
          data.macronutrients.protein * 4, // 4 calories per gram of protein
          data.macronutrients.carbs * 4,   // 4 calories per gram of carbs
          data.macronutrients.fat * 9      // 9 calories per gram of fat
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${percentage}% (${value} calories)`;
            }
          }
        }
      }
    }
  });
  
  // Meal plan
  const mealPlanSection = document.createElement('div');
  mealPlanSection.className = 'result-section';
  mealPlanSection.innerHTML = `<h3>7-Day Meal Plan</h3>`;
  
  // Create accordion for each day
  data.mealPlan.forEach((day, index) => {
    const accordion = document.createElement('div');
    accordion.className = 'accordion';
    
    const accordionHeader = document.createElement('div');
    accordionHeader.className = 'accordion-header';
    accordionHeader.innerHTML = `
      <span>Day ${index + 1}</span>
      <span class="accordion-icon">+</span>
    `;
    
    const accordionContent = document.createElement('div');
    accordionContent.className = 'accordion-content';
    
    // Create meal sections
    Object.entries(day).forEach(([mealName, meal]) => {
      const mealSection = document.createElement('div');
      mealSection.className = 'meal-section';
      mealSection.innerHTML = `
        <h4>${mealName}</h4>
        <div class="meal-items">
          ${meal.items.map(item => `
            <div class="meal-item">
              <span class="meal-item-name">${item.name}</span>
              ${item.portion ? `<span class="meal-item-portion">${item.portion}</span>` : ''}
              ${item.calories ? `<span class="meal-item-calories">${item.calories} calories</span>` : ''}
            </div>
          `).join('')}
        </div>
        ${meal.notes ? `<p class="meal-notes">${meal.notes}</p>` : ''}
      `;
      accordionContent.appendChild(mealSection);
    });
    
    // Assemble accordion
    accordion.appendChild(accordionHeader);
    accordion.appendChild(accordionContent);
    mealPlanSection.appendChild(accordion);
    
    // Add click event for accordion
    accordionHeader.addEventListener('click', function() {
      this.classList.toggle('active');
      const icon = this.querySelector('.accordion-icon');
      icon.textContent = icon.textContent === '+' ? '−' : '+';
      
      const content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
  
  resultContainer.appendChild(mealPlanSection);
  
  // Grocery list
  if (data.groceryList && data.groceryList.length > 0) {
    const grocerySection = document.createElement('div');
    grocerySection.className = 'result-section';
    grocerySection.innerHTML = `
      <h3>Grocery List</h3>
      <div class="grocery-list">
        ${Object.entries(data.groceryList).map(([category, items]) => `
          <div class="grocery-category">
            <h4>${category}</h4>
            <ul>
              ${items.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `;
    resultContainer.appendChild(grocerySection);
  }
  
  // Nutrition tips
  if (data.nutritionTips && data.nutritionTips.length > 0) {
    const tipsSection = document.createElement('div');
    tipsSection.className = 'result-section';
    tipsSection.innerHTML = `
      <h3>Nutrition Tips</h3>
      <ul class="nutrition-tips">
        ${data.nutritionTips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    `;
    resultContainer.appendChild(tipsSection);
  }
}

// Display food plate analysis result
function displayFoodPlateResult(data) {
  const resultContainer = document.getElementById('food-plate-form-result');
  if (!resultContainer) return;
  
  resultContainer.innerHTML = '';
  
  // Overall analysis
  const analysisSection = document.createElement('div');
  analysisSection.className = 'result-section';
  analysisSection.innerHTML = `
    <h3>Food Plate Analysis</h3>
    <p>${data.analysis}</p>
    
    <div class="nutrition-stats">
      <div class="stat-item">
        <span class="stat-value">${data.estimatedCalories}</span>
        <span class="stat-label">Est. Calories</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.nutritionalValue}/10</span>
        <span class="stat-label">Nutritional Value</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${data.balanceScore}/10</span>
        <span class="stat-label">Balance Score</span>
      </div>
    </div>
  `;
  resultContainer.appendChild(analysisSection);
  
  // Detected items
  const itemsSection = document.createElement('div');
  itemsSection.className = 'result-section';
  itemsSection.innerHTML = `
    <h3>Detected Items</h3>
    <div class="detected-items">
      ${data.detectedItems.map(item => `
        <div class="detected-item">
          <span class="item-name">${item.name}</span>
          <span class="item-portion">${item.estimatedPortion}</span>
          <span class="item-calories">${item.calories} cal</span>
        </div>
      `).join('')}
    </div>
  `;
  resultContainer.appendChild(itemsSection);
  
  // Macronutrient breakdown
  if (data.macronutrients) {
    const macroSection = document.createElement('div');
    macroSection.className = 'result-section';
    macroSection.innerHTML = `
      <h3>Estimated Macronutrients</h3>
      <div class="chart-container">
        <canvas id="food-macro-chart"></canvas>
      </div>
      <div class="macro-details">
        <div class="macro-item">
          <span class="macro-value">${data.macronutrients.protein}g</span>
          <span class="macro-label">Protein</span>
        </div>
        <div class="macro-item">
          <span class="macro-value">${data.macronutrients.carbs}g</span>
          <span class="macro-label">Carbs</span>
        </div>
        <div class="macro-item">
          <span class="macro-value">${data.macronutrients.fat}g</span>
          <span class="macro-label">Fat</span>
        </div>
      </div>
    `;
    resultContainer.appendChild(macroSection);
    
    // Create macronutrient chart
    const macroCtx = document.getElementById('food-macro-chart').getContext('2d');
    new Chart(macroCtx, {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: [
            data.macronutrients.protein * 4, // 4 calories per gram of protein
            data.macronutrients.carbs * 4,   // 4 calories per gram of carbs
            data.macronutrients.fat * 9      // 9 calories per gram of fat
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  
  // Suggestions
  if (data.suggestions && data.suggestions.length > 0) {
    const suggestionsSection = document.createElement('div');
    suggestionsSection.className = 'result-section';
    suggestionsSection.innerHTML = `
      <h3>Improvement Suggestions</h3>
      <ul class="suggestions-list">
        ${data.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
      </ul>
    `;
    resultContainer.appendChild(suggestionsSection);
  }
}

// Display exercise result
function displayExerciseResult(data) {
  const resultContainer = document.getElementById('exercise-form-result');
  if (!resultContainer) return;
  
  resultContainer.innerHTML = '';
  
  // Exercise details
  const detailsSection = document.createElement('div');
  detailsSection.className = 'result-section';
  detailsSection.innerHTML = `
    <h3>${data.name}</h3>
    <div class="exercise-details">
      <div class="detail-item">
        <span class="detail-label">Type:</span>
        <span class="detail-value">${data.type}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Primary Muscle:</span>
        <span class="detail-value">${data.primaryMuscle}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Secondary Muscles:</span>
        <span class="detail-value">${data.secondaryMuscles.join(', ')}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Equipment:</span>
        <span class="detail-value">${data.equipment.join(', ')}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Difficulty:</span>
        <span class="detail-value">${data.difficulty}</span>
      </div>
    </div>
  `;
  resultContainer.appendChild(detailsSection);
  
  // Instructions
  const instructionsSection = document.createElement('div');
  instructionsSection.className = 'result-section';
  instructionsSection.innerHTML = `
    <h3>How to Perform</h3>
    <ol class="exercise-instructions">
      ${data.instructions.map(step => `<li>${step}</li>`).join('')}
    </ol>
  `;
  resultContainer.appendChild(instructionsSection);
  
  // Form tips
  if (data.formTips && data.formTips.length > 0) {
    const tipsSection = document.createElement('div');
    tipsSection.className = 'result-section';
    tipsSection.innerHTML = `
      <h3>Form Tips</h3>
      <ul class="form-tips">
        ${data.formTips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    `;
    resultContainer.appendChild(tipsSection);
  }
  
  // Variations
  if (data.variations && data.variations.length > 0) {
    const variationsSection = document.createElement('div');
    variationsSection.className = 'result-section';
    variationsSection.innerHTML = `
      <h3>Variations</h3>
      <ul class="exercise-variations">
        ${data.variations.map(variation => `
          <li>
            <span class="variation-name">${variation.name}</span>
            <span class="variation-description">${variation.description}</span>
          </li>
        `).join('')}
      </ul>
    `;
    resultContainer.appendChild(variationsSection);
  }
  
  // Benefits
  if (data.benefits && data.benefits.length > 0) {
    const benefitsSection = document.createElement('div');
    benefitsSection.className = 'result-section';
    benefitsSection.innerHTML = `
      <h3>Benefits</h3>
      <ul class="exercise-benefits">
        ${data.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
      </ul>
    `;
    resultContainer.appendChild(benefitsSection);
  }
}

// Display food ingredient result
function displayFoodIngredientResult(data) {
  const resultContainer = document.getElementById('food-ingredient-form-result');
  if (!resultContainer) return;
  
  resultContainer.innerHTML = '';
  
  // Ingredient overview
  const overviewSection = document.createElement('div');
  overviewSection.className = 'result-section';
  overviewSection.innerHTML = `
    <h3>${data.name}</h3>
    <p>${data.description}</p>
  `;
  resultContainer.appendChild(overviewSection);
  
  // Nutrition information
  if (data.nutrition) {
    const nutritionSection = document.createElement('div');
    nutritionSection.className = 'result-section';
    nutritionSection.innerHTML = `
      <h3>Nutrition Facts</h3>
      <p class="serving-size">Serving Size: ${data.nutrition.servingSize}</p>
      
      <table class="nutrition-table">
        <tr>
          <th>Nutrient</th>
          <th>Amount</th>
          <th>% Daily Value</th>
        </tr>
        <tr>
          <td>Calories</td>
          <td>${data.nutrition.calories}</td>
          <td></td>
        </tr>
        <tr>
          <td>Total Fat</td>
          <td>${data.nutrition.totalFat}</td>
          <td>${data.nutrition.fatDV}%</td>
        </tr>
        <tr>
          <td class="sub-nutrient">Saturated Fat</td>
          <td>${data.nutrition.saturatedFat}</td>
          <td>${data.nutrition.saturatedFatDV}%</td>
        </tr>
        <tr>
          <td>Cholesterol</td>
          <td>${data.nutrition.cholesterol}</td>
          <td>${data.nutrition.cholesterolDV}%</td>
        </tr>
        <tr>
          <td>Sodium</td>
          <td>${data.nutrition.sodium}</td>
          <td>${data.nutrition.sodiumDV}%</td>
        </tr>
        <tr>
          <td>Total Carbohydrate</td>
          <td>${data.nutrition.totalCarbs}</td>
          <td>${data.nutrition.carbsDV}%</td>
        </tr>
        <tr>
          <td class="sub-nutrient">Dietary Fiber</td>
          <td>${data.nutrition.dietaryFiber}</td>
          <td>${data.nutrition.fiberDV}%</td>
        </tr>
        <tr>
          <td class="sub-nutrient">Sugars</td>
          <td>${data.nutrition.sugars}</td>
          <td></td>
        </tr>
        <tr>
          <td>Protein</td>
          <td>${data.nutrition.protein}</td>
          <td></td>
        </tr>
      </table>
      
      <div class="vitamin-minerals">
        ${Object.entries(data.nutrition.vitaminsAndMinerals).map(([nutrient, percentage]) => `
          <div class="nutrient-item">
            <span class="nutrient-name">${nutrient}</span>
            <span class="nutrient-value">${percentage}%</span>
          </div>
        `).join('')}
      </div>
    `;
    resultContainer.appendChild(nutritionSection);
  }
  
  // Health benefits
  if (data.healthBenefits && data.healthBenefits.length > 0) {
    const benefitsSection = document.createElement('div');
    benefitsSection.className = 'result-section';
    benefitsSection.innerHTML = `
      <h3>Health Benefits</h3>
      <ul class="health-benefits">
        ${data.healthBenefits.map(benefit => `<li>${benefit}</li>`).join('')}
      </ul>
    `;
    resultContainer.appendChild(benefitsSection);
  }
  
  // Recipes
  if (data.recipes && data.recipes.length > 0) {
    const recipesSection = document.createElement('div');
    recipesSection.className = 'result-section';
    recipesSection.innerHTML = `<h3>Recipe Ideas</h3>`;
    
    // Create accordion for each recipe
    data.recipes.forEach((recipe, index) => {
      const accordion = document.createElement('div');
      accordion.className = 'accordion';
      
      const accordionHeader = document.createElement('div');
      accordionHeader.className = 'accordion-header';
      accordionHeader.innerHTML = `
        <span>${recipe.name}</span>
        <span class="accordion-icon">+</span>
      `;
      
      const accordionContent = document.createElement('div');
      accordionContent.className = 'accordion-content';
      
      // Recipe details
      accordionContent.innerHTML = `
        <div class="recipe-meta">
          <div class="recipe-meta-item">
            <span class="meta-label">Prep Time:</span>
            <span class="meta-value">${recipe.prepTime}</span>
          </div>
          <div class="recipe-meta-item">
            <span class="meta-label">Cook Time:</span>
            <span class="meta-value">${recipe.cookTime}</span>
          </div>
          <div class="recipe-meta-item">
            <span class="meta-label">Servings:</span>
            <span class="meta-value">${recipe.servings}</span>
          </div>
        </div>
        
        <h4>Ingredients</h4>
        <ul class="recipe-ingredients">
          ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
        </ul>
        
        <h4>Instructions</h4>
        <ol class="recipe-instructions">
          ${recipe.instructions.map(step => `<li>${step}</li>`).join('')}
        </ol>
      `;
      
      // Assemble accordion
      accordion.appendChild(accordionHeader);
      accordion.appendChild(accordionContent);
      recipesSection.appendChild(accordion);
      
      // Add click event for accordion
      accordionHeader.addEventListener('click', function() {
        this.classList.toggle('active');
        const icon = this.querySelector('.accordion-icon');
        icon.textContent = icon.textContent === '+' ? '−' : '+';
        
        const content = this.nextElementSibling;
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    });
    
    resultContainer.appendChild(recipesSection);
  }
  
  // Storage and preparation tips
  if (data.storageTips || data.preparationTips) {
    const tipsSection = document.createElement('div');
    tipsSection.className = 'result-section';
    tipsSection.innerHTML = `<h3>Storage & Preparation</h3>`;
    
    if (data.storageTips) {
      const storage = document.createElement('div');
      storage.className = 'tips-section';
      storage.innerHTML = `
        <h4>Storage Tips</h4>
        <ul>
          ${data.storageTips.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
      `;
      tipsSection.appendChild(storage);
    }
    
    if (data.preparationTips) {
      const preparation = document.createElement('div');
      preparation.className = 'tips-section';
      preparation.innerHTML = `
        <h4>Preparation Tips</h4>
        <ul>
          ${data.preparationTips.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
      `;
      tipsSection.appendChild(preparation);
    }
    
    resultContainer.appendChild(tipsSection);
  }
}

// Display natural remedies result
function displayRemediesResult(data) {
  const resultContainer = document.getElementById('remedies-form-result');
  if (!resultContainer) return;
  
  resultContainer.innerHTML = '';
  
  // Overview section
  const overviewSection = document.createElement('div');
  overviewSection.className = 'result-section';
  overviewSection.innerHTML = `
    <h3>Natural Remedies for ${data.condition}</h3>
    <p>${data.overview}</p>
  `;
  resultContainer.appendChild(overviewSection);
  
  // Remedies section
  const remediesSection = document.createElement('div');
  remediesSection.className = 'result-section';
  remediesSection.innerHTML = `<h3>Recommended Remedies</h3>`;
  
  // Create cards for each remedy
  const remediesGrid = document.createElement('div');
  remediesGrid.className = 'remedies-grid';
  
  data.remedies.forEach(remedy => {
    const remedyCard = document.createElement('div');
    remedyCard.className = 'remedy-card';
    remedyCard.innerHTML = `
      <h4>${remedy.name}</h4>
      <div class="remedy-type">${remedy.type}</div>
      <p>${remedy.description}</p>
      
      <h5>How to Use</h5>
      <ul class="usage-instructions">
        ${remedy.usage.map(instruction => `<li>${instruction}</li>`).join('')}
      </ul>
      
      <div class="remedy-meta">
        <div class="meta-item">
          <span class="meta-label">Effectiveness:</span>
          <span class="meta-value">${'★'.repeat(remedy.effectiveness) + '☆'.repeat(5 - remedy.effectiveness)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Evidence Level:</span>
          <span class="meta-value">${remedy.evidenceLevel}</span>
        </div>
      </div>
      
      ${remedy.cautionsAndWarnings ? `
        <div class="cautions">
          <h5>Cautions & Warnings</h5>
          <ul>
            ${remedy.cautionsAndWarnings.map(caution => `<li>${caution}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
    
    remediesGrid.appendChild(remedyCard);
  });
  
  remediesSection.appendChild(remediesGrid);
  resultContainer.appendChild(remediesSection);
  
  // Additional advice
  if (data.generalAdvice && data.generalAdvice.length > 0) {
    const adviceSection = document.createElement('div');
    adviceSection.className = 'result-section';
    adviceSection.innerHTML = `
      <h3>General Advice</h3>
      <ul class="general-advice">
        ${data.generalAdvice.map(advice => `<li>${advice}</li>`).join('')}
      </ul>
    `;
    resultContainer.appendChild(adviceSection);
  }
  
  // Medical disclaimer
  const disclaimerSection = document.createElement('div');
  disclaimerSection.className = 'result-section disclaimer';
  disclaimerSection.innerHTML = `
    <h3>Medical Disclaimer</h3>
    <p>This information is provided for educational purposes only and is not intended as medical advice or as a substitute for professional medical care. Always consult with your healthcare provider before trying any natural remedies, especially if you have a medical condition, are pregnant or nursing, or are taking medications.</p>
  `;
  resultContainer.appendChild(disclaimerSection);
}