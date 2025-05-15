// src/api/fitness/foodIngredientController.js
const { handleAnthropicRequest } = require('../anthropic');

const getFoodIngredientDetails = async (req, res) => {
  console.log('Inside getFoodIngredientDetails, Body:', req.body, 'User:', req.user);
  try {
    const { ingredient } = req.body;

    if (!ingredient) {
      console.log('Missing ingredient in request body');
      return res.status(400).json({ error: 'Missing ingredient' });
    }

    const result = await handleAnthropicRequest('foodIngredientDirectory', { ingredient });
    console.log('Anthropic result:', result);

    res.json({ data: result });
  } catch (error) {
    console.error('Error getting food ingredient details:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to get food ingredient details', details: error.message });
  }
};

module.exports = { getFoodIngredientDetails };