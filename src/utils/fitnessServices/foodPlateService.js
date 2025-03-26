// services/foodPlateService.js

const analyzeFoodPlate = (image_url, food_items, lang) => {
    // In a real implementation, this would use image recognition or process the food items
    // For this example, we'll handle the food_items case
    
    let foods_identified = [];
    let portion_sizes = {};
    let estimated_calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;
    
    if (food_items && food_items.length > 0) {
      foods_identified = food_items.map(item => item.name || item);
      
      // Simple food database with approximate nutritional values
      const foodDatabase = {
        'steak': { calories: 250, protein: 26, carbs: 0, fats: 17, portion: '4 oz' },
        'chicken breast': { calories: 165, protein: 31, carbs: 0, fats: 3.6, portion: '4 oz' },
        'salmon': { calories: 233, protein: 25, carbs: 0, fats: 15, portion: '4 oz' },
        'eggs': { calories: 72, protein: 6, carbs: 0.6, fats: 5, portion: '1 egg' },
        'bacon': { calories: 43, protein: 3, carbs: 0.1, fats: 3.3, portion: '1 slice' },
        'cheese': { calories: 113, protein: 7, carbs: 0.4, fats: 9, portion: '1 oz' },
        'rice': { calories: 206, protein: 4.3, carbs: 45, fats: 0.4, portion: '1 cup cooked' },
        'broccoli': { calories: 55, protein: 3.7, carbs: 11.2, fats: 0.6, portion: '1 cup' },
        'avocado': { calories: 234, protein: 2.9, carbs: 12.5, fats: 21, portion: '1 whole' },
        'burger patty': { calories: 354, protein: 20, carbs: 0, fats: 30, portion: '6 oz' },
        'sweet potato': { calories: 114, protein: 2.1, carbs: 27, fats: 0.1, portion: '1 medium' },
        'quinoa': { calories: 222, protein: 8.1, carbs: 39.4, fats: 3.6, portion: '1 cup cooked' },
        'lettuce': { calories: 5, protein: 0.5, carbs: 1, fats: 0.1, portion: '1 cup' },
        'tomato': { calories: 22, protein: 1.1, carbs: 4.8, fats: 0.2, portion: '1 medium' },
        'apple': { calories: 95, protein: 0.5, carbs: 25, fats: 0.3, portion: '1 medium' },
        'banana': { calories: 105, protein: 1.3, carbs: 27, fats: 0.4, portion: '1 medium' },
        'olive oil': { calories: 119, protein: 0, carbs: 0, fats: 13.5, portion: '1 tbsp' },
        'butter': { calories: 102, protein: 0.1, carbs: 0, fats: 11.5, portion: '1 tbsp' },
        'almond butter': { calories: 101, protein: 2.4, carbs: 3, fats: 9.5, portion: '1 tbsp' },
        'chicken thigh': { calories: 209, protein: 26, carbs: 0, fats: 10.9, portion: '4 oz' },
        'ground beef': { calories: 231, protein: 23, carbs: 0, fats: 15, portion: '4 oz' },
        'pork chop': { calories: 199, protein: 26, carbs: 0, fats: 10, portion: '4 oz' },
        'tofu': { calories: 94, protein: 10, carbs: 2.3, fats: 6, portion: '4 oz' },
        'beans': { calories: 227, protein: 15, carbs: 40, fats: 1, portion: '1 cup cooked' },
        'lentils': { calories: 230, protein: 18, carbs: 40, fats: 0.8, portion: '1 cup cooked' },
        'greek yogurt': { calories: 130, protein: 12, carbs: 5, fats: 8, portion: '6 oz' },
        'potato': { calories: 163, protein: 4.3, carbs: 37, fats: 0.2, portion: '1 medium' },
        'bread': { calories: 80, protein: 3, carbs: 15, fats: 1, portion: '1 slice' },
        'pasta': { calories: 221, protein: 8.1, carbs: 43.2, fats: 1.3, portion: '1 cup cooked' },
        'oats': { calories: 166, protein: 5.9, carbs: 28, fats: 3.6, portion: '1/2 cup dry' },
        'milk': { calories: 149, protein: 8, carbs: 12, fats: 8, portion: '1 cup' },
        'almond milk': { calories: 39, protein: 1.5, carbs: 3.5, fats: 2.5, portion: '1 cup' },
        'vegetables': { calories: 50, protein: 2, carbs: 10, fats: 0, portion: '1 cup' },
        'fruit': { calories: 80, protein: 1, carbs: 20, fats: 0, portion: '1 cup' },
        'nuts': { calories: 170, protein: 6, carbs: 6, fats: 15, portion: '1 oz' }
      };
      
      // Analyze each food item
      food_items.forEach(item => {
        const foodName = (item.name || item).toLowerCase();
        const customPortion = item.portion;
        
        // Check if food exists in database
        if (foodDatabase[foodName]) {
          const food = foodDatabase[foodName];
          
          // Use provided portion or default
          const portion = customPortion || food.portion;
          portion_sizes[foodName] = portion;
          
          // Calculate nutrition based on portion
          let portionMultiplier = 1;
          if (customPortion) {
            // Very simple portion conversion - in a real app this would be more sophisticated
            // Extract number from the portion string
            const portionNumber = parseFloat(customPortion.match(/[\d\.]+/)) || 1;
            const defaultPortionNumber = parseFloat(food.portion.match(/[\d\.]+/)) || 1;
            portionMultiplier = portionNumber / defaultPortionNumber;
          }
          
          // Add to nutritional totals
          estimated_calories += food.calories * portionMultiplier;
          protein += food.protein * portionMultiplier;
          carbs += food.carbs * portionMultiplier;
          fats += food.fats * portionMultiplier;
        } else {
          // If food not found in database, add with unknown nutrition values
          portion_sizes[foodName] = customPortion || 'unknown';
        }
      });
    } else if (image_url) {
      // In a real implementation, this would call an image recognition API
      // For this example, we'll just return a placeholder response
      foods_identified = ['placeholder item 1', 'placeholder item 2'];
      portion_sizes = {
        'placeholder item 1': '1 serving',
        'placeholder item 2': '1 serving'
      };
      estimated_calories = 500;
      protein = 25;
      carbs = 50;
      fats = 20;
    }
    
    // Analyze meal balance based on macronutrients
    let meal_balance = '';
    let macronutrient_percentages = { protein: 0, carbs: 0, fats: 0 };
    
    if (estimated_calories > 0) {
      // Calculate macronutrient percentages
      const totalCaloriesFromMacros = (protein * 4) + (carbs * 4) + (fats * 9);
      
      macronutrient_percentages = {
        protein: Math.round((protein * 4 / totalCaloriesFromMacros) * 100),
        carbs: Math.round((carbs * 4 / totalCaloriesFromMacros) * 100),
        fats: Math.round((fats * 9 / totalCaloriesFromMacros) * 100)
      };
      
      // Simple meal balance analysis
      if (macronutrient_percentages.protein < 15) {
        meal_balance += 'This meal is low in protein. ';
      } else if (macronutrient_percentages.protein > 45) {
        meal_balance += 'This meal is high in protein. ';
      }
      
      if (macronutrient_percentages.carbs < 10) {
        meal_balance += 'This meal is very low in carbohydrates. ';
      } else if (macronutrient_percentages.carbs < 25) {
        meal_balance += 'This meal is low in carbohydrates. ';
      } else if (macronutrient_percentages.carbs > 60) {
        meal_balance += 'This meal is high in carbohydrates. ';
      }
      
      if (macronutrient_percentages.fats < 15) {
        meal_balance += 'This meal is low in fats. ';
      } else if (macronutrient_percentages.fats > 40) {
        meal_balance += 'This meal is high in fats. ';
      }
      
      if (!meal_balance) {
        meal_balance = 'This meal has a balanced macronutrient profile.';
      }
    } else {
      meal_balance = 'Unable to determine meal balance without nutritional information.';
    }
    
    // Generate suggestions based on meal analysis
    let suggestions = [];
    
    // Check for a carnivore meal
    const animalFoods = ['steak', 'chicken breast', 'salmon', 'eggs', 'bacon', 'cheese', 'burger patty', 'chicken thigh', 'ground beef', 'pork chop'];
    const isCarnivoreMeal = foods_identified.length > 0 && foods_identified.every(food => 
      animalFoods.some(animalFood => food.toLowerCase().includes(animalFood))
    );
    
    if (isCarnivoreMeal) {
      suggestions.push('This appears to be a carnivore-style meal focused on animal foods.');
      
      // Add suggestions specific to carnivore approach
      if (!foods_identified.some(food => food.toLowerCase().includes('organ'))) {
        suggestions.push('Consider including organ meats occasionally for micronutrient diversity.');
      }
      
      if (macronutrient_percentages.fats < 60) {
        suggestions.push('For a carnivore approach, you might consider increasing fat intake for energy.');
      }
    } else {
      // Standard meal suggestions
      if (macronutrient_percentages.protein < 20) {
        suggestions.push('Consider adding a protein source such as meat, fish, eggs, tofu, or legumes.');
      }
      
      if (!foods_identified.some(food => 
        ['vegetable', 'broccoli', 'spinach', 'kale', 'lettuce', 'greens'].some(veg => 
          food.toLowerCase().includes(veg)
        )
      )) {
        suggestions.push('Consider adding vegetables for fiber, vitamins, and minerals.');
      }
      
      if (estimated_calories > 800) {
        suggestions.push('This meal is relatively high in calories. Consider reducing portion sizes if weight management is a goal.');
      }
    }
    
    // Add a suggestion about water
    suggestions.push('Remember to stay hydrated by drinking water with your meal.');
    
    return {
      foods_identified: foods_identified,
      portion_sizes: portion_sizes,
      estimated_calories: Math.round(estimated_calories),
      macronutrients: {
        protein: `${Math.round(protein)}g (${macronutrient_percentages.protein}%)`,
        carbs: `${Math.round(carbs)}g (${macronutrient_percentages.carbs}%)`,
        fats: `${Math.round(fats)}g (${macronutrient_percentages.fats}%)`
      },
      meal_balance: meal_balance,
      suggestions: suggestions,
      is_carnivore_meal: isCarnivoreMeal,
      seo_title: isCarnivoreMeal ? 
        'Carnivore Diet Meal Analysis' : 
        'Nutritional Analysis of Your Meal',
      seo_content: isCarnivoreMeal ?
        'Discover the nutritional content of your carnivore diet meal including protein, fat ratios, and suggestions for optimization.' :
        'Learn about the nutritional content of your meal including calories, macronutrients, and suggestions for a balanced diet.',
      seo_keywords: isCarnivoreMeal ?
        'carnivore diet, animal-based nutrition, protein, healthy fats' :
        'meal analysis, nutrition, balanced diet, macronutrients'
    };
  };
  
  module.exports = {
    analyzeFoodPlate
  };