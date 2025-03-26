// router.js
const express = require('express');
const router = express.Router();

// Import controllers
const workoutController = require('./controllers/workoutController');
const nutritionController = require('./controllers/nutritionController');
const exerciseController = require('./controllers/exerciseController');
const mealPlanController = require('./controllers/mealPlanController');
const foodPlateController = require('./controllers/foodPlateController');

// Test routes (keep these for testing)
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working!' });
});

router.get('/simple', (req, res) => {
  res.json({ message: 'Simple route working!' });
});

// API Routes
router.post('/generateWorkoutPlan', workoutController.generateWorkoutPlan);
router.post('/exerciseDetails', exerciseController.getExerciseDetails);
router.post('/nutritionAdvice', nutritionController.getNutritionAdvice);
router.post('/customMealPlan', mealPlanController.generateCustomMealPlan);
router.post('/analyzeFoodPlate', foodPlateController.analyzeFoodPlate);
router.post('/carnivoreTips', nutritionController.getCarnivoreTips);

module.exports = router;