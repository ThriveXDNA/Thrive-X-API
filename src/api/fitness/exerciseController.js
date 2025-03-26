// controllers/exerciseController.js
const exerciseService = require('../services/exerciseService');

const getExerciseDetails = (req, res) => {
  try {
    const { exercise_name, lang = 'en' } = req.body;

    // Validate required parameters
    if (!exercise_name) {
      return res.status(400).json({ 
        error: 'Missing required parameter. Please provide exercise_name.' 
      });
    }

    // Get exercise details using the service
    const exerciseDetails = exerciseService.getExerciseDetails(exercise_name, lang);
    
    res.json({ result: exerciseDetails });
  } catch (error) {
    console.error('Error getting exercise details:', error);
    res.status(500).json({ error: 'Failed to get exercise details' });
  }
};

module.exports = {
  getExerciseDetails
};