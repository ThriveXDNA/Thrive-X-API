import fs from 'fs';
import OpenAI from 'openai';
import { z } from 'zod';
import crypto from 'crypto';

// Initialize OpenAI with environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Schema aligned with nutritional analysis output
const foodItemSchema = z.object({
  name: z.string().min(1, 'Name is required').or(z.null()).default("Unknown food"),
  weight: z.any().transform(val => typeof val === 'number' ? val : parseFloat(val) || 0),
  calories: z.any().transform(val => typeof val === 'number' ? val : parseFloat(val) || 0),
  protein: z.any().transform(val => typeof val === 'number' ? val : parseFloat(val) || 0).optional(),
  fat: z.any().transform(val => typeof val === 'number' ? val : parseFloat(val) || 0).optional(),
  carbs: z.any().transform(val => typeof val === 'number' ? val : parseFloat(val) || 0).optional(),
  sodium: z.any().transform(val => typeof val === 'number' ? val : parseFloat(val) || 0).optional(),
  transFat: z.any().transform(val => typeof val === 'number' ? val : parseFloat(val) || 0).optional(),
  nutritionalScore: z.enum(['🟢', '🟡', '🔴']).optional().default('🟡')
});

const foodPlateSchema = z.object({
  title: z.string().optional().default("Food Plate Analysis"),
  foods: z.array(foodItemSchema).default([]),
  totalNutrition: z.object({
    totalWeight: z.number().min(0).default(0),
    totalCalories: z.number().min(0).default(0),
    totalProtein: z.number().min(0).default(0),
    totalFat: z.number().min(0).default(0),
    totalCarbs: z.number().min(0).default(0),
    totalSodium: z.number().min(0).default(0),
    totalTransFat: z.number().min(0).default(0),
    nutritionalScore: z.enum(['🟢', '🟡', '🔴']).default('🟡'),
    percentOfDailyCalories: z.number().min(0).max(100).default(0)
  }).optional().default({
    totalWeight: 0,
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
    totalSodium: 0,
    totalTransFat: 0,
    nutritionalScore: '🟡',
    percentOfDailyCalories: 0
  })
});

export async function analyzeFoodPlate(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Starting food plate analysis`);

    if (!req.file) {
      console.log(`[${requestId}] No file uploaded`);
      return res.status(400).json({ error: 'Missing required parameter. Please upload an image file.' });
    }

    if (!fs.existsSync(req.file.path)) {
      console.log(`[${requestId}] File does not exist at path: ${req.file.path}`);
      return res.status(400).json({ error: 'Invalid file upload. Please try again.' });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    if (imageBuffer.length === 0) {
      console.log(`[${requestId}] Image buffer is empty`);
      return res.status(400).json({ error: 'Empty image file. Please upload a valid image.' });
    }

    const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    console.log(`[${requestId}] Image file details:`);
    console.log(`  - Path: ${req.file.path}`);
    console.log(`  - Size: ${imageBuffer.length} bytes`);
    console.log(`  - MIME: ${req.file.mimetype}`);
    console.log(`  - Hash: ${imageHash}`);

    const mimeType = req.file.mimetype || 'image/jpeg';
    const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    if (!base64Image.startsWith('data:') || base64Image.length < 100) {
      console.log(`[${requestId}] Base64 encoding failed or is too short: ${base64Image.substring(0, 50)}...`);
      return res.status(400).json({ error: 'Failed to encode image. Please try a different format.' });
    }

    console.log(`[${requestId}] Base64 image generated successfully (length: ${base64Image.length})`);
    console.log(`[${requestId}] Base64 image sample: ${base64Image.substring(0, 50)}...`);

    const selectedOil = req.body.cooking_oil || 'unknown';
    console.log(`[${requestId}] Selected cooking oil: ${selectedOil}`);

    console.log(`[${requestId}] Starting GPT-4o analysis...`);

    const nonce = Math.random().toString().substring(2, 10);
    let aiResponse;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert with vision capabilities. Analyze the attached food plate image and provide accurate nutritional information in a structured JSON format based solely on what you see. Return only the JSON object without any additional text, Markdown, or code block formatting (e.g., no ```json or ```)."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `[Nonce: ${nonce}] Analyze the attached food plate image.

THIS IS CRITICAL: Carefully count the number of food items and identify all visible toppings in the image provided. ONLY describe what you can actually see in the image. Do not guess, add items not visible, or rely on any external description.

For each distinct food item visible:
- Exact name (e.g., "Grilled Chicken Breast", "Steamed Broccoli", "Mashed Potatoes (1 cup)")
- Estimated weight in grams
- Calories (kcal)
- Protein (g)
- Fat (g)
- Carbs (g)
- Sodium (mg)
- Trans Fat (g)
- Nutritional score (🟢 for healthy, 🟡 for moderate, 🔴 for less healthy)

Provide a total nutrition summary with combined values and an overall nutritional score. Calculate the percentage this meal represents of a 2000-calorie daily plan.

Title the meal based ONLY on what you see in the image, using appropriate emojis (e.g., "Chicken and Veggie Delight 🍗🥦").

Return the response as a plain JSON object, like this example:
{
  "title": "Chicken and Veggie Delight 🍗🥦",
  "foods": [
    { "name": "Grilled Chicken Breast", "weight": 150, "calories": 165, "protein": 31, "fat": 3.5, "carbs": 0, "sodium": 74, "transFat": 0, "nutritionalScore": "🟢" },
    { "name": "Steamed Broccoli", "weight": 100, "calories": 35, "protein": 3, "fat": 0.4, "carbs": 7, "sodium": 33, "transFat": 0, "nutritionalScore": "🟢" },
    { "name": "Mashed Potatoes (1 cup)", "weight": 210, "calories": 214, "protein": 4, "fat": 8, "carbs": 35, "sodium": 600, "transFat": 0, "nutritionalScore": "🟡" }
  ],
  "totalNutrition": {
    "totalWeight": 460,
    "totalCalories": 414,
    "totalProtein": 38,
    "totalFat": 11.9,
    "totalCarbs": 42,
    "totalSodium": 707,
    "totalTransFat": 0,
    "nutritionalScore": "🟢",
    "percentOfDailyCalories": 21
  }
}

Use simple numbers (e.g., 5, 10.5) without calculations or functions in the response.
NOTE: This is request ID ${requestId} analyzing image with hash ${imageHash}. Ensure the analysis is based solely on the attached image and return only the JSON object.`
            },
            {
              type: "image_url",
              image_url: { url: base64Image }
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      seed: 12345 // Fixed seed for consistency
    });

    let jsonContent = completion.choices[0].message.content;
    // Strip any unexpected Markdown or text
    jsonContent = jsonContent.replace(/```json\s*|\s*```/g, '').trim();
    try {
      aiResponse = JSON.parse(jsonContent);
    } catch (jsonError) {
      console.error(`[ERROR ${requestId}] Error parsing JSON from GPT-4o:`, jsonError);
      console.error(`[ERROR ${requestId}] Raw response:`, jsonContent);
      aiResponse = { title: "Food Plate Analysis", foods: [] };
    }

    console.log(`[${requestId}] GPT-4o analysis completed`);
    console.log(`[${requestId}] Analysis title: "${aiResponse.title}"`);
    console.log(`[${requestId}] Foods identified: ${aiResponse.foods.map(f => f.name || 'Unknown').join(', ')}`);
    console.log(`[${requestId}] Full API response:`, JSON.stringify(aiResponse, null, 2));

    const processedFoods = (aiResponse.foods || []).map(food => {
      if (!food) {
        console.log(`[${requestId}] Found null food item in response`);
        return {
          name: "Unknown food item",
          weight: 0,
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
          sodium: 0,
          transFat: 0,
          nutritionalScore: '🟡'
        };
      }

      const safeParseNumber = (value) => {
        if (value === undefined || value === null) return 0;
        if (typeof value === 'number') return value;
        const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      };

      return {
        name: food.name || "Unnamed food",
        weight: safeParseNumber(food.weight),
        calories: safeParseNumber(food.calories),
        protein: safeParseNumber(food.protein),
        fat: safeParseNumber(food.fat),
        carbs: safeParseNumber(food.carbs),
        sodium: safeParseNumber(food.sodium),
        transFat: safeParseNumber(food.transFat),
        nutritionalScore: food.nutritionalScore || calculateFoodScore({
          name: food.name,
          calories: safeParseNumber(food.calories),
          protein: safeParseNumber(food.protein),
          fat: safeParseNumber(food.fat),
          carbs: safeParseNumber(food.carbs)
        })
      };
    });

    const calculatedTotalWeight = processedFoods.reduce((sum, food) => sum + food.weight, 0);
    const calculatedTotalCalories = processedFoods.reduce((sum, food) => sum + food.calories, 0);
    const calculatedTotalProtein = processedFoods.reduce((sum, food) => sum + food.protein, 0);
    const calculatedTotalFat = processedFoods.reduce((sum, food) => sum + food.fat, 0);
    const calculatedTotalCarbs = processedFoods.reduce((sum, food) => sum + food.carbs, 0);
    const calculatedTotalSodium = processedFoods.reduce((sum, food) => sum + food.sodium, 0);
    const calculatedTotalTransFat = processedFoods.reduce((sum, food) => sum + food.transFat, 0);
    const calculatedNutritionalScore = calculateOverallNutritionalScore(processedFoods);
    const calculatedPercentOfDailyCalories = Math.min(100, Math.round((calculatedTotalCalories / 2000) * 100));

    const totalNutrition = {
      totalWeight: calculatedTotalWeight,
      totalCalories: calculatedTotalCalories,
      totalProtein: calculatedTotalProtein,
      totalFat: calculatedTotalFat,
      totalCarbs: calculatedTotalCarbs,
      totalSodium: calculatedTotalSodium,
      totalTransFat: calculatedTotalTransFat,
      nutritionalScore: calculatedNutritionalScore,
      percentOfDailyCalories: calculatedPercentOfDailyCalories
    };

    if (selectedOil !== 'unknown') {
      const oilNutrition = getCookingOilNutrition(selectedOil);
      if (oilNutrition) {
        processedFoods.push({
          name: `${oilNutrition.name || 'Cooking oil'}`,
          weight: oilNutrition.weight || 0,
          calories: oilNutrition.calories || 0,
          protein: oilNutrition.protein || 0,
          fat: oilNutrition.fat || 0,
          carbs: oilNutrition.carbs || 0,
          sodium: oilNutrition.sodium || 0,
          transFat: oilNutrition.transFat || 0,
          nutritionalScore: oilNutrition.nutritionalScore || '🟡'
        });

        totalNutrition.totalWeight += (oilNutrition.weight || 0);
        totalNutrition.totalCalories += (oilNutrition.calories || 0);
        totalNutrition.totalProtein += (oilNutrition.protein || 0);
        totalNutrition.totalFat += (oilNutrition.fat || 0);
        totalNutrition.totalCarbs += (oilNutrition.carbs || 0);
        totalNutrition.totalSodium += (oilNutrition.sodium || 0);
        totalNutrition.totalTransFat += (oilNutrition.transFat || 0);
        totalNutrition.nutritionalScore = calculateOverallNutritionalScore(processedFoods);
        totalNutrition.percentOfDailyCalories = Math.min(100, Math.round((totalNutrition.totalCalories / 2000) * 100));
      }
    }

    console.log(`[${requestId}] Processed foods with oil:`, JSON.stringify(processedFoods, null, 2));

    const formattedOutput = formatResponse(aiResponse.title || 'Food Plate Analysis', processedFoods);

    const response = {
      success: true,
      requestId,
      imageHash,
      data: {
        title: aiResponse.title || 'Food Plate Analysis',
        formattedOutput,
        foods: processedFoods,
        totalNutrition
      }
    };

    console.log(`[${requestId}] Analysis complete, sending response`);
    return res.status(200).json(response);
  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[ERROR ${errorId}] Error analyzing food plate:`, error);
    if (error.cause?.issues) {
      console.error(`[ERROR ${errorId}] Validation issues:`, JSON.stringify(error.cause.issues, null, 2));
    }
    if (error.text) {
      console.error(`[ERROR ${errorId}] Raw AI response:`, error.text);
    }
    let details = error.message;
    if (req.file?.path) details += ` (File: ${req.file.path})`;
    return res.status(500).json({ error: 'Failed to analyze food plate', errorId, details });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Temporary file removed: ${req.file.path}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
}

// Format the response to match your desired output
function formatResponse(title, foods) {
  try {
    let output = `**"${title || 'Food Plate Analysis'}" 🍽️**\n`;
    output += `**Nutritional Breakdown**\n`;
    output += `**Ingredient | Weight (g) | Calories (kcal) | Protein (g) | Fat (g) | Carbs (g) | Sodium (mg) | Trans Fat (g) | Score**\n`;
    if (foods && Array.isArray(foods)) {
      foods.forEach(food => {
        if (!food) return;
        const name = food.name || 'Unknown';
        const weight = safeFormat(food.weight);
        const calories = safeFormat(food.calories);
        const protein = safeFormat(food.protein);
        const fat = safeFormat(food.fat);
        const carbs = safeFormat(food.carbs);
        const sodium = safeFormat(food.sodium);
        const transFat = safeFormat(food.transFat);
        const score = food.nutritionalScore || '🟡';
        output += `${name} | ${weight} | ${calories} | ${protein} | ${fat} | ${carbs} | ${sodium} | ${transFat} | ${score}\n`;
      });
    }
    return output;
  } catch (error) {
    console.error('Error formatting response:', error);
    return `**"Food Plate Analysis" 🍽️**\n**Nutritional Breakdown**\n**Error: ${error.message || 'Unknown error'}**`;
  }
}

function safeFormat(value, defaultValue = 0) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return isNaN(parsed) ? defaultValue : parsed;
}

function calculateFoodScore(food) {
  if (!food) return '🟡';
  try {
    const name = food.name ? food.name.toLowerCase() : '';
    if (name.includes('berry') || name.includes('fruit') || name.includes('vegetable')) return '🟢';
    if (name.includes('syrup') || name.includes('sugar') || name.includes('candy') || name.includes('soda')) return '🔴';
    const calories = safeFormat(food.calories, 1);
    const protein = safeFormat(food.protein);
    const carbs = safeFormat(food.carbs);
    const fat = safeFormat(food.fat);
    const proteinRatio = calories ? protein / calories * 100 : 0;
    const carbRatio = calories ? carbs / calories * 100 : 0;
    const fatRatio = calories ? fat / calories * 100 : 0;
    if (proteinRatio > 15 && fatRatio < 30) return '🟢';
    if (fatRatio > 40 || carbRatio > 60) return '🔴';
    return '🟡';
  } catch (error) {
    console.error('Error calculating food score:', error);
    return '🟡';
  }
}

function calculateOverallNutritionalScore(foods) {
  if (!foods || !Array.isArray(foods) || foods.length === 0) return '🟡';
  try {
    const scores = foods.map(food => food.nutritionalScore || calculateFoodScore(food));
    const greenCount = scores.filter(score => score === '🟢').length;
    const redCount = scores.filter(score => score === '🔴').length;
    if (greenCount > foods.length / 2) return '🟢';
    if (redCount > foods.length / 3) return '🔴';
    return '🟡';
  } catch (error) {
    console.error('Error calculating nutritional score:', error);
    return '🟡';
  }
}

function getCookingOilNutrition(oilType) {
  const oils = {
    'tallow': { name: 'Tallow', weight: 15, calories: 135, protein: 0, fat: 15, carbs: 0, sodium: 0, transFat: 0.7, nutritionalScore: '🟢' },
    'lard': { name: 'Lard', weight: 15, calories: 135, protein: 0, fat: 15, carbs: 0, sodium: 0, transFat: 0, nutritionalScore: '🟢' },
    'butter': { name: 'Butter', weight: 15, calories: 108, protein: 0.1, fat: 12.2, carbs: 0, sodium: 2, transFat: 0.5, nutritionalScore: '🟢' },
    'ghee': { name: 'Ghee', weight: 15, calories: 135, protein: 0, fat: 15, carbs: 0, sodium: 0, transFat: 0, nutritionalScore: '🟢' },
    'olive_oil': { name: 'Olive Oil', weight: 15, calories: 119, protein: 0, fat: 13.5, carbs: 0, sodium: 0, transFat: 0, nutritionalScore: '🟢' },
    'coconut_oil': { name: 'Coconut Oil', weight: 15, calories: 121, protein: 0, fat: 13.5, carbs: 0, sodium: 0, transFat: 0, nutritionalScore: '🟢' },
    'avocado_oil': { name: 'Avocado Oil', weight: 15, calories: 124, protein: 0, fat: 14, carbs: 0, sodium: 0, transFat: 0, nutritionalScore: '🟢' },
    'canola_oil': { name: 'Canola Oil', weight: 15, calories: 124, protein: 0, fat: 14, carbs: 0, sodium: 0, transFat: 0.1, nutritionalScore: '🔴' },
    'vegetable_oil': { name: 'Vegetable Oil', weight: 15, calories: 120, protein: 0, fat: 14, carbs: 0, sodium: 0, transFat: 0.3, nutritionalScore: '🔴' },
    'sunflower_oil': { name: 'Sunflower Oil', weight: 15, calories: 120, protein: 0, fat: 14, carbs: 0, sodium: 0, transFat: 0, nutritionalScore: '🔴' },
    'soybean_oil': { name: 'Soybean Oil', weight: 15, calories: 120, protein: 0, fat: 14, carbs: 0, sodium: 0, transFat: 0.5, nutritionalScore: '🔴' },
    'corn_oil': { name: 'Corn Oil', weight: 15, calories: 120, protein: 0, fat: 14, carbs: 0, sodium: 0, transFat: 0.1, nutritionalScore: '🔴' }
  };
  return oils[oilType] || null;
}