// src/api/anthropic.js
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'set' : 'not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
console.log('[Debug] Anthropic initialized with key:', process.env.ANTHROPIC_API_KEY ? 'set' : 'not set');

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
    console.log(`[Anthropic] Raw response for ${endpoint}: ${jsonContent.substring(0, 200)}...`); // Extended log for visibility

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
        // Add fallbacks for all fields
        parsedResponse.category = parsedResponse.category || 'N/A';
        parsedResponse.origin = parsedResponse.origin || 'N/A';
        parsedResponse.safety_rating = parsedResponse.safety_rating || 'N/A';
        parsedResponse.layman_term = parsedResponse.layman_term || 'N/A';
        parsedResponse.production_process = parsedResponse.production_process || 'N/A';
        parsedResponse.example_use = parsedResponse.example_use || 'N/A';
        parsedResponse.health_insights = parsedResponse.health_insights || 'N/A';
        parsedResponse.nutritional_profile = parsedResponse.nutritional_profile || 'N/A';
        parsedResponse.commonly_found_in = parsedResponse.commonly_found_in || 'N/A';
        parsedResponse.aliases = Array.isArray(parsedResponse.aliases) ? parsedResponse.aliases : [];
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

    console.log(`[Anthropic] Successfully parsed response for ${endpoint}:`, parsedResponse);
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
      prompt = `Return a valid JSON object (no text outside the JSON, all fields mandatory) containing detailed information about the food ingredient "${ingredient}". Include exactly these fields with comprehensive, accurate details:
        - "name": The ingredient's name (e.g., "Red 40")
        - "category": The type of ingredient (e.g., "food coloring")
        - "origin": Source or raw material (e.g., "synthetic, derived from petroleum")
        - "safety_rating": Regulatory status (e.g., "Approved by the FDA with noted concerns")
        - "definition": A precise, technical description (e.g., "A synthetic azo dye utilized as a colorant in food, drugs, and cosmetics")
        - "layman_term": A simple explanation (e.g., "Artificial red food coloring")
        - "production_process": A detailed, step-by-step scientific explanation of its manufacturing process using technical terms, followed by a simple 5th-grade-level explanation in parentheses (e.g., "Red 40 is synthesized through a multi-stage chemical process. First, aromatic hydrocarbons are extracted from petroleum via fractional distillation. These are then sulfonated with sulfuric acid to form naphthalene sulfonic acids. Next, the acids undergo diazotization by reacting with sodium nitrite and hydrochloric acid at low temperatures to produce a diazonium salt. Finally, this salt is coupled with 6-hydroxy-2-naphthalenesulfonic acid in an alkaline solution, yielding the azo dye compound known as Red 40. (In a factory, they take oil, break it into pieces, mix it with strong stuff to make new pieces, add more chemicals to turn it red, and finish it up to make the dye.)")
        - "example_use": Specific uses in food (e.g., "Coloring candies, soft drinks, fruit snacks, desserts, and baked goods")
        - "health_insights": Detailed health effects or concerns (e.g., "Approved by the FDA for use in food, drugs, and cosmetics. However, some studies suggest potential links to hyperactivity in children and allergic reactions in sensitive individuals. It may also cause intolerance symptoms in people with pre-existing digestive conditions.")
        - "nutritional_profile": Nutritional impact (e.g., "As a synthetic additive, Red 40 provides no nutritional value and does not contribute calories, vitamins, or minerals to food products")
        - "commonly_found_in": Common products (e.g., "Soft drinks, fruit-flavored candies, popsicles, gelatin desserts, puddings, salad dressings, processed snacks, and breakfast cereals")
        - "aliases": Alternative names as an array (e.g., ["Allura Red AC", "FD&C Red No. 40", "E129", "CI 16035", "INS No. 129", "C.I. Food Red 17", "Disodium 6-hydroxy-5-((2-methoxy-5-methyl-4-sulfophenyl)azo)-2-naphthalenesulfonate"])
      Ensure every field is populated with meaningful, detailed data (no "N/A" unless truly unknown). For "production_process", provide a thorough, technical breakdown of at least 50 words with chemical processes and steps, followed by a clear, simple explanation in parentheses suitable for a 5th grader. Example: {
        "name": "Red 40",
        "category": "food coloring",
        "origin": "synthetic, derived from petroleum",
        "safety_rating": "Approved by the FDA with noted concerns",
        "definition": "A synthetic azo dye utilized as a colorant in food, drugs, and cosmetics",
        "layman_term": "Artificial red food coloring",
        "production_process": "Red 40 is synthesized through a multi-stage chemical process. First, aromatic hydrocarbons are extracted from petroleum via fractional distillation. These are then sulfonated with sulfuric acid to form naphthalene sulfonic acids. Next, the acids undergo diazotization by reacting with sodium nitrite and hydrochloric acid at low temperatures to produce a diazonium salt. Finally, this salt is coupled with 6-hydroxy-2-naphthalenesulfonic acid in an alkaline solution, yielding the azo dye compound known as Red 40. (In a factory, they take oil, break it into pieces, mix it with strong stuff to make new pieces, add more chemicals to turn it red, and finish it up to make the dye.)",
        "example_use": "Coloring candies, soft drinks, fruit snacks, desserts, and baked goods",
        "health_insights": "Approved by the FDA for use in food, drugs, and cosmetics. However, some studies suggest potential links to hyperactivity in children and allergic reactions in sensitive individuals. It may also cause intolerance symptoms in people with pre-existing digestive conditions.",
        "nutritional_profile": "As a synthetic additive, Red 40 provides no nutritional value and does not contribute calories, vitamins, or minerals to food products",
        "commonly_found_in": "Soft drinks, fruit-flavored candies, popsicles, gelatin desserts, puddings, salad dressings, processed snacks, and breakfast cereals",
        "aliases": ["Allura Red AC", "FD&C Red No. 40", "E129", "CI 16035", "INS No. 129", "C.I. Food Red 17", "Disodium 6-hydroxy-5-((2-methoxy-5-methyl-4-sulfophenyl)azo)-2-naphthalenesulfonate"]
      }`;
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