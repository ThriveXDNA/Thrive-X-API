// controllers/workoutController.js
const workoutService = require('../services/workoutService');

const generateWorkoutPlan = (req, res) => {
  try {
    const { 
      goal, 
      fitness_level, 
      preferences, 
      health_conditions, 
      schedule, 
      plan_duration_weeks,
      diet_preference,
      lang = 'en' 
    } = req.body;

    // Validate required parameters
    if (!goal || !fitness_level || !schedule) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide goal, fitness_level, and schedule.' 
      });
    }

    // Generate workout plan using the service
    const workoutPlan = workoutService.generateWorkoutPlan(
      goal, 
      fitness_level, 
      preferences, 
      health_conditions, 
      schedule, 
      plan_duration_weeks, 
      diet_preference,
      lang
    );

    res.json({ result: workoutPlan });
  } catch (error) {
    console.error('Error generating workout plan:', error);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
};

module.exports = {
  generateWorkoutPlan
};