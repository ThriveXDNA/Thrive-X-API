// src/api/anthropic.js
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY || 'not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
console.log('[Debug] Anthropic initialized with key:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'not set');

async function callClaude(prompt, endpoint) {
  try {
    console.log(`[Anthropic] Sending request for endpoint: ${endpoint}`);
    console.log(`[Anthropic] Prompt: ${prompt.substring(0, 100)}...`);

    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const jsonContent = response.content[0].text.trim();
    console.log(`[Anthropic] Raw response for ${endpoint}: ${jsonContent.substring(0, 100)}...`);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error(`[Anthropic] Error parsing JSON for ${endpoint}:`, parseError, 'Raw:', jsonContent);
      throw new Error(`Failed to parse Claude response for ${endpoint}: ${parseError.message}`);
    }

    // Validation with fallback
    switch (endpoint) {
      case 'generateWorkoutPlan':
        if (!parsedResponse.days || !Array.isArray(parsedResponse.days)) {
          console.error(`[Anthropic] Invalid workout plan:`, parsedResponse);
          throw new Error('Invalid workout plan: missing or invalid "days" array');
        }
        // Ensure all fields are present
        parsedResponse.goal = parsedResponse.goal || 'unknown';
        parsedResponse.fitnessLevel = parsedResponse.fitnessLevel || 'unknown';
        parsedResponse.bodyFocus = parsedResponse.bodyFocus || 'any';
        parsedResponse.daysPerWeek = parsedResponse.daysPerWeek || 0;
        parsedResponse.weeks = parsedResponse.weeks || 0;
        parsedResponse.days.forEach(day => {
          day.exercises.forEach(ex => {
            ex.rest = ex.rest || '30s';
            ex.muscleGroup = ex.muscleGroup || 'unknown';
          });
        });
        break;
      case 'exerciseDetails':
        if (!parsedResponse.name || !parsedResponse.muscle_groups || !Array.isArray(parsedResponse.muscle_groups)) {
          console.error(`[Anthropic] Invalid exercise details:`, parsedResponse);
          throw new Error('Invalid exercise details: missing "name" or "muscle_groups"');
        }
        // Fill missing fields
        parsedResponse.muscle_groups = parsedResponse.muscle_groups.length ? parsedResponse.muscle_groups : ['unknown'];
        parsedResponse.equipment_needed = parsedResponse.equipment_needed || ['none'];
        parsedResponse.steps = parsedResponse.steps || ['Perform the exercise as described'];
        parsedResponse.tips = parsedResponse.tips || ['No tips available'];
        parsedResponse.variations = parsedResponse.variations || [];
        break;
      case 'nutritionMealPlan':
        if (!parsedResponse.macros || !parsedResponse.mealPlan || !Array.isArray(parsedResponse.mealPlan)) {
          console.error(`[Anthropic] Invalid meal plan:`, parsedResponse);
          throw new Error('Invalid meal plan: missing "macros" or "mealPlan" array');
        }
        // Ensure macros are complete
        parsedResponse.macros.calories = parsedResponse.macros.calories || 0;
        parsedResponse.macros.protein = parsedResponse.macros.protein || 0;
        parsedResponse.macros.fat = parsedResponse.macros.fat || 0;
        parsedResponse.macros.carbs = parsedResponse.macros.carbs || 0;
        break;
      case 'foodIngredientDirectory':
        if (!parsedResponse.name || !parsedResponse.definition) {
          console.error(`[Anthropic] Invalid food ingredient:`, parsedResponse);
          throw new Error('Invalid food ingredient: missing "name" or "definition"');
        }
        break;
      case 'naturalRemedies':
        if (!parsedResponse.remedies || !Array.isArray(parsedResponse.remedies)) {
          console.error(`[Anthropic] Invalid natural remedies:`, parsedResponse);
          throw new Error('Invalid natural remedies: missing or invalid "remedies" array');
        }
        break;
      default:
        console.warn(`[Anthropic] Unrecognized endpoint: ${endpoint}`);
    }

    console.log(`[Anthropic] Successfully parsed response for ${endpoint}`);
    return parsedResponse;
  } catch (error) {
    console.error(`[Anthropic] Error calling Claude for ${endpoint}:`, error);
    throw error;
  }
}

async function handleAnthropicRequest(endpoint, data) {
  let prompt;

  switch (endpoint) {
    case 'foodIngredientDirectory':
      const { ingredient } = data;
      prompt = `Return a valid JSON object (no text outside the JSON, all fields required) for "${ingredient}". Include: "name", "definition", "layman_term", "production_process", "example_use", "health_insights", "nutritional_profile", "commonly_found_in", "aliases" (array). Example: {"name": "Red 40", "definition": "Synthetic red dye", "layman_term": "Red coloring", "production_process": "Derived from petroleum", "example_use": "Candies", "health_insights": "FDA-approved, may cause hyperactivity", "nutritional_profile": "No value", "commonly_found_in": "Soda", "aliases": ["Allura Red AC"]}`;
      break;
    case 'exerciseDetails':
      const { exerciseId, includeVariations } = data;
      prompt = `Return a valid JSON object (no text outside the JSON, all fields required) for "${exerciseId}". Include: "name", "description", "muscle_groups" (array), "equipment_needed" (array), "difficulty", "steps" (array), "tips" (array). If ${includeVariations} is true, add "variations" (array of objects with "name", "description", "difficulty"). Example: {"name": "Squat", "description": "Lower body strength exercise", "muscle_groups": ["quads", "glutes"], "equipment_needed": ["none"], "difficulty": "beginner", "steps": ["Stand with feet apart", "Lower hips"], "tips": ["Keep back straight"], "variations": [{"name": "Goblet Squat", "description": "Hold weight", "difficulty": "intermediate"}]}`;
      break;
    case 'nutritionMealPlan':
      const { gender, age, weight, heightCm, activityLevel, goals: mealGoals, dietType, calorieTarget, mealsPerDay, numberOfDays, allergies, religiousPreferences } = data;
      prompt = `Return a valid JSON object (no text outside the JSON, all fields required) for a meal plan: gender="${gender}", age=${age}, weight=${weight}kg, height=${heightCm}cm, activityLevel="${activityLevel}", goals="${mealGoals}", dietType="${dietType}", calorieTarget=${calorieTarget}, mealsPerDay=${mealsPerDay}, numberOfDays=${numberOfDays}, allergies=${JSON.stringify(allergies)}, religiousPreferences="${religiousPreferences}". Include: "macros" (with "calories", "protein", "fat", "carbs"), "mealPlan" (array with "day" and "meals" array of "name", "ingredients", "nutrition"). Example: {"macros": {"calories": 2500, "protein": 200, "fat": 100, "carbs": 75}, "mealPlan": [{"day": 1, "meals": [{"name": "Beef Steak", "ingredients": ["beef"], "nutrition": {"calories": 800, "protein": 70, "fat": 50, "carbs": 0}}]}]}`;
      break;
    case 'naturalRemedies':
      const { symptom, approach } = data;
      prompt = `Return a valid JSON object (no text outside the JSON, all fields required) for remedies for "${symptom}" using "${approach}". Include: "remedies" (array of objects with "name", "description", "preparation", "benefits"). Example: {"remedies": [{"name": "Honey Tea", "description": "Soothes throat", "preparation": "Mix honey in water", "benefits": "Reduces soreness"}]}`;
      break;
    case 'generateWorkoutPlan':
      const { fitnessLevel, goals: workoutGoals, preferences, bodyFocus, muscleGroups, includeWarmupCooldown, daysPerWeek, sessionDuration, planDurationWeeks } = data;
      prompt = `Return a valid JSON object (no text outside the JSON, all fields required) for a workout plan: fitnessLevel="${fitnessLevel}", goals="${workoutGoals}", preferences=${JSON.stringify(preferences)}, bodyFocus="${bodyFocus}", muscleGroups=${JSON.stringify(muscleGroups)}, includeWarmupCooldown=${includeWarmupCooldown}, daysPerWeek=${daysPerWeek}, sessionDuration=${sessionDuration}, planDurationWeeks=${planDurationWeeks}. Include: "goal", "fitnessLevel", "bodyFocus", "daysPerWeek", "weeks", "days" (array with "day", "exercises" array of "name", "sets", "reps", "rest", "muscleGroup"; if ${includeWarmupCooldown}, add "warmup" and "cooldown" arrays). Example: {"goal": "endurance", "fitnessLevel": "advanced", "bodyFocus": "any", "daysPerWeek": 1, "weeks": 1, "days": [{"day": 1, "exercises": [{"name": "Squats", "sets": 4, "reps": 15, "rest": "30s", "muscleGroup": "legs"}], "warmup": [{"name": "Jumping Jacks", "duration": "60s"}], "cooldown": [{"name": "Stretch", "duration": "30s"}]}]}`;
      break;
    default:
      throw new Error(`Unsupported endpoint: ${endpoint}`);
  }

  return await callClaude(prompt, endpoint);
}

module.exports = { handleAnthropicRequest };