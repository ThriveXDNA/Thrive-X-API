// src/api/fitness/analyzeFoodPlate.js
const fs = require('fs');
const OpenAI = require('openai');
const crypto = require('crypto');
const sharp = require('sharp'); // Add for resizing

async function analyzeFoodPlate(req, res) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Starting food plate analysis`);

    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'API key is required' });
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    // Resize image for mobile-friendly size
    const resizedImage = await sharp(req.file.path)
      .resize({ width: 600, height: 600, fit: 'contain', withoutEnlargement: true }) // Smaller size, maintain aspect ratio
      .jpeg({ quality: 70 }) // Lower quality for smaller file size
      .toBuffer();
    const base64Image = `data:${req.file.mimetype || 'image/jpeg'};base64,${resizedImage.toString('base64')}`;
    const selectedOil = req.body.cooking_oil || 'unknown';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a nutrition expert with vision capabilities. Analyze the attached food plate image and provide accurate nutritional information in a structured JSON format based solely on what you see. Return only the JSON object, no extra text or markdown.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze the attached food plate image. Identify all visible food items and provide:
- Name (e.g., "Grilled Chicken Breast")
- Weight (grams)
- Calories (kcal)
- Protein (g)
- Fat (g)
- Carbs (g)
- Sodium (mg)
- Trans Fat (g)
- Nutritional score (🟢, 🟡, 🔴)
Include a total nutrition summary and percentage of a 2000-calorie daily plan. Return JSON like:
{
  "title": "Meal Title 🍽️",
  "foods": [
    {"name": "Food Name", "weight": 100, "calories": 200, "protein": 10, "fat": 5, "carbs": 30, "sodium": 300, "transFat": 0, "nutritionalScore": "🟢"}
  ],
  "totalNutrition": {
    "totalWeight": 100,
    "totalCalories": 200,
    "totalProtein": 10,
    "totalFat": 5,
    "totalCarbs": 30,
    "totalSodium": 300,
    "totalTransFat": 0,
    "nutritionalScore": "🟢",
    "percentOfDailyCalories": 10
  }
}`
            },
            { type: 'image_url', image_url: { url: base64Image } }
          ]
        }
      ],
      max_tokens: 2500
    });

    // Clean the response to extract JSON
    let rawContent = completion.choices[0].message.content.trim();
    console.log(`[${requestId}] Raw OpenAI response:`, rawContent); // Debug log
    const jsonMatch = rawContent.match(/{[\s\S]*}/); // Extract JSON block
    if (!jsonMatch) throw new Error('No valid JSON found in response');
    const cleanedJson = jsonMatch[0];
    let aiResponse = JSON.parse(cleanedJson);
    let processedFoods = aiResponse.foods || [];

    if (selectedOil !== 'unknown') {
      const oilNutrition = getCookingOilNutrition(selectedOil);
      if (oilNutrition) processedFoods.push(oilNutrition);
    }

    const totalNutrition = {
      totalWeight: processedFoods.reduce((sum, f) => sum + (f.weight || 0), 0),
      totalCalories: processedFoods.reduce((sum, f) => sum + (f.calories || 0), 0),
      totalProtein: processedFoods.reduce((sum, f) => sum + (f.protein || 0), 0),
      totalFat: processedFoods.reduce((sum, f) => sum + (f.fat || 0), 0),
      totalCarbs: processedFoods.reduce((sum, f) => sum + (f.carbs || 0), 0),
      totalSodium: processedFoods.reduce((sum, f) => sum + (f.sodium || 0), 0),
      totalTransFat: processedFoods.reduce((sum, f) => sum + (f.transFat || 0), 0),
      nutritionalScore: calculateOverallNutritionalScore(processedFoods),
      percentOfDailyCalories: Math.min(100, Math.round((processedFoods.reduce((sum, f) => sum + (f.calories || 0), 0) / 2000) * 100))
    };

    const response = {
      title: aiResponse.title || 'Food Plate Analysis',
      foods: processedFoods,
      totalNutrition
    };

    res.json({ data: response });
  } catch (error) {
    console.error('Error analyzing food plate:', error);
    res.status(500).json({ error: 'Failed to analyze food plate', details: error.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
}

function calculateOverallNutritionalScore(foods) {
  if (!foods || !Array.isArray(foods) || foods.length === 0) return '🟡';
  const scores = foods.map(f => f.nutritionalScore || '🟡');
  const greenCount = scores.filter(s => s === '🟢').length;
  const redCount = scores.filter(s => s === '🔴').length;
  return greenCount > foods.length / 2 ? '🟢' : redCount > foods.length / 3 ? '🔴' : '🟡';
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

module.exports = { analyzeFoodPlate };