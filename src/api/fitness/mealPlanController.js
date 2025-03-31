// src/api/fitness/mealPlanController.js
const { handleAnthropicRequest } = require('../anthropic');

const generateMealPlan = async (req, res) => {
  try {
    const {
      gender,
      age,
      weight,
      heightCm,
      activityLevel,
      goals,
      dietType,
      calorieTarget,
      mealsPerDay,
      numberOfDays,
      allergies,
      religiousPreferences
    } = req.body;
    const apiKey = req.appKey; // Use stored app key

    if (!apiKey) return res.status(401).json({ error: 'API key is required' });
    if (!goals || !dietType || !mealsPerDay || !numberOfDays) {
      return res.status(400).json({ 
        error: 'Missing required parameters: goals, dietType, mealsPerDay, numberOfDays' 
      });
    }

    const result = await handleAnthropicRequest('nutritionMealPlan', {
      gender,
      age: parseInt(age),
      weight: parseFloat(weight),
      heightCm: parseFloat(heightCm),
      activityLevel,
      goals,
      dietType,
      calorieTarget: parseInt(calorieTarget),
      mealsPerDay: parseInt(mealsPerDay),
      numberOfDays: parseInt(numberOfDays),
      allergies: allergies || [],
      religiousPreferences
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan', details: error.message });
  }
};

module.exports = { generateMealPlan };