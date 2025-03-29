// src/routes/fitnessRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Import controllers from src/api/fitness/
const { generateWorkoutPlan } = require('../api/fitness/workoutController');
const { getExerciseDetails } = require('../api/fitness/exerciseController');
const { generateMealPlan } = require('../api/fitness/mealPlanController');
const { analyzeFoodPlate } = require('../api/fitness/analyzeFoodPlate');
const { getFoodIngredientDetails } = require('../api/fitness/foodIngredientController');
const { getNaturalRemedies } = require('../api/fitness/naturalRemediesController');

// Define routes matching frontend endpoints
router.post('/workout', generateWorkoutPlan);
router.post('/exercise', getExerciseDetails);
router.post('/meal-plan', generateMealPlan);
router.post('/food-plate', upload.single('food_image'), analyzeFoodPlate); // Updated
router.post('/food-ingredient', getFoodIngredientDetails);
router.post('/natural-remedies', getNaturalRemedies);

module.exports = router;