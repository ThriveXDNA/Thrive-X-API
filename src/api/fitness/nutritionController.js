// controllers/nutritionController.js
const nutritionService = require('../services/nutritionService');

const getNutritionAdvice = (req, res) => {
  try {
    const { 
      goal, 
      dietary_restrictions, 
      current_weight, 
      target_weight, 
      daily_activity_level,
      include_carnivore_options = false,
      lang = 'en' 
    } = req.body;

    // Validate required parameters
    if (!goal || !current_weight || !daily_activity_level) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide goal, current_weight, and daily_activity_level.' 
      });
    }

    // Get nutrition advice using the service
    const nutritionAdvice = nutritionService.getNutritionAdvice(
      goal, 
      dietary_restrictions, 
      current_weight, 
      target_weight, 
      daily_activity_level,
      include_carnivore_options,
      lang
    );

    res.json({ result: nutritionAdvice });
  } catch (error) {
    console.error('Error generating nutrition advice:', error);
    res.status(500).json({ error: 'Failed to generate nutrition advice' });
  }
};

const getCarnivoreTips = (req, res) => {
  try {
    const { 
      experience_level = 'beginner', 
      health_conditions = [], 
      specific_concerns = [],
      lang = 'en' 
    } = req.body;

    // Get carnivore diet tips using the service
    const carnivoreTips = nutritionService.getCarnivoreTips(
      experience_level,
      health_conditions,
      specific_concerns,
      lang
    );

    res.json({ result: carnivoreTips });
  } catch (error) {
    console.error('Error generating carnivore tips:', error);
    res.status(500).json({ error: 'Failed to generate carnivore diet tips' });
  }
};

module.exports = {
  getNutritionAdvice,
  getCarnivoreTips
};