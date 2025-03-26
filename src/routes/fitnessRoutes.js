// src/routes/fitnessRoutes.js
import { Router } from 'express';

// Factory function to create routes with a passed supabase instance
export default function createFitnessRoutes(supabase) {
  const router = Router();

  // Workout controller functions
  const generateWorkoutPlan = (req, res) => {
    try {
      const { age, gender, weight, height, fitnessLevel, goals, equipment, timeAvailable } = req.body;
      
      if (!age || !gender || !weight || !height || !fitnessLevel || !goals) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const workoutPlan = {
        name: `Custom ${fitnessLevel} Plan`,
        days: [
          {
            name: 'Day 1 - Upper Body',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: '8-10' },
              { name: 'Pull Ups', sets: 3, reps: '8-10' },
              { name: 'Shoulder Press', sets: 3, reps: '8-10' }
            ]
          },
          {
            name: 'Day 2 - Lower Body',
            exercises: [
              { name: 'Squats', sets: 3, reps: '8-10' },
              { name: 'Deadlifts', sets: 3, reps: '8-10' },
              { name: 'Lunges', sets: 3, reps: '8-10' }
            ]
          }
        ],
        tips: [
          'Focus on form over weight',
          'Ensure proper nutrition for recovery',
          'Stay consistent with your schedule'
        ]
      };
      
      res.status(200).json({ success: true, data: workoutPlan });
    } catch (error) {
      console.error('Error generating workout plan:', error);
      res.status(500).json({ error: 'Failed to generate workout plan' });
    }
  };

  // Exercise controller function
  const getExerciseDetails = (req, res) => {
    try {
      const { exerciseId } = req.body;
      
      if (!exerciseId) {
        return res.status(400).json({ error: 'Exercise ID is required' });
      }
      
      const exercise = {
        id: exerciseId,
        name: 'Squat',
        muscle_groups: ['Quadriceps', 'Hamstrings', 'Glutes', 'Core'],
        difficulty: 'Intermediate',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Lower your body by bending knees and pushing hips back',
          'Keep chest up and back straight',
          'Return to starting position'
        ],
        variations: ['Goblet Squat', 'Front Squat', 'Sumo Squat'],
        tips: ['Keep weight on heels', 'Knees should track over toes']
      };
      
      res.status(200).json({ success: true, data: exercise });
    } catch (error) {
      console.error('Error fetching exercise details:', error);
      res.status(500).json({ error: 'Failed to get exercise details' });
    }
  };

  // Nutrition controller functions
  const getNutritionAdvice = (req, res) => {
    try {
      const { goals, dietType = 'carnivore' } = req.body;
      
      if (!goals) {
        return res.status(400).json({ error: 'Goals are required' });
      }
      
      const nutritionAdvice = {
        macros: {
          protein: '30-35%',
          fat: '60-65%',
          carbs: '0-5%'
        },
        recommendedFoods: [
          'Grass-fed beef',
          'Pasture-raised eggs',
          'Wild-caught salmon',
          'Butter or ghee',
          'Organ meats (liver, heart)'
        ],
        mealTiming: {
          frequency: '2-3 meals per day',
          windowLength: '6-8 hour eating window recommended'
        },
        tips: [
          'Focus on nutrient density',
          'Include a variety of animal proteins',
          'Consider adding organ meats for micronutrients',
          'Stay well hydrated'
        ]
      };
      
      res.status(200).json({ success: true, data: nutritionAdvice });
    } catch (error) {
      console.error('Error generating nutrition advice:', error);
      res.status(500).json({ error: 'Failed to generate nutrition advice' });
    }
  };

  const getCarnivoreTips = (req, res) => {
    try {
      const { experience = 'beginner' } = req.body;
      
      const carnivoreTips = {
        gettingStarted: [
          'Start with a 30-day elimination phase',
          'Focus on beef, salt, and water initially',
          'Gradually introduce other animal foods',
          'Monitor how you feel and adjust accordingly'
        ],
        commonChallenges: [
          'Initial adaptation period (1-2 weeks)',
          'Electrolyte balance',
          'Social situations and dining out',
          'Finding quality sources of meat'
        ],
        advancedStrategies: experience === 'advanced' ? [
          'Experiment with nose-to-tail eating',
          'Consider intermittent fasting',
          'Adjust fat-to-protein ratio based on goals',
          'Seasonal eating patterns'
        ] : [],
        resources: [
          'Books: "The Carnivore Code" by Dr. Paul Saladino',
          'Communities: Carnivore subreddit, Facebook groups',
          'Podcasts: The Carnivore Cast, Human Performance Outliers'
        ]
      };
      
      res.status(200).json({ success: true, data: carnivoreTips });
    } catch (error) {
      console.error('Error generating carnivore tips:', error);
      res.status(500).json({ error: 'Failed to generate carnivore tips' });
    }
  };

  // Meal planning controller function
  const generateCustomMealPlan = (req, res) => {
    try {
      const { 
        calorieTarget, 
        mealsPerDay = 3,
        dietType = 'carnivore',
        preferences = [],
        restrictions = []
      } = req.body;
      
      if (!calorieTarget) {
        return res.status(400).json({ error: 'Calorie target is required' });
      }
      
      const mealPlan = {
        dailyCalories: calorieTarget,
        macroBreakdown: {
          protein: Math.round(calorieTarget * 0.3 / 4),
          fat: Math.round(calorieTarget * 0.7 / 9),
          carbs: 0
        },
        meals: [
          {
            name: 'Breakfast',
            foods: [
              { name: 'Ribeye Steak', amount: '8 oz', calories: 600 },
              { name: 'Eggs', amount: '3 whole', calories: 210 },
              { name: 'Butter', amount: '1 tbsp', calories: 100 }
            ]
          },
          {
            name: 'Lunch',
            foods: [
              { name: 'Ground Beef', amount: '6 oz', calories: 450 },
              { name: 'Bacon', amount: '3 slices', calories: 130 },
              { name: 'Beef Tallow', amount: '1 tbsp', calories: 115 }
            ]
          },
          {
            name: 'Dinner',
            foods: [
              { name: 'Salmon', amount: '8 oz', calories: 400 },
              { name: 'Beef Liver', amount: '2 oz', calories: 130 },
              { name: 'Ghee', amount: '1 tbsp', calories: 120 }
            ]
          }
        ],
        tips: [
          'Adjust portion sizes based on hunger and satiety',
          'Focus on fatty cuts of meat for optimal energy',
          'Consider adding salt to meals for electrolyte balance',
          'Drink water when thirsty throughout the day'
        ]
      };
      
      res.status(200).json({ success: true, data: mealPlan });
    } catch (error) {
      console.error('Error generating meal plan:', error);
      res.status(500).json({ error: 'Failed to generate meal plan' });
    }
  };

  // Food Directory controller function (using Supabase food_items table)
  const getFoodDirectory = async (req, res) => {
    try {
      const { search_term = '', category = '' } = req.body;

      // Build Supabase query using food_items table
      let query = supabase
        .from('food_items')
        .select('name, energy, protein, measure, total_lipid_fat, carbohydrate_by_difference, sodium_na, fatty_acids_total_trans, ingredients')
        .limit(50);

      if (search_term) {
        query = query.ilike('name', `%${search_term}%`);
      }
      if (category) {
        query = query.eq('category', category); // Assumes 'category' column exists; adjust if different
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        return res.status(500).json({ error: 'Failed to fetch food directory', details: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'No foods found matching the criteria' });
      }

      // Format response
      const foods = data.map(food => ({
        name: food.name,
        energy: food.energy || '0 kcal',
        protein: food.protein || '0 g',
        measure: food.measure || '100g',
        total_lipid_fat: food.total_lipid_fat || '0 g',
        carbohydrate_by_difference: food.carbohydrate_by_difference || '0 g',
        sodium_na: food.sodium_na || '0 mg',
        fatty_acids_total_trans: food.fatty_acids_total_trans || '0 g',
        ingredients: food.ingredients || 'unknown'
      }));

      res.status(200).json({ success: true, data: { foods } });
    } catch (error) {
      console.error('Error fetching food directory:', error);
      res.status(500).json({ error: 'Failed to fetch food directory', details: error.message });
    }
  };

  // API Routes
  router.post('/generateWorkoutPlan', generateWorkoutPlan);
  router.post('/exerciseDetails', getExerciseDetails);
  router.post('/nutritionAdvice', getNutritionAdvice);
  router.post('/customMealPlan', generateCustomMealPlan);
  router.post('/carnivoreTips', getCarnivoreTips);
  router.post('/foodDirectory', getFoodDirectory);

  return router;
}