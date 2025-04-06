// src/api/fitness/exerciseController.js
const { handleAnthropicRequest } = require('../anthropic');

const getExerciseDetails = async (req, res) => {
  console.log('Inside getExerciseDetails, Body:', req.body, 'User:', req.user);
  try {
    const { exerciseId, includeVariations } = req.body;

    if (!exerciseId) {
      console.log('Missing exerciseId in request body');
      return res.status(400).json({ error: 'Missing exerciseId' });
    }

    const result = await handleAnthropicRequest('exerciseDetails', {
      exerciseId,
      includeVariations: includeVariations === true
    });
    console.log('Anthropic result:', result);

    res.json({ data: result });
  } catch (error) {
    console.error('Error getting exercise details:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to get exercise details', details: error.message });
  }
};

module.exports = { getExerciseDetails };