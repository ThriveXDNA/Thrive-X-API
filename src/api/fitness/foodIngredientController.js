// src/api/fitness/foodIngredientController.js
const { handleAnthropicRequest } = require('../anthropic');

const getFoodIngredientDetails = async (req, res) => {
  try {
    const { ingredient } = req.body;
    const apiKey = req.appKey;

    if (!apiKey) return res.status(401).json({ error: 'API key is required' });
    if (!ingredient) return res.status(400).json({ error: 'Missing ingredient' });

    const result = await handleAnthropicRequest('foodIngredientDirectory', { ingredient });

    res.json({ data: result });
  } catch (error) {
    console.error('Error getting food ingredient details:', error);
    res.status(500).json({ error: 'Failed to get food ingredient details', details: error.message });
  }
};

module.exports = { getFoodIngredientDetails };