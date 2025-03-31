// src/api/fitness/naturalRemediesController.js
const { handleAnthropicRequest } = require('../anthropic');

const getNaturalRemedies = async (req, res) => {
  try {
    const { symptom, approach } = req.body;
    const apiKey = req.appKey;

    if (!apiKey) return res.status(401).json({ error: 'API key is required' });
    if (!symptom || !approach) {
      return res.status(400).json({ 
        error: 'Missing required parameters: symptom and approach are required' 
      });
    }

    const result = await handleAnthropicRequest('naturalRemedies', { symptom, approach });

    const responseWithDisclaimer = {
      ...result,
      disclaimer: 'These remedies are personal recommendations based on traditional wisdom and holistic perspectives, not medical advice. Always consult healthcare professionals for medical concerns.'
    };

    res.json({ data: responseWithDisclaimer });
  } catch (error) {
    console.error('Error getting natural remedies:', error);
    res.status(500).json({ error: 'Failed to get natural remedies', details: error.message });
  }
};

module.exports = { getNaturalRemedies };