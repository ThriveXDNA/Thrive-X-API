// src/api/fitness/exerciseController.js
const { handleAnthropicRequest } = require('../anthropic');

const getExerciseDetails = async (req, res) => {
  try {
    const { exerciseId, includeVariations } = req.body; // Match scripts.js keys
    const apiKey = req.appKey;

    if (!apiKey) return res.status(401).json({ error: 'API key is required' });
    if (!exerciseId) return res.status(400).json({ error: 'Missing exercise_name' });

    const result = await handleAnthropicRequest('exerciseDetails', {
      exerciseId,
      includeVariations: includeVariations === true // Normalize to boolean
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error getting exercise details:', error);
    res.status(500).json({ error: 'Failed to get exercise details', details: error.message });
  }
};

module.exports = { getExerciseDetails };