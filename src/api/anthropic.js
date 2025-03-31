// src/api/anthropic.js
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY || 'not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function handleAnthropicRequest(endpoint, data) {
  let prompt;

  switch (endpoint) {
    case 'generateWorkoutPlan':
      const { fitnessLevel, goals: userGoals, preferences, bodyFocus, muscleGroups, includeWarmupCooldown, daysPerWeek, sessionDuration, planDurationWeeks } = data;
      prompt = `Return a detailed workout plan as a valid JSON object (no preamble, just the JSON) for a ${fitnessLevel} with goal ${userGoals}, preferring ${preferences.length ? preferences.join(', ') : 'any'} exercises, ${bodyFocus ? `with ${bodyFocus} focus` : ''}${muscleGroups.length ? ` targeting ${muscleGroups.join(', ')} muscle groups` : ''}, ${includeWarmupCooldown ? 'including' : 'excluding'} warm-up and cool-down routines, ${daysPerWeek} days/week, ${sessionDuration} min sessions, over ${planDurationWeeks} week${planDurationWeeks === 1 ? '' : 's'}. ${bodyFocus === 'alternating' ? 'Alternate between upper and lower body workouts.' : ''} Include varied exercises with progression tips. Format: {"name": string, "goals": string, "fitnessLevel": string, "bodyFocus": string, "daysPerWeek": number, "planDurationWeeks": number, "days": [{"name": string, "sessionDuration": number, "exercises": [{"name": string, "sets": number, "reps": number, "restSeconds": number, "muscleGroup": string}]}]}`;
      break;

    case 'exerciseDetails':
      const { exerciseId, includeVariations } = data;
      prompt = `Return detailed info as a valid JSON object (no preamble, just the JSON) for "${exerciseId}". Include muscleGroups (array), equipment (string), instructions (string), difficulty (string), tips (array), and if ${includeVariations}, variations (array). Format: {"name": string, "muscleGroups": array, "equipment": string, "instructions": string, "difficulty": string, "tips": array, "variations": array (optional)}`;
      break;

    case 'nutritionMealPlan':
      const { gender, age, weight, heightCm, activityLevel, goals, dietType, calorieTarget, mealsPerDay, numberOfDays, allergies, religiousPreferences } = data;
      prompt = `Return a ${numberOfDays}-day meal plan as a valid JSON object (no preamble, just the JSON) for a ${gender}, age ${age}, weight ${weight} kg, height ${heightCm} cm, ${activityLevel} activity, aiming for ${goals} with a ${dietType} diet, targeting ${calorieTarget} calories/day, ${mealsPerDay} meals/day. Account for allergies (${allergies.length ? allergies.join(', ') : 'none'}) and religious preferences (${religiousPreferences || 'none'}). Format: {"macros": {"protein": number, "fat": number, "carbs": number, "totalCalories": number}, "recommendations": {"general": string, "keyPoints": [string], "mealPlan": [{"day": string, "meals": [{"mealName": string, "foods": [{"name": string, "calories": number, "protein": number, "fat": number, "carbs": number}]}]}}]}`;
      break;

    case 'foodIngredientDirectory':
      const { ingredient } = data;
      prompt = `Return detailed info as a valid JSON object (no preamble, just the JSON) for "${ingredient}". Include definition, layman_term, production_process (as a detailed, easy-to-understand narrative with extra steps, e.g., for Red 40: "Red 40 starts with petroleum, a thick, black oil drilled from deep underground, the same stuff used for gasoline and plastic bags. In a lab, scientists heat it up in big tanks to separate out the useful bits, then blend those with special chemicals to kick off reactions that turn it bright red. They fine-tune the color to make it just right, filter out any gunk, wash it clean, and boil off extra liquid. After that, it’s dried into crystals, ground into a fine powder, tested to make sure it’s safe, and packed up for adding to food and cosmetics."), example_use, health_insights (start with "While approved for use by the FDA, some studies suggest potential health concerns. Red 40 has been linked to hyperactivity in children, and may cause allergic reactions in sensitive individuals. Some animal studies have raised questions about possible carcinogenic effects, but evidence is limited. It may also trigger immune responses and impact gut health in certain people." and add risks like potential DNA damage, neurological effects, or hormonal disruption), nutritional_profile, commonly_found_in, and aliases (must include all known alternative names, e.g., for Red 40: "Allura Red AC", "FD&C Red No. 40", "E129", "C.I. Food Red 17", "C.I. 16035", "Red No. 40", "Red 40 Lake"). Format: {"name": string, "category": string, "origin": string, "safety_rating": string, "definition": string, "layman_term": string, "production_process": string, "example_use": string, "health_insights": string, "nutritional_profile": string, "commonly_found_in": string, "aliases": [string]}`;
      break;

    case 'naturalRemedies':
      const { symptom, approach } = data;
      prompt = `Return specific natural remedies as a valid JSON object (no preamble, just the JSON) for "${symptom}" using a ${approach} approach. Format: {"symptom": string, "approach": string, "remedies": [{"name": string, "source": string, "ingredients": array, "preparation": string, "usage": string, "warnings": string, "notes": string}]} with detailed, actionable instructions`;
      break;

    default:
      throw new Error(`Unsupported endpoint: ${endpoint}`);
  }

  return await callClaude(prompt, endpoint);
}

module.exports = { handleAnthropicRequest };