// services/mealPlanService.js

const generateCustomMealPlan = (goal, fitness_level, dietary_preferences, health_conditions, meals_per_day, plan_duration_days, custom_goals, carnivore_focus, lang) => {
    // Base structure for meal plan
    const mealPlan = {
      goal: goal,
      fitness_level: fitness_level || 'Intermediate',
      custom_goals: custom_goals || [],
      plan_duration_days: plan_duration_days || 7,
      meals_per_day: meals_per_day,
      daily_plans: []
    };
  
    // Generate daily meal plans
    for (let day = 1; day <= Math.min(plan_duration_days || 7, 7); day++) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day % 7];
      
      const meals = [];
      for (let meal = 1; meal <= meals_per_day; meal++) {
        let mealName;
        switch (meal) {
          case 1: mealName = 'Breakfast'; break;
          case 2: mealName = meals_per_day <= 3 ? 'Lunch' : 'Mid-Morning Snack'; break;
          case 3: mealName = meals_per_day <= 3 ? 'Dinner' : 'Lunch'; break;
          case 4: mealName = 'Afternoon Snack'; break;
          case 5: mealName = 'Dinner'; break;
          default: mealName = `Meal ${meal}`;
        }
  
        if (carnivore_focus) {
          // Carnivore meal options
          switch (mealName) {
            case 'Breakfast':
              meals.push({
                name: mealName,
                foods: [
                  {
                    name: day % 2 === 0 ? 'Steak and Eggs' : 'Bacon and Eggs',
                    description: day % 2 === 0 ? 
                      '6oz ribeye steak with 3 eggs cooked in butter' : 
                      '6 slices of bacon with 3 eggs cooked in the bacon fat',
                    macros: {
                      protein: day % 2 === 0 ? '45g' : '38g',
                      fat: day % 2 === 0 ? '48g' : '52g',
                      carbs: '0g'
                    },
                    calories: day % 2 === 0 ? 650 : 550
                  }
                ]
              });
              break;
            case 'Lunch':
              meals.push({
                name: mealName,
                foods: [
                  {
                    name: day % 3 === 0 ? 'Burger Patties with Cheese' : (day % 3 === 1 ? 'Grilled Salmon' : 'Roast Beef'),
                    description: day % 3 === 0 ? 
                      '8oz of ground beef formed into patties with cheese on top' : 
                      (day % 3 === 1 ? '6oz of grilled salmon with butter' : '6oz of roast beef'),
                    macros: {
                      protein: day % 3 === 0 ? '50g' : (day % 3 === 1 ? '42g' : '45g'),
                      fat: day % 3 === 0 ? '45g' : (day % 3 === 1 ? '38g' : '28g'),
                      carbs: '0g'
                    },
                    calories: day % 3 === 0 ? 680 : (day % 3 === 1 ? 560 : 520)
                  }
                ]
              });
              break;
            case 'Dinner':
              meals.push({
                name: mealName,
                foods: [
                  {
                    name: day % 4 === 0 ? 'T-Bone Steak' : (day % 4 === 1 ? 'Lamb Chops' : (day % 4 === 2 ? 'Pork Ribs' : 'Duck Breast')),
                    description: `8oz of ${day % 4 === 0 ? 'T-bone steak' : (day % 4 === 1 ? 'lamb chops' : (day % 4 === 2 ? 'pork ribs' : 'duck breast'))} cooked in animal fat`,
                    macros: {
                      protein: '45-50g',
                      fat: '35-45g',
                      carbs: '0g'
                    },
                    calories: 700
                  }
                ]
              });
              break;
            case 'Mid-Morning Snack':
            case 'Afternoon Snack':
              meals.push({
                name: mealName,
                foods: [
                  {
                    name: 'Beef Jerky and Cheese',
                    description: '2oz of beef jerky with 1oz of cheese',
                    macros: {
                      protein: '20g',
                      fat: '15g',
                      carbs: '0g'
                    },
                    calories: 250
                  }
                ]
              });
              break;
            default:
              meals.push({
                name: mealName,
                foods: [
                  {
                    name: 'Hard-Boiled Eggs',
                    description: '3 hard-boiled eggs with salt',
                    macros: {
                      protein: '18g',
                      fat: '15g',
                      carbs: '0g'
                    },
                    calories: 210
                  }
                ]
              });
          }
        } else {
          // Standard balanced meal options based on dietary preferences
          let foodOptions = [];
          
          // Check for dietary preferences
          const isHighProtein = dietary_preferences.includes('High protein');
          const isLowCarb = dietary_preferences.includes('Low carb');
          const isVegetarian = dietary_preferences.includes('Vegetarian');
          const isVegan = dietary_preferences.includes('Vegan');
          
          switch (mealName) {
            case 'Breakfast':
              if (isVegan) {
                foodOptions = [
                  {
                    name: 'Tofu Scramble with Vegetables',
                    description: 'Scrambled tofu with spinach, bell peppers, and nutritional yeast',
                    macros: {
                      protein: '20g',
                      fat: '12g',
                      carbs: '15g'
                    },
                    calories: 320
                  },
                  {
                    name: 'Overnight Oats with Fruit',
                    description: 'Rolled oats soaked in almond milk with chia seeds, berries, and nut butter',
                    macros: {
                      protein: '12g',
                      fat: '14g',
                      carbs: '45g'
                    },
                    calories: 380
                  }
                ];
              } else if (isVegetarian) {
                foodOptions = [
                  {
                    name: 'Greek Yogurt Bowl',
                    description: 'Greek yogurt with berries, nuts, and a drizzle of honey',
                    macros: {
                      protein: '25g',
                      fat: '15g',
                      carbs: '30g'
                    },
                    calories: 350
                  },
                  {
                    name: 'Vegetable Omelette',
                    description: 'Three-egg omelette with mixed vegetables and a small amount of cheese',
                    macros: {
                      protein: '22g',
                      fat: '16g',
                      carbs: '8g'
                    },
                    calories: 340
                  }
                ];
              } else if (isHighProtein) {
                foodOptions = [
                  {
                    name: 'Protein Pancakes',
                    description: 'Protein-rich pancakes topped with Greek yogurt and berries',
                    macros: {
                      protein: '35g',
                      fat: '12g',
                      carbs: '30g'
                    },
                    calories: 400
                  },
                  {
                    name: 'Steak and Eggs',
                    description: 'Lean steak with two eggs and spinach',
                    macros: {
                      protein: '40g',
                      fat: '20g',
                      carbs: '2g'
                    },
                    calories: 450
                  }
                ];
              } else if (isLowCarb) {
                foodOptions = [
                  {
                    name: 'Avocado and Eggs',
                    description: 'Two eggs with half an avocado and spinach',
                    macros: {
                      protein: '16g',
                      fat: '25g',
                      carbs: '8g'
                    },
                    calories: 350
                  },
                  {
                    name: 'Low-Carb Smoothie Bowl',
                    description: 'Protein powder, almond milk, berries, and nuts blended and topped with seeds',
                    macros: {
                      protein: '30g',
                      fat: '20g',
                      carbs: '12g'
                    },
                    calories: 380
                  }
                ];
              } else {
                foodOptions = [
                  {
                    name: 'Whole Grain Toast with Eggs',
                    description: 'Two slices of whole grain toast with two eggs and avocado',
                    macros: {
                      protein: '20g',
                      fat: '18g',
                      carbs: '30g'
                    },
                    calories: 420
                  },
                  {
                    name: 'Breakfast Burrito',
                    description: 'Whole wheat tortilla with eggs, beans, vegetables, and a small amount of cheese',
                    macros: {
                      protein: '25g',
                      fat: '15g',
                      carbs: '40g'
                    },
                    calories: 450
                  }
                ];
              }
              break;
              
            case 'Lunch':
              if (isVegan) {
                foodOptions = [
                  {
                    name: 'Quinoa Power Bowl',
                    description: 'Quinoa with roasted vegetables, chickpeas, and tahini dressing',
                    macros: {
                      protein: '18g',
                      fat: '15g',
                      carbs: '50g'
                    },
                    calories: 450
                  },
                  {
                    name: 'Lentil Soup with Whole Grain Bread',
                    description: 'Hearty lentil soup with vegetables and a slice of whole grain bread',
                    macros: {
                      protein: '20g',
                      fat: '10g',
                      carbs: '55g'
                    },
                    calories: 420
                  }
                ];
              } else if (isVegetarian) {
                foodOptions = [
                  {
                    name: 'Mediterranean Salad',
                    description: 'Mixed greens with feta cheese, olives, chickpeas, and olive oil dressing',
                    macros: {
                      protein: '15g',
                      fat: '20g',
                      carbs: '25g'
                    },
                    calories: 380
                  },
                  {
                    name: 'Veggie Wrap with Hummus',
                    description: 'Whole grain wrap with hummus, mixed vegetables, and feta cheese',
                    macros: {
                      protein: '18g',
                      fat: '15g',
                      carbs: '45g'
                    },
                    calories: 420
                  }
                ];
              } else if (isHighProtein) {
                foodOptions = [
                  {
                    name: 'Grilled Chicken Salad',
                    description: '6oz grilled chicken breast over mixed greens with olive oil dressing',
                    macros: {
                      protein: '40g',
                      fat: '15g',
                      carbs: '10g'
                    },
                    calories: 420
                  },
                  {
                    name: 'Tuna Protein Bowl',
                    description: 'Tuna with brown rice, mixed vegetables, and avocado',
                    macros: {
                      protein: '35g',
                      fat: '15g',
                      carbs: '40g'
                    },
                    calories: 480
                  }
                ];
              } else if (isLowCarb) {
                foodOptions = [
                  {
                    name: 'Lettuce Wrap Burgers',
                    description: 'Beef or turkey burgers wrapped in lettuce with avocado and tomato',
                    macros: {
                      protein: '30g',
                      fat: '25g',
                      carbs: '8g'
                    },
                    calories: 400
                  },
                  {
                    name: 'Zucchini Noodles with Protein',
                    description: 'Zucchini noodles with choice of protein and olive oil-based sauce',
                    macros: {
                      protein: '35g',
                      fat: '20g',
                      carbs: '12g'
                    },
                    calories: 420
                  }
                ];
              } else {
                foodOptions = [
                  {
                    name: 'Turkey and Avocado Sandwich',
                    description: 'Whole grain bread with turkey, avocado, lettuce, and tomato',
                    macros: {
                      protein: '25g',
                      fat: '15g',
                      carbs: '40g'
                    },
                    calories: 450
                  },
                  {
                    name: 'Chicken and Rice Bowl',
                    description: 'Grilled chicken with brown rice, black beans, and mixed vegetables',
                    macros: {
                      protein: '35g',
                      fat: '10g',
                      carbs: '55g'
                    },
                    calories: 480
                  }
                ];
              }
              break;
              
            case 'Dinner':
              if (isVegan) {
                foodOptions = [
                  {
                    name: 'Vegetable Stir-Fry with Tofu',
                    description: 'Tofu stir-fried with mixed vegetables and served over brown rice or cauliflower rice',
                    macros: {
                      protein: '20g',
                      fat: '15g',
                      carbs: '40g'
                    },
                    calories: 420
                  },
                  {
                    name: 'Lentil and Vegetable Curry',
                    description: 'Hearty lentil curry with mixed vegetables and spices',
                    macros: {
                      protein: '18g',
                      fat: '12g',
                      carbs: '50g'
                    },
                    calories: 450
                  }
                ];
              } else if (isVegetarian) {
                foodOptions = [
                  {
                    name: 'Stuffed Bell Peppers',
                    description: 'Bell peppers stuffed with quinoa, black beans, vegetables, and cheese',
                    macros: {
                      protein: '20g',
                      fat: '15g',
                      carbs: '35g'
                    },
                    calories: 400
                  },
                  {
                    name: 'Eggplant Parmesan',
                    description: 'Baked eggplant with tomato sauce, mozzarella, and side of greens',
                    macros: {
                      protein: '18g',
                      fat: '20g',
                      carbs: '30g'
                    },
                    calories: 430
                  }
                ];
              } else if (isHighProtein) {
                foodOptions = [
                  {
                    name: 'Baked Salmon with Vegetables',
                    description: '6oz salmon fillet with roasted vegetables and quinoa',
                    macros: {
                      protein: '40g',
                      fat: '20g',
                      carbs: '30g'
                    },
                    calories: 550
                  },
                  {
                    name: 'Lean Steak with Sweet Potato',
                    description: '6oz lean steak with a medium sweet potato and steamed broccoli',
                    macros: {
                      protein: '45g',
                      fat: '15g',
                      carbs: '30g'
                    },
                    calories: 520
                  }
                ];
              } else if (isLowCarb) {
                foodOptions = [
                  {
                    name: 'Grilled Chicken with Cauliflower Rice',
                    description: 'Grilled chicken breast with cauliflower rice and mixed vegetables',
                    macros: {
                      protein: '35g',
                      fat: '15g',
                      carbs: '12g'
                    },
                    calories: 380
                  },
                  {
                    name: 'Baked Fish with Asparagus',
                    description: 'White fish baked with lemon, herbs, and served with asparagus',
                    macros: {
                      protein: '30g',
                      fat: '12g',
                      carbs: '10g'
                    },
                    calories: 350
                  }
                ];
              } else {
                foodOptions = [
                  {
                    name: 'Grilled Chicken with Brown Rice',
                    description: 'Grilled chicken breast with brown rice and roasted vegetables',
                    macros: {
                      protein: '35g',
                      fat: '10g',
                      carbs: '50g'
                    },
                    calories: 480
                  },
                  {
                    name: 'Baked Fish Tacos',
                    description: 'Baked white fish in corn tortillas with cabbage slaw and avocado',
                    macros: {
                      protein: '30g',
                      fat: '15g',
                      carbs: '40g'
                    },
                    calories: 450
                  }
                ];
              }
              break;
              
            case 'Mid-Morning Snack':
            case 'Afternoon Snack':
              if (isVegan) {
                foodOptions = [
                  {
                    name: 'Apple with Almond Butter',
                    description: 'Medium apple with 1 tbsp almond butter',
                    macros: {
                      protein: '4g',
                      fat: '10g',
                      carbs: '25g'
                    },
                    calories: 200
                  },
                  {
                    name: 'Trail Mix',
                    description: 'Mixed nuts, seeds, and dried fruits',
                    macros: {
                      protein: '6g',
                      fat: '15g',
                      carbs: '20g'
                    },
                    calories: 250
                  }
                ];
              } else if (isVegetarian) {
                foodOptions = [
                  {
                    name: 'Greek Yogurt with Honey',
                    description: '1 cup Greek yogurt with honey and berries',
                    macros: {
                      protein: '20g',
                      fat: '5g',
                      carbs: '15g'
                    },
                    calories: 200
                  },
                  {
                    name: 'Cottage Cheese with Fruit',
                    description: '1/2 cup cottage cheese with sliced fruit',
                    macros: {
                      protein: '15g',
                      fat: '4g',
                      carbs: '15g'
                    },
                    calories: 180
                  }
                ];
              } else if (isHighProtein) {
                foodOptions = [
                  {
                    name: 'Protein Shake',
                    description: 'Protein powder mixed with water or milk and a banana',
                    macros: {
                      protein: '25g',
                      fat: '5g',
                      carbs: '25g'
                    },
                    calories: 250
                  },
                  {
                    name: 'Turkey and Cheese Roll-Ups',
                    description: 'Sliced turkey and cheese rolled up',
                    macros: {
                      protein: '20g',
                      fat: '10g',
                      carbs: '2g'
                    },
                    calories: 180
                  }
                ];
              } else if (isLowCarb) {
                foodOptions = [
                  {
                    name: 'Hard-Boiled Eggs',
                    description: '2 hard-boiled eggs with a pinch of salt',
                    macros: {
                      protein: '12g',
                      fat: '10g',
                      carbs: '0g'
                    },
                    calories: 140
                  },
                  {
                    name: 'Celery with Almond Butter',
                    description: 'Celery sticks with 1 tbsp almond butter',
                    macros: {
                      protein: '4g',
                      fat: '10g',
                      carbs: '5g'
                    },
                    calories: 120
                  }
                ];
              } else {
                foodOptions = [
                  {
                    name: 'Fruit and Nut Bar',
                    description: 'Natural fruit and nut bar with minimal ingredients',
                    macros: {
                      protein: '5g',
                      fat: '12g',
                      carbs: '25g'
                    },
                    calories: 220
                  },
                  {
                    name: 'Hummus and Carrots',
                    description: '1/4 cup hummus with carrot sticks',
                    macros: {
                      protein: '5g',
                      fat: '8g',
                      carbs: '15g'
                    },
                    calories: 180
                  }
                ];
              }
              break;
              
            default:
              foodOptions = [
                {
                  name: 'Mixed Nuts',
                  description: 'A handful of mixed nuts',
                  macros: {
                    protein: '6g',
                    fat: '15g',
                    carbs: '6g'
                  },
                  calories: 170
                },
                {
                  name: 'Fruit',
                  description: 'A piece of fresh fruit',
                  macros: {
                    protein: '1g',
                    fat: '0g',
                    carbs: '25g'
                  },
                  calories: 100
                }
              ];
          }
          
          // Select one of the food options for this meal (alternating based on day)
          const foodOptionIndex = (day + meals.length) % foodOptions.length;
          meals.push({
            name: mealName,
            foods: [foodOptions[foodOptionIndex]]
          });
        }
      }
  
      mealPlan.daily_plans.push({
        day: dayName,
        meals: meals
      });
    }
  
    // Add dietary notes based on preferences
    mealPlan.dietary_notes = [];
    
    if (carnivore_focus) {
      mealPlan.dietary_notes = [
        "This meal plan focuses on animal-based foods as per the carnivore approach",
        "Ensure adequate fat intake to maintain energy levels",
        "Consider including organ meats 1-2 times weekly for micronutrients",
        "Stay well-hydrated and consider electrolyte supplementation",
        "This is provided as an option based on your request, though balanced nutrition typically includes some plant foods"
      ];
    } else {
      mealPlan.dietary_notes = [
        "This meal plan emphasizes balanced nutrition with adequate protein",
        "Includes a variety of foods to ensure micronutrient intake",
        "Focuses on whole food sources of nutrients",
        "Stay well-hydrated by drinking at least 8 glasses of water daily"
      ];
      
      // Add specific notes based on dietary preferences
      if (dietary_preferences.includes('High protein')) {
        mealPlan.dietary_notes.push("Emphasizes higher protein intake to support your fitness goals");
      }
      
      if (dietary_preferences.includes('Low carb')) {
        mealPlan.dietary_notes.push("Reduces carbohydrate content while maintaining nutritional adequacy");
      }
      
      if (dietary_preferences.includes('Vegetarian')) {
        mealPlan.dietary_notes.push("Provides adequate protein through plant sources and dairy/eggs");
      }
      
      if (dietary_preferences.includes('Vegan')) {
        mealPlan.dietary_notes.push("Ensures complete nutrition through varied plant protein sources");
        mealPlan.dietary_notes.push("Consider supplementing with vitamin B12, which is primarily found in animal foods");
      }
    }
  
    // Handle health conditions
    if (health_conditions && health_conditions.length > 0 && !health_conditions.includes('None')) {
      mealPlan.dietary_notes.push(`This plan takes into account your health conditions: ${health_conditions.join(', ')}`);
      mealPlan.dietary_notes.push("Always consult with a healthcare professional for personalized nutrition advice based on your health conditions.");
    }
  
    // Handle custom goals
    if (custom_goals && custom_goals.length > 0) {
      mealPlan.dietary_notes.push(`This plan is designed to support your custom goals: ${custom_goals.join(', ')}`);
    }
  
    // Add SEO information
    mealPlan.seo_title = `${plan_duration_days || 7}-Day ${carnivore_focus ? 'Carnivore' : 'Balanced'} Meal Plan for ${goal}`;
    mealPlan.seo_content = `Follow this customized ${plan_duration_days || 7}-day meal plan designed for ${fitness_level || 'intermediate'} fitness levels to help you ${goal.toLowerCase()}.`;
    mealPlan.seo_keywords = `meal plan, ${goal.toLowerCase()}, ${carnivore_focus ? 'carnivore diet' : 'balanced nutrition'}, healthy eating`;
  
    return mealPlan;
  };
  
  module.exports = {
    generateCustomMealPlan
  };