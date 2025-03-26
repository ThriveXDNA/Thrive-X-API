// src/public/js/tester.js
document.addEventListener('DOMContentLoaded', function() {
  // Food Analysis Form
  const analyzeForm = document.getElementById('analyze-form');
  if (analyzeForm) {
      analyzeForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const resultEl = document.getElementById('result');
          resultEl.textContent = 'Processing...';
          
          const foods = document.getElementById('foods').value.split(',').map(f => f.trim());
          const userId = document.getElementById('user-id').value;
          
          try {
              const response = await fetch('/api/v1/ai/analyze', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      foods,
                      userId
                  })
              });
              
              const result = await response.json();
              resultEl.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
              console.error('Error:', error);
              resultEl.textContent = `Error: ${error.message}`;
          }
      });
  }
  
  // Review Form
  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
      reviewForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const resultEl = document.getElementById('review-result');
          resultEl.textContent = 'Processing...';
          
          const formData = {
              userId: document.getElementById('review-user-id').value,
              productId: document.getElementById('product-id').value,
              rating: parseInt(document.getElementById('rating').value),
              reviewText: document.getElementById('review-text').value,
              preparationMethod: [document.getElementById('preparation').value],
              dietaryPractices: [document.getElementById('dietary').value]
          };
          
          try {
              const response = await fetch('/api/v1/reviews', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(formData)
              });
              
              const result = await response.json();
              resultEl.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
              console.error('Error:', error);
              resultEl.textContent = `Error: ${error.message}`;
          }
      });
  }
  
  // Meal Plan Form
  const mealPlanForm = document.getElementById('meal-plan-form');
  if (mealPlanForm) {
      mealPlanForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const resultEl = document.getElementById('meal-plan-result');
          resultEl.textContent = 'Processing...';
          
          const formData = {
              userId: document.getElementById('plan-user-id').value,
              days: parseInt(document.getElementById('plan-days').value),
              preference: document.getElementById('plan-preference').value,
              goal: document.getElementById('plan-goal').value
          };
          
          try {
              const response = await fetch('/api/v1/ai/meal-plan', {
                  method: 'GET',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  // Convert to query params
                  url: `/api/v1/ai/meal-plan?userId=${formData.userId}&preferences=${formData.preference}&days=${formData.days}&goal=${formData.goal}`
              });
              
              const result = await response.json();
              resultEl.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
              console.error('Error:', error);
              resultEl.textContent = `Error: ${error.message}`;
          }
      });
  }
  
  // Food Plate Analysis Form
  const plateForm = document.getElementById('plate-form');
  if (plateForm) {
      plateForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const resultEl = document.getElementById('plate-result');
          resultEl.textContent = 'Processing...';
          
          const foods = document.getElementById('plate-foods').value.split(',').map(f => f.trim());
          const userId = document.getElementById('plate-user-id').value;
          const mealType = document.getElementById('meal-type').value;
          const analysisDepth = document.getElementById('analysis-depth').value;
          
          try {
              const response = await fetch('/api/v1/ai/analyze', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      foods,
                      userId,
                      mealType,
                      analysisDepth
                  })
              });
              
              const result = await response.json();
              resultEl.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
              console.error('Error:', error);
              resultEl.textContent = `Error: ${error.message}`;
          }
      });
  }
});