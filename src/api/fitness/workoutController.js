// src/api/fitness/workoutController.js
const { handleAnthropicRequest } = require('../anthropic');

const generateWorkoutPlan = async (req, res) => {
  console.log('Inside generateWorkoutPlan, Body:', req.body, 'User:', req.user);
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

    if (!fitnessLevel || !goals || !daysPerWeek || !sessionDuration || !planDurationWeeks) {
      console.log('Missing required parameters');
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
    console.log('Anthropic result:', result);

    res.json({ data: result });
  } catch (error) {
    console.error('Error generating workout plan:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate workout plan', details: error.message });
  }
};

module.exports = { generateWorkoutPlan };