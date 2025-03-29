// src/api/fitness/workoutController.js
const { handleAnthropicRequest } = require('../anthropic');

const generateWorkoutPlan = async (req, res) => {
  try {
    const {
      fitnessLevel,
      goals,
      preferences,
      bodyFocus,
      muscleGroups,
      includeWarmupCooldown,
      daysPerWeek,
      sessionDuration,
      planDurationWeeks
    } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) return res.status(401).json({ error: 'API key is required' });
    if (!fitnessLevel || !goals || !daysPerWeek || !sessionDuration || !planDurationWeeks) {
      return res.status(400).json({ 
        error: 'Missing required parameters: fitnessLevel, goals, daysPerWeek, sessionDuration, planDurationWeeks' 
      });
    }

    const result = await handleAnthropicRequest('generateWorkoutPlan', {
      fitnessLevel,
      goals,
      preferences: preferences || [],
      bodyFocus,
      muscleGroups: muscleGroups || [],
      includeWarmupCooldown: includeWarmupCooldown === 'true',
      daysPerWeek: parseInt(daysPerWeek),
      sessionDuration: parseInt(sessionDuration),
      planDurationWeeks: parseInt(planDurationWeeks)
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error generating workout plan:', error);
    res.status(500).json({ error: 'Failed to generate workout plan', details: error.message });
  }
};

module.exports = { generateWorkoutPlan };