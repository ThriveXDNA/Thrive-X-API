// src/api/fitness/mealPlanController.js
const { handleAnthropicRequest } = require('../anthropic');

const generateMealPlan = async (req, res) => {
  console.log('Inside generateMealPlan, Body:', req.body, 'User:', req.user);
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

    if (!goals || !dietType || !mealsPerDay || !numberOfDays) {
      console.log('Missing required parameters');
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
    console.log('Anthropic result:', result);

    res.json({ data: result });
  } catch (error) {
    console.error('Error generating meal plan:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate meal plan', details: error.message });
  }
};

module.exports = { generateMealPlan };