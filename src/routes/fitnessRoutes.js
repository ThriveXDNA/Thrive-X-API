// src/routes/fitnessRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Import controllers from src/api/fitness/
const { generateWorkoutPlan } = require('../api/fitness/workoutController');
const { getExerciseDetails } = require('../api/fitness/exerciseController');
const { generateMealPlan } = require('../api/fitness/mealPlanController');
const { analyzeFoodPlate } = require('../api/fitness/analyzeFoodPlate');
const { getFoodIngredientDetails } = require('../api/fitness/foodIngredientController');
const { getNaturalRemedies } = require('../api/fitness/naturalRemediesController');

// Define routes with debug
router.post('/workout', (req, res, next) => {
  console.log('Reached /workout route');
  generateWorkoutPlan(req, res, next);
});
router.post('/exercise', (req, res, next) => {
  console.log('Reached /exercise route');
  getExerciseDetails(req, res, next);
});
router.post('/meal-plan', (req, res, next) => {
  console.log('Reached /meal-plan route');
  generateMealPlan(req, res, next);
});
router.post('/food-plate', upload.single('food_image'), (req, res, next) => {
  console.log('Reached /food-plate route');
  analyzeFoodPlate(req, res, next);
});
router.post('/food-ingredient', (req, res, next) => {
  console.log('Reached /food-ingredient route, User:', req.user);
  getFoodIngredientDetails(req, res, next);
});
router.post('/natural-remedies', (req, res, next) => {
  console.log('Reached /natural-remedies route');
  getNaturalRemedies(req, res, next);
});

module.exports = router;