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

// Prompt email verification
async function promptEmailVerification(email) {
  const verificationModal = document.createElement('div');
  verificationModal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px;">
        <h2>Verify Your Email</h2>
        <p>A verification code was sent to ${email}.</p>
        <input type="text" id="verification-code" placeholder="Enter 6-digit code" style="width: 100%; padding: 8px; margin-bottom: 10px;">
        <button id="verify-btn" style="padding: 8px 16px;">Verify</button>
        <button id="resend-btn" style="padding: 8px 16px; margin-left: 10px;">Resend Code</button>
      </div>
    </div>
  `;
  document.body.appendChild(verificationModal);

  // Send initial code
  try {
    await fetch('/fitness/api/fitness/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
  }

  document.getElementById('verify-btn').addEventListener('click', async () => {
    const codeInput = document.getElementById('verification-code');
    if (!codeInput) return;
    
    const code = codeInput.value.trim();
    if (!code.match(/^\d{6}$/)) {
      alert('Please enter a valid 6-digit code.');
      return;
    }

    try {
      const response = await fetch('/fitness/api/fitness/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(`Verification failed: ${errorText}`);
        return;
      }

      verificationModal.remove();
      console.log('Email verified for:', email);
    } catch (error) {
      console.error('Error verifying code:', error);
      alert('Error verifying code. Please try again.');
    }
  });

  document.getElementById('resend-btn').addEventListener('click', async () => {
    try {
      await fetch('/fitness/api/fitness/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      alert('New verification code sent.');
    } catch (error) {
      console.error('Error resending verification code:', error);
      alert('Error sending verification code. Please try again.');
    }
  });
}

// Fetch and validate user profile with API key
async function fetchUserProfile(apiKey) {
  try {
    const response = await fetch('/fitness/api/auth/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ apiKey })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to validate API key: ${response.status}, ${errorText}`);
      throw new Error(`Failed to validate API key: ${response.status}`);
    }
    const data = await response.json();
    userProfile = {
      plan: data.plan || 'essential',
      role: data.role || 'user',
      requestsRemaining: data.requestsRemaining || 10
    };
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    updateDropdownOptions();
    updateRequestCounter();
    console.log('User profile fetched:', userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    userProfile = { plan: 'essential', role: 'user', requestsRemaining: 10 };
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    updateDropdownOptions();
    updateRequestCounter();
  }
}

// Update request counter display
function updateRequestCounter() {
  const counter = document.getElementById('request-counter');
  if (counter) {
    counter.textContent = `Requests Remaining: ${userProfile.requestsRemaining}`;
  }
}

// Update dropdown options based on user plan
function updateDropdownOptions() {
  const daysPerWeek = document.getElementById('days_per_week');
  const planDurationWeeks = document.getElementById('plan_duration_weeks');
  const numberOfDays = document.getElementById('days');

  // Only proceed if elements exist
  if (!daysPerWeek && !planDurationWeeks && !numberOfDays) {
    return; // None of the elements exist, likely on a different page
  }

  if (userProfile.plan === 'essential' && userProfile.role !== 'admin') {
    if (daysPerWeek) {
      daysPerWeek.innerHTML = `
        <option value="">Select days</option>
        <option value="1">1 day</option>
      `;
    }
    if (planDurationWeeks) {
      planDurationWeeks.innerHTML = `
        <option value="">Select duration</option>
        <option value="1">1 week</option>
      `;
    }
    if (numberOfDays) {
      numberOfDays.innerHTML = `
        <option value="">Select number of days</option>
        <option value="1">1 day</option>
      `;
    }
  } else {
    if (daysPerWeek) {
      daysPerWeek.innerHTML = `
        <option value="">Select days</option>
        <option value="1">1 day</option>
        <option value="2">2 days</option>
        <option value="3">3 days</option>
        <option value="4">4 days</option>
        <option value="5">5 days</option>
        <option value="6">6 days</option>
        <option value="7">7 days</option>
      `;
    }
    if (planDurationWeeks) {
      planDurationWeeks.innerHTML = `
        <option value="">Select duration</option>
        <option value="1">1 week</option>
        <option value="2">2 weeks</option>
        <option value="3">3 weeks</option>
      `;
    }
    if (numberOfDays) {
      numberOfDays.innerHTML = `
        <option value="">Select number of days</option>
        <option value="1">1 day</option>
        <option value="3">3 days</option>
        <option value="7">7 days</option>
        <option value="14">14 days</option>
      `;
    }
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
      if (!data.days || !Array.isArray(data.days)) return '<p>Invalid workout plan data structure.</p>';
      html = `<div class="result-card">
        <h2 class="result-title-large">${data.goal || 'Workout Plan'}</h2>
        <table class="result-table">
          <thead><tr><th>Day</th><th>Exercise</th><th>Sets</th><th>Reps</th><th>Rest</th><th>Muscle Group</th></tr></thead>
          <tbody>`;
      data.days.forEach(day => {
        if (day.exercises && Array.isArray(day.exercises)) {
          day.exercises.forEach(ex => {
            html += `<tr><td>${day.day || 'Day'}</td><td>${ex.name || 'Exercise'}</td><td>${ex.sets || 'N/A'}</td><td>${ex.reps || 'N/A'}</td><td>${ex.rest || 'N/A'}</td><td>${ex.muscleGroup || 'N/A'}</td></tr>`;
          });
        }
        if (day.warmup && Array.isArray(day.warmup)) {
          day.warmup.forEach(w => {
            html += `<tr><td>${day.day || 'Day'}</td><td>${w.name || 'Warmup'} (Warmup)</td><td colspan="3">${w.duration || 'N/A'}</td><td>${w.muscleGroup || 'N/A'}</td></tr>`;
          });
        }
        if (day.cooldown && Array.isArray(day.cooldown)) {
          day.cooldown.forEach(c => {
            html += `<tr><td>${day.day || 'Day'}</td><td>${c.name || 'Cooldown'} (Cooldown)</td><td colspan="3">${c.duration || 'N/A'}</td><td>${c.muscleGroup || 'N/A'}</td></tr>`;
          });
        }
      });
      html += `</tbody></table>
        <div class="result-summary">
          <h3>Summary</h3>
          <table class="summary-table">
            <tr><th>Goal</th><td>${data.goal || 'N/A'}</td></tr>
            <tr><th>Fitness Level</th><td>${data.fitnessLevel || 'N/A'}</td></tr>
            <tr><th>Body Focus</th><td>${data.bodyFocus || 'N/A'}</td></tr>
            <tr><th>Days/Week</th><td>${data.daysPerWeek || 'N/A'}</td></tr>
            <tr><th>Weeks</th><td>${data.weeks || 'N/A'}</td></tr>
          </table>
        </div></div>`;
      break;
      
    case 'exerciseDetails':
      if (!data.name) return '<p>Invalid exercise details data structure.</p>';
      html = `<div class="result-card">
        <h2 class="result-title-large">${data.name}</h2>
        <p><strong>Muscle Groups:</strong> ${Array.isArray(data.muscle_groups) ? data.muscle_groups.join(', ') : (data.muscle_groups || 'N/A')}</p>
        <p><strong>Equipment:</strong> ${Array.isArray(data.equipment_needed) ? data.equipment_needed.join(', ') : (data.equipment_needed || 'N/A')}</p>
        <p><strong>Instructions:</strong> <ol>${Array.isArray(data.steps) ? data.steps.map(step => `<li>${step}</li>`).join('') : (data.steps || 'N/A')}</ol></p>
        <p><strong>Difficulty:</strong> ${data.difficulty || 'N/A'}</p>
        <p><strong>Tips:</strong> <ul>${Array.isArray(data.tips) ? data.tips.map(tip => `<li>${tip}</li>`).join('') : '<li>No tips available</li>'}</ul></p>
        ${data.variations && Array.isArray(data.variations) ? `<p><strong>Variations:</strong> <ul>${data.variations.map(v => `<li>${v.name}: ${v.description} (${v.difficulty})</li>`).join('')}</ul></p>` : ''}</div>`;
      break;
      
    // All other cases remain the same...
    case 'nutritionMealPlan':
      if (!data.macros || !data.mealPlan || !Array.isArray(data.mealPlan)) return '<p>Invalid nutrition meal plan data structure.</p>';
      html = `<div class="result-card">
        <h2 class="result-title-large">Nutrition & Meal Plan</h2>
        <p><strong>Macros:</strong> Protein: ${data.macros.protein || 0}g, Fat: ${data.macros.fat || 0}g, Carbs: ${data.macros.carbs || 0}g, Total: ${data.macros.calories || 0}kcal</p>`;
      if (Array.isArray(data.mealPlan)) {
        html += data.mealPlan.map(day => {
          if (!day.meals || !Array.isArray(day.meals)) return '';
          return `<div class="result-table-container">
            <table class="result-table">
              <thead><tr><th colspan="6">Day ${day.day || 'N/A'}</th></tr><tr><th>Meal</th><th>Food</th><th>Calories</th><th>Protein (g)</th><th>Fat (g)</th><th>Carbs (g)</th></tr></thead>
              <tbody>
                ${day.meals.map(meal => `
                  <tr>
                    <td>${meal.name || 'Meal'}</td>
                    <td>${Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : (meal.ingredients || 'N/A')}</td>
                    <td>${meal.nutrition?.calories || 0}</td>
                    <td>${meal.nutrition?.protein || 0}</td>
                    <td>${meal.nutrition?.fat || 0}</td>
                    <td>${meal.nutrition?.carbs || 0}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
        }).join('');
      }
      html += `<div class="pie-chart-container"><canvas id="nutrition-chart"></canvas></div></div>`;
      break;
      
    case 'analyzeFoodPlate':
      if (!data.foods || !Array.isArray(data.foods)) return '<p>Invalid food plate analysis data structure.</p>';
      const getQualityClass = (foodName) => {
        const highQuality = ['tallow', 'lard', 'butter', 'ghee', 'olive oil', 'avocado oil', 'mixed berries'];
        const lowQuality = ['vegetable oil', 'canola oil', 'sunflower oil', 'soybean oil', 'corn oil', 'wheat', 'corn', 'cane sugar', 'gmo'];
        foodName = foodName.toLowerCase();
        if (highQuality.some(item => foodName.includes(item))) return { class: 'quality-high', label: 'High Quality' };
        if (lowQuality.some(item => foodName.includes(item)) || foodName.includes('pancakes')) return { class: 'quality-low', label: 'Low Quality' };
        return { class: 'quality-medium', label: 'Medium Quality' };
      };
      html = `<div class="result-card">
        <h2 class="result-title-large">${data.title || 'Food Plate Analysis'}</h2>
        <table class="result-table">
          <thead><tr><th>Food</th><th>Calories</th><th>Protein (g)</th><th>Fat (g)</th><th>Carbs (g)</th><th>Quality</th></tr></thead>
          <tbody>
            ${data.foods.map(food => {
              const quality = getQualityClass(food.name);
              return `
                <tr>
                  <td><span class="quality-marker ${quality.class}"></span>${food.name || 'Food'}</td>
                  <td>${food.calories || 0}</td>
                  <td>${food.protein || 0}</td>
                  <td>${food.fat || 0}</td>
                  <td>${food.carbs || 0}</td>
                  <td>${quality.label}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="pie-chart-container"><canvas id="food-chart"></canvas></div>
      </div>`;
      break;
      
    case 'foodIngredientDirectory':
      if (!data.name) return '<p>Invalid food ingredient data structure.</p>';
      html = `
        <div class="ingredient-card">
          <div class="card-header">
            <h3>${data.name || 'Ingredient'}</h3>
          </div>
          <div class="tag-section">
            <span class="ingredient-tag category">${data.category || 'N/A'}</span>
            <span class="ingredient-tag origin">${data.origin || 'N/A'}</span>
            <span class="ingredient-tag safety">${data.safety_rating || 'N/A'}</span>
          </div>
          <div class="main-info" style="padding: 15px 20px;">
            <p><strong>Definition:</strong> ${data.definition || 'N/A'}</p>
            <p><strong>In Plain English:</strong> ${data.layman_term || 'N/A'}</p>
            <p><strong>Production:</strong> ${data.production_process || 'N/A'}</p>
            <p><strong>Common Uses:</strong> ${data.example_use || 'N/A'}</p>
            ${data.health_insights ? `<p><strong>Health Insights:</strong> ${data.health_insights}</p>` : ''}
            ${data.nutritional_profile ? `<p><strong>Nutritional Profile:</strong> ${data.nutritional_profile}</p>` : ''}
            ${data.commonly_found_in ? `<p><strong>Commonly Found In:</strong> ${data.commonly_found_in}</p>` : ''}
            ${data.aliases ? `<p><strong>Also Known As:</strong> ${Array.isArray(data.aliases) ? data.aliases.join(', ') : data.aliases}</p>` : ''}
          </div>
        </div>`;
      break;
      
    case 'naturalRemedies':
      if (!data.remedies || !Array.isArray(data.remedies)) return '<p>Invalid natural remedies data structure.</p>';
      html = `<div class="result-card">
        <h2 class="result-title-large">Natural Remedies</h2>
        ${data.remedies.map(remedy => {
          if (!remedy) return '';
          return `<div class="remedy-card">
            <div class="remedy-header">
              <div class="remedy-title">${remedy.name || 'Remedy'}</div>
            </div>
            <div class="remedy-body">
              <div class="remedy-section">
                <span class="remedy-section-title">Description:</span>
                <p>${remedy.description || 'N/A'}</p>
              </div>
              <div class="remedy-section">
                <span class="remedy-section-title">Preparation:</span>
                <p>${remedy.preparation || 'N/A'}</p>
              </div>
              <div class="remedy-section">
                <span class="remedy-section-title">Benefits:</span>
                <p>${remedy.benefits || 'N/A'}</p>
              </div>
            </div>
          </div>`;
        }).join('')}
        ${data.disclaimer ? `<p class="disclaimer"><strong>Disclaimer:</strong> ${data.disclaimer}</p>` : ''}
      </div>`;
      break;
      
    default:
      html = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
  return html;
}

// Render pie charts for nutrition and food plate results
function renderCharts(result, endpoint, container) {
  if (!result || !container) return;
  const data = result.data || result;
  if (!data) return;
  
  if (endpoint === 'nutritionMealPlan' && data.macros) {
    const canvas = container.querySelector('#nutrition-chart');
    if (!canvas) return;
    
    try {
      new Chart(canvas, {
        type: 'pie',
        data: {
          labels: ['Protein', 'Fat', 'Carbs'],
          datasets: [{
            data: [
              (data.macros.protein || 0) * 4,
              (data.macros.fat || 0) * 9,
              (data.macros.carbs || 0) * 4
            ],
            backgroundColor: ['#28a745', '#dc3545', '#ffc107']
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    } catch (error) {
      console.error('Error rendering nutrition chart:', error);
    }
  } else if (endpoint === 'analyzeFoodPlate' && data.foods && Array.isArray(data.foods)) {
    const canvas = container.querySelector('#food-chart');
    if (!canvas) return;
    
    try {
      const protein = data.foods.reduce((sum, f) => sum + (f.protein || 0) * 4, 0);
      const fat = data.foods.reduce((sum, f) => sum + (f.fat || 0) * 9, 0);
      const carbs = data.foods.reduce((sum, f) => sum + (f.carbs || 0) * 4, 0);
      
      new Chart(canvas, {
        type: 'pie',
        data: {
          labels: ['Protein', 'Fat', 'Carbs'],
          datasets: [{
            data: [protein, fat, carbs],
            backgroundColor: ['#28a745', '#dc3545', '#ffc107']
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    } catch (error) {
      console.error('Error rendering food chart:', error);
    }
  }
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
    const unitSystem = unitSystemSelect ? unitSystemSelect.value : 'metric';

    if (userProfile.requestsRemaining <= 0 && userProfile.role !== 'admin') {
      resultContainer.classList.add('visible');
      resultContent.innerHTML = "<p>You've hit your monthly request limit. Upgrade your plan for more!</p><button onclick=\"window.location.href='/fitness/subscribe'\">Upgrade Now</button>";
      statusBadge.textContent = 'Limit Exceeded';
      statusBadge.className = 'status-badge status-error';
      return;
    }

    resultContainer.classList.add('visible');
    resultContent.innerHTML = '<p>Loading...</p>';
    statusBadge.textContent = 'Processing';
    statusBadge.className = 'status-badge';

    try {
      let response;
      let result;
      
      if (formId === 'food-form') {
        response = await fetch('/fitness/api/fitness/food-plate', {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: formData
        });
      } else {
        const jsonData = {};
        if (formId === 'workout-form') {
          const preferences = Array.from(form.querySelectorAll('input[name="preferences"]:checked')).map(el => el.value);
          const muscleGroups = Array.from(form.querySelectorAll('input[name="muscleGroups"]:checked')).map(el => el.value);
          const bodyFocus = formData.get('bodyFocus');
          let daysPerWeek = formData.get('daysPerWeek');
          let planDurationWeeks = formData.get('planDurationWeeks');
          
          if (userProfile.plan === 'essential' && userProfile.role !== 'admin') {
            daysPerWeek = '1';
            planDurationWeeks = '1';
          }
          
          jsonData.goals = formData.get('goals');
          jsonData.fitnessLevel = formData.get('fitnessLevel');
          jsonData.preferences = preferences;
          jsonData.bodyFocus = bodyFocus || 'any';
          jsonData.muscleGroups = muscleGroups;
          jsonData.includeWarmupCooldown = formData.get('includeWarmupCooldown') === 'true';
          jsonData.daysPerWeek = parseInt(daysPerWeek);
          jsonData.sessionDuration = parseInt(formData.get('sessionDuration'));
          jsonData.planDurationWeeks = parseInt(planDurationWeeks);
          
          response = await fetch('/fitness/api/fitness/workout', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
          });
        } else if (formId === 'exercise-form') {
          jsonData.exerciseId = formData.get('exerciseId');
          jsonData.includeVariations = formData.get('includeVariations') === 'true';
          
          response = await fetch('/fitness/api/fitness/exercise', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
          });
        } else if (formId === 'nutrition-meal-form') {
          let weight = parseFloat(formData.get('weight'));
          let heightCm;
          if (unitSystem === 'imperial') {
            weight *= LB_TO_KG;
            const heightFeetElem = document.getElementById('height_feet');
            const heightInchesElem = document.getElementById('height_inches');
            if (heightFeetElem && heightInchesElem) {
              heightCm = (parseFloat(heightFeetElem.value) * 12 + parseFloat(heightInchesElem.value)) * IN_TO_CM;
            }
          } else {
            const heightCmElem = document.getElementById('height_cm');
            if (heightCmElem) {
              heightCm = parseFloat(heightCmElem.value);
            }
          }
          const allergies = Array.from(form.querySelectorAll('input[name="allergies"]:checked')).map(el => el.value);
          let numberOfDays = formData.get('numberOfDays');
          
          if (userProfile.plan === 'essential' && userProfile.role !== 'admin') {
            numberOfDays = '1';
          }
          
          jsonData.goals = formData.get('goals');
          jsonData.dietType = formData.get('dietType');
          jsonData.gender = formData.get('gender');
          jsonData.age = parseInt(formData.get('age'));
          jsonData.weight = weight;
          jsonData.heightCm = heightCm;
          jsonData.activityLevel = formData.get('activityLevel');
          jsonData.allergies = allergies;
          jsonData.religiousPreferences = formData.get('religiousPreferences') || 'none';
          jsonData.calorieTarget = parseInt(formData.get('calorieTarget'));
          jsonData.mealsPerDay = parseInt(formData.get('mealsPerDay'));
          jsonData.numberOfDays = parseInt(numberOfDays);
          
          response = await fetch('/fitness/api/fitness/meal-plan', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
          });
        } else if (formId === 'food-ingredient-directory-form') {
          jsonData.ingredient = formData.get('ingredient');
          
          response = await fetch('/fitness/api/fitness/food-ingredient', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
          });
        } else if (formId === 'natural-remedies-form') {
          jsonData.symptom = formData.get('symptom');
          jsonData.approach = formData.get('approach');
          
          response = await fetch('/fitness/api/fitness/natural-remedies', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
          });
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status}, ${errorText}`);
      }
      
      result = await response.json();
      console.log('API response:', result);
      
      if (!result) throw new Error('Empty response from API');
      if (result.error) throw new Error(result.error.message || 'API returned an error');
      
      resultContent.innerHTML = formatResult(result, endpoint);
      statusBadge.textContent = 'Success';
      statusBadge.className = 'status-badge status-success';
      
      if (userProfile.role !== 'admin') {
        userProfile.requestsRemaining--;
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        updateRequestCounter();
      }
      
      if (response.ok && (endpoint === 'nutritionMealPlan' || endpoint === 'analyzeFoodPlate')) {
        setTimeout(() => renderCharts(result, endpoint, resultContent), 100);
      }
    } catch (error) {
      console.error('Error:', error);
      resultContent.innerHTML = `<p>Error: ${error.message}</p>`;
      statusBadge.textContent = 'Error';
      statusBadge.className = 'status-badge status-error';
    }
  });
}

// Copy result to clipboard - only attach if function exists
function copyResult(resultId) {
  const resultElement = document.getElementById(resultId);
  if (!resultElement) return;
  
  const content = resultElement.querySelector('.result-content')?.innerText || '';
  
  navigator.clipboard.writeText(content).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}

// Print result - only if print is available
function printResult(resultId) {
  const resultElement = document.getElementById(resultId);
  if (!resultElement) return;
  
  const content = resultElement.querySelector('.result-content')?.innerHTML || '';
  
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #1ECBE1; color: white; }
              .quality-marker { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
              .quality-high { background-color: #28a745; }
              .quality-medium { background-color: #ffc107; }
              .quality-low { background-color: #dc3545; }
              .remedy-card { margin-bottom: 20px; border: 1px solid #eee; }
              .remedy-header { background-color: #f0ebff; padding: 10px; }
              .remedy-title { color: #6b48ff; }
              .ingredient-card { margin-bottom: 20px; border: 1px solid #eee; }
              .card-header { background-color: #f9f9f9; padding: 10px; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  } catch (error) {
    console.error('Print error:', error);
    alert('Unable to print. Please try again later.');
  }
}

// Initialize form listeners - only for forms that exist
const formEndpoints = [
  { formId: 'workout-form', resultId: 'workout-result', endpoint: 'generateWorkoutPlan' },
  { formId: 'exercise-form', resultId: 'exercise-result', endpoint: 'exerciseDetails' },
  { formId: 'nutrition-meal-form', resultId: 'nutrition-meal-result', endpoint: 'nutritionMealPlan' },
  { formId: 'food-form', resultId: 'food-result', endpoint: 'analyzeFoodPlate' },
  { formId: 'food-ingredient-directory-form', resultId: 'food-ingredient-directory-result', endpoint: 'foodIngredientDirectory' },
  { formId: 'natural-remedies-form', resultId: 'natural-remedies-result', endpoint: 'naturalRemedies' }
];

formEndpoints.forEach(({ formId, resultId, endpoint }) => {
  if (document.getElementById(formId) && document.getElementById(resultId)) {
    handleFormSubmit(formId, resultId, endpoint);
  }
});

// DOMContentLoaded initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM fully loaded and scripts initialized');
  
  // Initialize Stripe - but handle possible errors
  await initializeStripe();
  
  // Tab navigation setup - only if tabs exist
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  const sidebarItems = document.querySelectorAll('.tab-trigger');
  
  if (tabs.length > 0 && contents.length > 0) {
    console.log('Found tabs:', tabs.length);
    console.log('Found contents:', contents.length);
    
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        console.log('Tab clicked:', tab.dataset.tab, 'Index:', index);
        
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const content = document.getElementById(`${tab.dataset.tab}-tab`);
        if (content) {
          content.classList.add('active');
          console.log('Activated content:', `${tab.dataset.tab}-tab`);
        } else {
          console.error('Content not found for tab:', `${tab.dataset.tab}-tab`);
        }
        
        sidebarItems.forEach(item => {
          item.classList.remove('active');
          if (item.dataset.tab === tab.dataset.tab) item.classList.add('active');
        });
      });
    });
  }

  if (sidebarItems.length > 0) {
    sidebarItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Sidebar item clicked:', item.dataset.tab);
        sidebarItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        tabs.forEach(t => {
          t.classList.remove('active');
          if (t.dataset.tab === item.dataset.tab) t.classList.add('active');
        });
        contents.forEach(c => {
          c.classList.remove('active');
          if (c.id === `${item.dataset.tab}-tab`) c.classList.add('active');
        });
      });
    });
  }

  // Remaining initialization - only attach listeners if elements exist
  const apiKeyInput = document.getElementById('api-key');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const modal = document.getElementById('subscription-modal');
  const monthlyToggle = document.getElementById('monthly-toggle');
  const yearlyToggle = document.getElementById('yearly-toggle');
  const monthlyPlans = document.getElementById('monthly-plans');
  const yearlyPlans = document.getElementById('yearly-plans');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const foodImageInput = document.getElementById('food_image');
  const foodImagePreview = document.getElementById('food-image-preview');

  const savedApiKey = localStorage.getItem('apiKey');
  const savedEmail = localStorage.getItem('userEmail');
  
  // Check authentication and email verification
  if (savedApiKey && savedEmail) {
    try {
      const response = await fetch('/fitness/api/fitness/check-email-verified', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': savedApiKey 
        },
        body: JSON.stringify({ email: savedEmail })
      });

      if (response.ok) {
        const { verified } = await response.json();
        if (!verified) {
          await promptEmailVerification(savedEmail);
        } else {
          await fetchUserProfile(savedApiKey);
        }
      } else {
        console.error('Error checking email verification:', await response.text());
        await promptEmailVerification(savedEmail);
      }
    } catch (error) {
      console.error('Error during authentication check:', error);
    }
  } else if (savedApiKey) {
    await fetchUserProfile(savedApiKey);
  }

  // API key save button
  if (apiKeyInput && saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        localStorage.setItem('apiKey', apiKey);
        await fetchUserProfile(apiKey);
        alert('API Key saved successfully!');
      } else {
        alert('Please enter a valid API Key.');
      }
    });
  }

  // Unit system toggle
  if (unitSystemSelect) {
    const imperialHeight = document.querySelector('.imperial-height');
    const metricHeight = document.querySelector('.metric-height');
    const weightLabel = document.getElementById('weight-label');
    const heightFeet = document.getElementById('height_feet');
    const heightInches = document.getElementById('height_inches');
    const heightCm = document.getElementById('height_cm');
    
    if (imperialHeight && metricHeight && weightLabel && heightFeet && heightInches && heightCm) {
      unitSystemSelect.addEventListener('change', () => {
        const isImperial = unitSystemSelect.value === 'imperial';
        imperialHeight.style.display = isImperial ? 'block' : 'none';
        metricHeight.style.display = isImperial ? 'none' : 'block';
        weightLabel.textContent = isImperial ? 'Weight (lbs):' : 'Weight (kg):';
        heightFeet.required = isImperial;
        heightInches.required = isImperial;
        heightCm.required = !isImperial;
      });
    }
  }

  // Monthly/yearly toggle for subscription plans
  if (monthlyToggle && yearlyToggle && monthlyPlans && yearlyPlans) {
    monthlyToggle.addEventListener('click', () => {
      monthlyToggle.classList.add('active');
      yearlyToggle.classList.remove('active');
      monthlyPlans.style.display = 'flex';
      yearlyPlans.style.display = 'none';
    });

    yearlyToggle.addEventListener('click', () => {
      yearlyToggle.classList.add('active');
      monthlyToggle.classList.remove('active');
      yearlyPlans.style.display = 'flex';
      monthlyPlans.style.display = 'none';
    });
  }

  // Mobile menu toggle
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      menuToggle.textContent = sidebar.classList.contains('collapsed') ? '☰' : '✕';
    });
  }

  // Subscription button handlers
  const subscribeButtons = [
    document.getElementById('sidebar-subscribe-btn'),
    document.getElementById('auth-subscribe-btn')
  ];
  
  subscribeButtons.forEach(btn => {
    if (btn && modal) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        modal.style.display = 'block';
      });
    }
  });

  // Modal close button
  const closeButton = document.querySelector('.close');
  if (closeButton && modal) {
    closeButton.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', e => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  // Plan selection buttons
  document.querySelectorAll('.plan-select-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const planId = btn.dataset.plan.toLowerCase();
      console.log('Plan selected:', planId);

      const validPlans = ['essential', 'essential-yearly', 'core', 'core-yearly', 'elite', 'elite-yearly', 'ultimate', 'ultimate-yearly'];
      if (!validPlans.includes(planId)) {
        console.error(`Invalid plan: ${planId}`);
        alert(`Invalid plan: ${planId}. Please select a valid plan.`);
        return;
      }

      const emailInput = document.getElementById('user-email');
      if (!emailInput) {
        console.error('Email input field not found');
        alert('Email input field not found. Please refresh the page and try again.');
        return;
      }
      
      const email = emailInput.value.trim();
      if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
        alert('Please enter a valid email address.');
        return;
      }
      
      if (disposableEmailDomains.some(domain => email.toLowerCase().endsWith(`@${domain}`))) {
        alert('Disposable email addresses are not allowed. Please use a permanent email.');
        return;
      }

      if (planId.startsWith('essential')) {
        try {
          const response = await fetch('/fitness/api/fitness/activate-free-plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ planId, email })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to activate free plan: ${response.status}, ${errorText}`);
          }

          const data = await response.json();
          localStorage.setItem('apiKey', data.apiKey);
          userProfile.plan = data.plan || 'essential';
          userProfile.requestsRemaining = data.requestsRemaining || 10;
          userProfile.role = data.role || 'user';
          localStorage.setItem('userProfile', JSON.stringify(userProfile));
          localStorage.setItem('userEmail', email);
          updateDropdownOptions();
          updateRequestCounter();
          if (modal) modal.style.display = 'none';
          console.log('Essential plan activated:', data);
          await promptEmailVerification(email);
          window.location.href = '/fitness/subscribe?plan=essential';
        } catch (error) {
          console.error('Error activating essential plan:', error);
          alert(`Failed to activate Essential plan: ${error.message}`);
        }
        return;
      }

      if (typeof stripe === 'undefined') {
        console.error('Stripe.js not loaded');
        alert('Payment system failed to load. Please disable ad blockers and try again or check your connection.');
        return;
      }

      async function attemptCheckout(attempt = 1) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch('/fitness/api/fitness/create-checkout-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ planId, email }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          const responseText = await response.text();
          console.log(`Attempt ${attempt} - Fetch response: ${response.status}, ${responseText}`);

          if (!response.ok) {
            let errorData;
            try {
              errorData = JSON.parse(responseText);
            } catch {
              throw new Error(`Server error: ${response.status}, ${responseText}`);
            }
            if (response.status === 400) {
              throw new Error(`Invalid request: ${errorData.error || responseText}`);
            } else {
              throw new Error(`Server error: ${response.status}, ${errorData.error || responseText}`);
            }
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (error) {
            throw new Error(`Invalid JSON response: ${responseText}`);
          }
          
          console.log(`Attempt ${attempt} - Checkout session response:`, data);

          if (!data.id) {
            throw new Error('No session ID returned from server');
          }

          localStorage.setItem('userEmail', email);
          const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
          if (error) {
            console.error('Stripe redirect error details:', error);
            throw new Error(`Stripe redirect error: ${error.message} (Code: ${error.code || 'N/A'}, Type: ${error.type || 'N/A'})`);
          }
        } catch (error) {
          console.error(`Attempt ${attempt} - Error creating checkout session:`, error);
          if (attempt < 3 && error.name !== 'AbortError') {
            console.log(`Retrying checkout session creation (attempt ${attempt + 1})...`);
            return attemptCheckout(attempt + 1);
          }
          let userMessage = 'Something went wrong. ';
          if (error.name === 'AbortError') {
            userMessage += 'Request timed out. Please check your network and try again.';
          } else if (error.message.includes('Invalid request')) {
            userMessage += `Invalid plan selection: ${error.message}. Please try another plan or contact support.`;
          } else if (error.message.includes('Stripe redirect error')) {
            userMessage += `Payment provider error: ${error.message}. Please disable ad blockers, ensure a stable network, and try again.`;
          } else {
            userMessage += 'An unexpected error occurred. Please try again or contact support.';
          }
          alert(userMessage);
        }
      }

      await attemptCheckout();
    });
  });

  // Food image preview
  if (foodImageInput && foodImagePreview) {
    foodImageInput.addEventListener('change', () => {
      const file = foodImageInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          foodImagePreview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; height: auto; margin-top: 10px; border-radius: 8px;" alt="Food Preview" />`;
        };
        reader.readAsDataURL(file);
      } else {
        foodImagePreview.innerHTML = '';
      }
    });
  }

  // Handle retry subscription from /fitness/subscribe
  document.addEventListener('openSubscriptionModal', () => {
    if (modal) {
      modal.style.display = 'block';
      console.log('Subscription modal opened via retry button');
    } else {
      console.warn('Subscription modal not found, redirecting to /fitness');
      window.location.href = '/fitness';
    }
  });
});