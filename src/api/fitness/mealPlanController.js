// controllers/mealPlanController.js
const mealPlanService = require('../services/mealPlanService');

const generateCustomMealPlan = (req, res) => {
  try {
    const { 
      goal, 
      fitness_level, 
      dietary_preferences, 
      health_conditions,
      meals_per_day,
      plan_duration_days,
      custom_goals,
      carnivore_focus = false,
      lang = 'en' 
    } = req.body;

    // Validate required parameters
    if (!goal || !dietary_preferences || !meals_per_day) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide goal, dietary_preferences, and meals_per_day.' 
      });
    }

    // Generate meal plan using the service
    const mealPlan = mealPlanService.generateCustomMealPlan(
      goal,
      fitness_level,
      dietary_preferences,
      health_conditions,
      meals_per_day,
      plan_duration_days,
      custom_goals,
      carnivore_focus,
      lang
    );

    res.json({ result: mealPlan });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
};

module.exports = {
  generateCustomMealPlan
};