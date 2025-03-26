// services/nutritionService.js

const getNutritionAdvice = (goal, dietary_restrictions, current_weight, target_weight, daily_activity_level, include_carnivore_options, lang) => {
    // Calculate basic calorie needs based on activity level
    let baseCalories = current_weight * 22; // Simplified calculation
    
    switch (daily_activity_level) {
      case 'Sedentary':
        baseCalories *= 1.2;
        break;
      case 'Moderate':
        baseCalories *= 1.5;
        break;
      case 'Active':
        baseCalories *= 1.8;
        break;
      default:
        baseCalories *= 1.5;
    }
  
    // Adjust calories based on goal
    let caloriesPerDay = baseCalories;
    if (goal === 'Lose weight' && target_weight < current_weight) {
      caloriesPerDay = baseCalories - 500; // Create a deficit
    } else if (goal === 'Gain muscle' && target_weight > current_weight) {
      caloriesPerDay = baseCalories + 300; // Create a surplus
    }
  
    // Default macronutrient splits
    let macronutrients = {
      carbohydrates: '45%',
      proteins: '30%',
      fats: '25%'
    };
  
    // Adjust for carnivore options if requested
    let mealSuggestions = [];
    let dietaryNotes = [];
  
    if (include_carnivore_options) {
      macronutrients = {
        carbohydrates: '5%',
        proteins: '35%',
        fats: '60%'
      };
      
      mealSuggestions = [
        {
          meal: 'Breakfast',
          suggestions: [
            {
              name: 'Steak and Eggs',
              ingredients: [
                '6oz ribeye steak',
                '3 whole eggs',
                '1 tbsp butter'
              ],
              calories: 650
            },
            {
              name: 'Bacon and Eggs',
              ingredients: [
                '6 slices bacon',
                '3 whole eggs',
                '1 oz cheese'
              ],
              calories: 550
            }
          ]
        },
        {
          meal: 'Lunch',
          suggestions: [
            {
              name: 'Burger Patties',
              ingredients: [
                '8oz ground beef (formed into patties)',
                '2 slices cheese',
                '1 tbsp butter for cooking'
              ],
              calories: 700
            },
            {
              name: 'Chicken Thighs with Bacon',
              ingredients: [
                '6oz chicken thighs (skin-on)',
                '2 slices bacon',
                '1 tbsp butter for cooking'
              ],
              calories: 550
            }
          ]
        },
        {
          meal: 'Dinner',
          suggestions: [
            {
              name: 'Salmon and Butter',
              ingredients: [
                '8oz salmon fillet',
                '2 tbsp butter',
                '2 tbsp heavy cream (as sauce)'
              ],
              calories: 650
            },
            {
              name: 'Ribeye Steak',
              ingredients: [
                '10oz ribeye steak',
                '1 tbsp butter for cooking',
                '2 eggs (optional)'
              ],
              calories: 800
            }
          ]
        }
      ];
      
      dietaryNotes = [
        "The carnivore diet consists primarily of animal products with minimal to no plant foods",
        "Focus on fatty cuts of meat to ensure adequate fat intake",
        "Consider including organ meats for micronutrient diversity",
        "Supplement electrolytes if needed, especially during adaptation phase",
        "This is provided as an option based on your request, but balanced nutrition typically includes some plant foods for fiber and phytonutrients"
      ];
    } else {
      // Standard balanced meal suggestions
      mealSuggestions = [
        {
          meal: 'Breakfast',
          suggestions: [
            {
              name: 'Greek Yogurt with Berries and Nuts',
              ingredients: [
                '1 cup greek yogurt',
                '1/2 cup mixed berries',
                '1 tbsp honey',
                '1 oz mixed nuts'
              ],
              calories: 350
            },
            {
              name: 'Vegetable Omelette',
              ingredients: [
                '3 eggs',
                '1 cup mixed vegetables (spinach, peppers, onions)',
                '1 oz cheese',
                '1 tbsp olive oil'
              ],
              calories: 400
            }
          ]
        },
        {
          meal: 'Lunch',
          suggestions: [
            {
              name: 'Grilled Chicken Salad',
              ingredients: [
                '6oz grilled chicken breast',
                '2 cups mixed greens',
                '1/2 cup cherry tomatoes',
                '1/4 cup cucumber',
                '2 tbsp vinaigrette dressing'
              ],
              calories: 450
            },
            {
              name: 'Quinoa Bowl',
              ingredients: [
                '1 cup cooked quinoa',
                '4oz grilled chicken or tofu',
                '1 cup roasted vegetables',
                '1 tbsp olive oil',
                '1/4 avocado'
              ],
              calories: 500
            }
          ]
        },
        {
          meal: 'Dinner',
          suggestions: [
            {
              name: 'Baked Salmon with Vegetables',
              ingredients: [
                '6oz salmon fillet',
                '1 cup roasted vegetables',
                '1/2 cup quinoa or brown rice',
                '1 tbsp olive oil'
              ],
              calories: 550
            },
            {
              name: 'Lean Steak with Sweet Potato',
              ingredients: [
                '6oz lean steak',
                '1 medium sweet potato',
                '1 cup steamed broccoli',
                '1 tbsp olive oil'
              ],
              calories: 600
            }
          ]
        }
      ];
      
      dietaryNotes = [
        "A balanced diet typically includes a variety of food groups",
        "Aim for a colorful plate with multiple vegetables for optimal micronutrient intake",
        "Stay hydrated by drinking at least 8 glasses of water daily",
        "Consider timing your protein intake around workouts for optimal muscle recovery"
      ];
    }
  
    // Handle dietary restrictions
    if (dietary_restrictions && dietary_restrictions.length > 0) {
      dietaryNotes.push(`Your plan accounts for your ${dietary_restrictions.join(', ')} dietary restriction(s).`);
    }
  
    return {
      goal: goal,
      calories_per_day: Math.round(caloriesPerDay),
      macronutrients: macronutrients,
      meal_suggestions: mealSuggestions,
      dietary_notes: dietaryNotes,
      seo_title: `Personalized Nutrition Plan for ${goal}`,
      seo_content: `Discover a comprehensive nutrition plan designed to help you ${goal.toLowerCase()} through balanced nutrition and delicious meals.`,
      seo_keywords: `nutrition plan, ${goal.toLowerCase()}, balanced diet, healthy eating, ${include_carnivore_options ? 'carnivore diet' : 'meal planning'}`
    };
  };
  
  const getCarnivoreTips = (experience_level, health_conditions, specific_concerns, lang) => {
    // Base tips for all carnivore dieters
    const baseTips = [
      {
        title: "Focus on Nutrient Density",
        content: "Prioritize nutrient-dense animal foods such as organ meats, eggs, and fatty fish to ensure you're getting a wide range of vitamins and minerals."
      },
      {
        title: "Fat Adaptation",
        content: "Allow 2-4 weeks for your body to fully adapt to using fat as its primary fuel source. Energy levels may fluctuate during this transition period."
      },
      {
        title: "Electrolyte Management",
        content: "Pay attention to sodium, potassium, and magnesium intake. Consider adding sea salt to meals and potentially supplementing with magnesium."
      },
      {
        title: "Meal Frequency",
        content: "Listen to your hunger signals. Many people naturally gravitate toward 1-2 meals per day due to the satiating nature of animal foods."
      },
      {
        title: "Food Quality",
        content: "When possible, choose grass-fed, pasture-raised animal products to maximize nutrient content and minimize exposure to feed additives."
      }
    ];
  
    // Experience level specific tips
    let experienceTips = [];
    switch(experience_level) {
      case 'beginner':
        experienceTips = [
          {
            title: "Start Simple",
            content: "Begin with familiar animal foods like beef, eggs, and fish before exploring organ meats and other options."
          },
          {
            title: "Gradual Transition",
            content: "Consider a gradual transition by eliminating plant foods one category at a time rather than going fully carnivore immediately."
          },
          {
            title: "Track Symptoms",
            content: "Keep a daily journal to track energy levels, digestion, sleep quality, and any other changes you notice."
          }
        ];
        break;
      case 'intermediate':
        experienceTips = [
          {
            title: "Experiment with Organ Meats",
            content: "Begin incorporating organ meats like liver, heart, and kidney for additional nutrients."
          },
          {
            title: "Fine-tune Fat Ratios",
            content: "Experiment with different fat-to-protein ratios to find what works best for your energy levels and satiety."
          },
          {
            title: "Consider Intermittent Fasting",
            content: "Many carnivore dieters find benefits in combining the diet with intermittent fasting patterns."
          }
        ];
        break;
      case 'advanced':
        experienceTips = [
          {
            title: "Nose-to-Tail Eating",
            content: "Incorporate a full spectrum of animal parts including bone marrow, suet, and connective tissues for complete nutrition."
          },
          {
            title: "Seasonal Adjustments",
            content: "Consider adjusting your fat-to-protein ratio seasonally, potentially increasing fat in colder months."
          },
          {
            title: "Targeted Reintroduction",
            content: "If desired, experiment with careful reintroduction of specific plant foods to determine tolerance and effects."
          }
        ];
        break;
      default:
        experienceTips = [
          {
            title: "Start Simple",
            content: "Begin with familiar animal foods like beef, eggs, and fish before exploring organ meats and other options."
          },
          {
            title: "Gradual Transition",
            content: "Consider a gradual transition by eliminating plant foods one category at a time rather than going fully carnivore immediately."
          }
        ];
    }
  
    // Health condition specific advice
    let healthTips = [];
    if (health_conditions && health_conditions.length > 0) {
      healthTips.push({
        title: "Medical Supervision",
        content: "Given your health conditions, consider working with a healthcare provider who is knowledgeable about low-carb and carnivore approaches."
      });
  
      // Add condition-specific tips
      health_conditions.forEach(condition => {
        if (condition.toLowerCase().includes('diabetes')) {
          healthTips.push({
            title: "Blood Sugar Monitoring",
            content: "Monitor blood glucose closely as the carnivore diet can significantly impact insulin requirements."
          });
        }
        
        if (condition.toLowerCase().includes('thyroid')) {
          healthTips.push({
            title: "Iodine Sources",
            content: "Ensure adequate iodine intake through seafood or supplementation, as this is crucial for thyroid function."
          });
        }
        
        if (condition.toLowerCase().includes('heart') || condition.toLowerCase().includes('cardiovascular')) {
          healthTips.push({
            title: "Cardiovascular Markers",
            content: "Monitor blood lipids and other cardiovascular markers, as significant changes are common when switching to a carnivore diet."
          });
        }
      });
    }
  
    // Specific concerns advice
    let concernTips = [];
    if (specific_concerns && specific_concerns.length > 0) {
      specific_concerns.forEach(concern => {
        if (concern.toLowerCase().includes('performance') || concern.toLowerCase().includes('athlete')) {
          concernTips.push({
            title: "Athletic Performance",
            content: "Allow 4-12 weeks for full fat adaptation before judging athletic performance. Consider strategic carbohydrate intake around intense training if needed."
          });
        }
        
        if (concern.toLowerCase().includes('digest')) {
          concernTips.push({
            title: "Digestive Adaptation",
            content: "Digestive changes are common initially. Consider digestive enzymes or adjusting fat intake if persistent issues occur."
          });
        }
        
        if (concern.toLowerCase().includes('cost') || concern.toLowerCase().includes('budget')) {
          concernTips.push({
            title: "Budget-Friendly Options",
            content: "Focus on ground beef, eggs, and more affordable cuts. Consider buying in bulk, using a chest freezer, or exploring direct-from-farm options."
          });
        }
      });
    }
  
    // Compile all tips
    const allTips = [
      ...baseTips,
      ...experienceTips,
      ...healthTips,
      ...concernTips
    ];
  
    return {
      experience_level: experience_level || 'beginner',
      tips: allTips,
      resources: [
        {
          title: "Adaptation Phase Guide",
          content: "A comprehensive guide to navigating the first 30 days of a carnivore diet."
        },
        {
          title: "Nutrient Sourcing",
          content: "Information on obtaining key nutrients from various animal foods."
        },
        {
          title: "Common Adjustments",
          content: "Solutions to common challenges when following a carnivore approach."
        }
      ],
      disclaimer: "This information is provided for educational purposes only and is not medical advice. Consult with a healthcare professional before making significant dietary changes, especially if you have existing health conditions.",
      seo_title: `Carnivore Diet Tips for ${experience_level || 'Beginners'}`,
      seo_content: `Expert guidance for following a carnivore diet approach, with specific tips for ${experience_level || 'beginners'} and solutions for common challenges.`,
      seo_keywords: `carnivore diet, animal-based nutrition, ${experience_level || 'beginner'} carnivore tips, meat-based diet`
    };
  };
  
  module.exports = {
    getNutritionAdvice,
    getCarnivoreTips
  };