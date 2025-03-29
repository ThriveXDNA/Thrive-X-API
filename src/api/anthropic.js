// src/api/anthropic.js
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Sends a prompt to Claude and returns the parsed JSON response.
 * @param {string} prompt - The prompt to send to Claude.
 * @param {string} endpoint - The API endpoint name for context (e.g., 'generateWorkoutPlan').
 * @returns {Promise<object>} - Parsed JSON response from Claude.
 * @throws {Error} - If the API call or JSON parsing fails.
 */
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
      console.error(`[Anthropic] Error parsing JSON for ${endpoint}:`, parseError);
      throw new Error(`Failed to parse Claude response for ${endpoint}: ${parseError.message}`);
    }

    // Validate response structure based on endpoint
    switch (endpoint) {
      case 'generateWorkoutPlan':
        if (!parsedResponse.days || !Array.isArray(parsedResponse.days)) {
          throw new Error('Invalid workout plan structure: missing or invalid "days" array');
        }
        break;
      case 'exerciseDetails':
        if (!parsedResponse.name) {
          throw new Error('Invalid exercise details structure: missing "name"');
        }
        break;
      case 'nutritionMealPlan':
        if (!parsedResponse.macros || !parsedResponse.recommendations || !Array.isArray(parsedResponse.recommendations.mealPlan)) {
          throw new Error('Invalid nutrition meal plan structure: missing "macros" or "recommendations.mealPlan" array');
        }
        break;
      case 'foodIngredientDirectory':
        if (!parsedResponse.name && (!parsedResponse.ingredients || !Array.isArray(parsedResponse.ingredients))) {
          throw new Error('Invalid food ingredient directory structure: missing "name" or "ingredients" array');
        }
        break;
      case 'naturalRemedies':
        if (!parsedResponse.remedies || !Array.isArray(parsedResponse.remedies)) {
          throw new Error('Invalid natural remedies structure: missing or invalid "remedies" array');
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

/**
 * Handles API calls for endpoints using Anthropic, except "Analyze Food Plate" (uses OpenAI).
 * @param {string} endpoint - The endpoint name (e.g., 'generateWorkoutPlan').
 * @param {object} data - Request data from the controller.
 * @returns {Promise<object>} - Parsed JSON response from Claude.
 */
async function handleAnthropicRequest(endpoint, data) {
  let prompt;

  switch (endpoint) {
    case 'generateWorkoutPlan':
      const { fitnessLevel, goals: userGoals, preferences, bodyFocus, muscleGroups, includeWarmupCooldown, daysPerWeek, sessionDuration, planDurationWeeks } = data;
      prompt = `Generate a detailed workout plan for a ${fitnessLevel} with goal ${userGoals}, preferring ${preferences.length ? preferences.join(', ') : 'any'} exercises, ${bodyFocus ? `with ${bodyFocus} focus` : ''}${muscleGroups.length ? ` targeting ${muscleGroups.join(', ')} muscle groups` : ''}, ${includeWarmupCooldown ? 'including' : 'excluding'} warm-up and cool-down routines, ${daysPerWeek} days/week, ${sessionDuration} min sessions, over ${planDurationWeeks} week${planDurationWeeks === 1 ? '' : 's'}. ${bodyFocus === 'alternating' ? 'Alternate between upper and lower body workouts.' : ''} Include varied exercises with progression tips. Return JSON: {name: string, goals: string, fitnessLevel: string, bodyFocus: string, daysPerWeek: number, planDurationWeeks: number, days: [{name: string, sessionDuration: number, exercises: [{name: string, sets: number, reps: number, restSeconds: number, muscleGroup: string}]}]}`;
      break;

    case 'exerciseDetails':
      const { exerciseId, includeVariations } = data;
      prompt = `Provide detailed info for "${exerciseId}". Include muscleGroups (array), equipment (string), instructions (string), difficulty (string), tips (array), and if ${includeVariations}, variations (array). Return JSON: {name, muscleGroups, equipment, instructions, difficulty, tips, variations?}`;
      break;

    case 'nutritionMealPlan':
      const { gender, age, weight, heightCm, activityLevel, goals, dietType, calorieTarget, mealsPerDay, numberOfDays, allergies, religiousPreferences } = data;
      prompt = `Generate a ${numberOfDays}-day meal plan for a ${gender}, age ${age}, weight ${weight} kg, height ${heightCm} cm, ${activityLevel} activity, aiming for ${goals} with a ${dietType} diet, targeting ${calorieTarget} calories/day, ${mealsPerDay} meals/day. Account for allergies (${allergies.length ? allergies.join(', ') : 'none'}) and religious preferences (${religiousPreferences || 'none'}). Return JSON: {macros: {protein, fat, carbs, totalCalories}, recommendations: {general: string, keyPoints: [string], mealPlan: [{day: string, meals: [{mealName: string, foods: [{name, calories, protein, fat, carbs}]}]}]}}`;
      break;

    case 'foodIngredientDirectory':
      const { ingredient } = data;
      prompt = `Provide detailed info for "${ingredient}". Include definition, layman_term, production_process, example_use, health_insights, nutritional_profile, commonly_found_in. Return JSON: {name, category, origin, safety_rating, definition, layman_term, production_process, example_use, health_insights, nutritional_profile, commonly_found_in}`;
      break;

    case 'naturalRemedies':
      const { symptom, approach } = data;
      prompt = `Provide specific natural remedies for "${symptom}" using a ${approach} approach. Return JSON: {symptom, approach, remedies: [{name, source, ingredients, preparation, usage, warnings, notes}]} with detailed, actionable instructions`;
      break;

    default:
      throw new Error(`Unsupported endpoint: ${endpoint}`);
  }

  return await callClaude(prompt, endpoint);
}

module.exports = { handleAnthropicRequest };