// src/api/fitness/foodIngredientController.js
const { handleAnthropicRequest } = require('../anthropic');

const getIngredientDetails = async (req, res) => {
  console.log('Inside getIngredientDetails, Body:', req.body, 'User:', req.user);
  try {
    const { ingredient } = req.body;

    if (!ingredient) {
      console.log('Missing ingredient in request body');
      return res.status(400).json({ error: 'Missing ingredient name' });
    }

    const result = await handleAnthropicRequest('foodIngredientDetails', {
      ingredient
    });
    console.log('Anthropic result:', result);

    res.json({ data: result });
  } catch (error) {
    console.error('Error getting ingredient details:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to get ingredient details', details: error.message });
  }
};

module.exports = { getIngredientDetails };
