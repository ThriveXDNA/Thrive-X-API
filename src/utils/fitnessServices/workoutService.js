// services/workoutService.js

const generateWorkoutPlan = (goal, fitness_level, preferences, health_conditions, schedule, plan_duration_weeks, diet_preference, lang) => {
    // Sample implementation - in production, this would contain more complex logic
    const workoutDays = [];
    const days_per_week = schedule.days_per_week || 3;
    
    // Define workout days based on schedule
    const possibleDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (let i = 0; i < days_per_week; i++) {
      if (i < possibleDays.length) {
        workoutDays.push(possibleDays[i]);
      }
    }
  
    const exercises = [];
  
    // Generate workouts based on preferences and fitness level
    // Weight training focused workouts
    if (preferences && preferences.includes('Weight training')) {
      const workoutTypes = {
        'Monday': 'Push (Chest, Shoulders, Triceps)',
        'Tuesday': 'Pull (Back, Biceps)',
        'Wednesday': 'Legs (Quads, Hamstrings, Calves)',
        'Thursday': 'Upper Body',
        'Friday': 'Lower Body',
        'Saturday': 'Full Body',
        'Sunday': 'Active Recovery'
      };
  
      const exerciseDatabase = {
        'Push': [
          {
            name: 'Bench Press',
            duration: '15 minutes',
            sets: '4',
            equipment: 'Barbell or Dumbbells'
          },
          {
            name: 'Overhead Press',
            duration: '15 minutes',
            sets: '3',
            equipment: 'Barbell or Dumbbells'
          },
          {
            name: 'Incline Dumbbell Press',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Dumbbells'
          },
          {
            name: 'Tricep Pushdowns',
            duration: '10 minutes',
            sets: '3',
            equipment: 'Cable Machine'
          }
        ],
        'Pull': [
          {
            name: 'Deadlifts',
            duration: '15 minutes',
            sets: '4',
            equipment: 'Barbell'
          },
          {
            name: 'Pull-ups',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Pull-up Bar'
          },
          {
            name: 'Barbell Rows',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell'
          },
          {
            name: 'Bicep Curls',
            duration: '10 minutes',
            sets: '3',
            equipment: 'Dumbbells'
          }
        ],
        'Legs': [
          {
            name: 'Squats',
            duration: '15 minutes',
            sets: '4',
            equipment: 'Barbell'
          },
          {
            name: 'Romanian Deadlifts',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell'
          },
          {
            name: 'Leg Press',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Leg Press Machine'
          },
          {
            name: 'Calf Raises',
            duration: '10 minutes',
            sets: '3',
            equipment: 'Calf Raise Machine or Dumbbell'
          }
        ],
        'Upper Body': [
          {
            name: 'Bench Press',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell or Dumbbells'
          },
          {
            name: 'Pull-ups',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Pull-up Bar'
          },
          {
            name: 'Overhead Press',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell or Dumbbells'
          },
          {
            name: 'Rows',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell or Cable'
          }
        ],
        'Lower Body': [
          {
            name: 'Front Squats',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell'
          },
          {
            name: 'Lunges',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Dumbbells'
          },
          {
            name: 'Leg Extensions',
            duration: '10 minutes',
            sets: '3',
            equipment: 'Machine'
          },
          {
            name: 'Hamstring Curls',
            duration: '10 minutes',
            sets: '3',
            equipment: 'Machine'
          }
        ],
        'Full Body': [
          {
            name: 'Squats',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell'
          },
          {
            name: 'Bench Press',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell or Dumbbells'
          },
          {
            name: 'Rows',
            duration: '12 minutes',
            sets: '3',
            equipment: 'Barbell or Cable'
          },
          {
            name: 'Overhead Press',
            duration: '10 minutes',
            sets: '3',
            equipment: 'Dumbbells'
          }
        ],
        'Active Recovery': [
          {
            name: 'Brisk Walking',
            duration: '20 minutes',
            sets: '1',
            equipment: 'None'
          },
          {
            name: 'Light Stretching',
            duration: '15 minutes',
            sets: '1',
            equipment: 'None'
          },
          {
            name: 'Foam Rolling',
            duration: '15 minutes',
            sets: '1',
            equipment: 'Foam Roller'
          }
        ]
      };
  
      // Add repetition ranges based on fitness level and goal
      let repRange = '';
      if (goal === 'Build muscle') {
        repRange = fitness_level === 'Beginner' ? '8-10' : '8-12';
      } else if (goal === 'Lose weight') {
        repRange = fitness_level === 'Beginner' ? '12-15' : '12-20';
      } else if (goal === 'Increase strength') {
        repRange = fitness_level === 'Beginner' ? '5-8' : '3-6';
      } else {
        repRange = fitness_level === 'Beginner' ? '8-12' : '8-15';
      }
  
      // Generate workout for each day
      workoutDays.forEach(day => {
        const workoutType = workoutTypes[day];
        const workoutCategory = workoutType.split(' ')[0]; // Get first word (Push, Pull, etc.)
        
        // Get exercises for this workout type
        let dayExercises = [];
        if (exerciseDatabase[workoutCategory]) {
          dayExercises = exerciseDatabase[workoutCategory].map(ex => {
            return {
              ...ex,
              repetitions: repRange
            };
          });
        } else {
          // Fallback to Full Body if category not found
          dayExercises = exerciseDatabase['Full Body'].map(ex => {
            return {
              ...ex,
              repetitions: repRange
            };
          });
        }
  
        exercises.push({
          day: day,
          workout_type: workoutType,
          exercises: dayExercises
        });
      });
    } 
    // Cardio focused workouts
    else if (preferences && preferences.includes('Cardio')) {
      workoutDays.forEach(day => {
        const cardioWorkouts = [
          {
            name: 'Running',
            duration: '30 minutes',
            intensity: fitness_level === 'Beginner' ? 'Moderate' : 'High',
            equipment: 'None'
          },
          {
            name: 'Cycling',
            duration: '30 minutes',
            intensity: fitness_level === 'Beginner' ? 'Moderate' : 'High',
            equipment: 'Bicycle or Stationary Bike'
          },
          {
            name: 'HIIT Training',
            duration: '20 minutes',
            intensity: 'High',
            equipment: 'None'
          },
          {
            name: 'Swimming',
            duration: '30 minutes',
            intensity: fitness_level === 'Beginner' ? 'Moderate' : 'High',
            equipment: 'Access to Pool'
          }
        ];
  
        // Assign different cardio workouts for different days
        const dayIndex = possibleDays.indexOf(day);
        const workout = cardioWorkouts[dayIndex % cardioWorkouts.length];
  
        exercises.push({
          day: day,
          workout_type: 'Cardio',
          exercises: [workout]
        });
      });
    }
    // Default to bodyweight exercises
    else {
      workoutDays.forEach(day => {
        exercises.push({
          day: day,
          workout_type: 'Bodyweight Training',
          exercises: [
            {
              name: 'Bodyweight Squats',
              duration: '10 minutes',
              repetitions: '15-20',
              sets: '3',
              equipment: 'None'
            },
            {
              name: 'Push-ups',
              duration: '10 minutes',
              repetitions: '10-15',
              sets: '3',
              equipment: 'None'
            },
            {
              name: 'Plank',
              duration: '5 minutes',
              repetitions: '30-60 seconds',
              sets: '3',
              equipment: 'None'
            },
            {
              name: 'Lunges',
              duration: '10 minutes',
              repetitions: '12-15 per leg',
              sets: '3',
              equipment: 'None'
            }
          ]
        });
      });
    }
  
    // Diet tips based on preference
    let dietTips = [];
    if (diet_preference === 'carnivore') {
      dietTips = [
        "Focus on nutrient-dense animal products like beef, eggs, and fish",
        "Consider including organ meats for micronutrients",
        "Stay hydrated and ensure adequate salt intake",
        "Time your protein intake around workouts for optimal recovery"
      ];
    } else {
      dietTips = [
        "Ensure adequate protein intake for recovery",
        "Include a variety of vegetables for micronutrients",
        "Stay hydrated throughout the day",
        "Consider timing carbohydrates around workouts for energy"
      ];
    }
  
    // Special considerations based on health conditions
    let healthTips = [];
    if (health_conditions && health_conditions.length > 0 && !health_conditions.includes('None')) {
      healthTips.push("This plan takes your health conditions into consideration. Always consult with a healthcare professional before starting a new exercise program.");
      
      if (health_conditions.includes('Lower back pain')) {
        healthTips.push("Focus on core strengthening and proper form for all exercises. Avoid heavy deadlifts or exercises that strain the lower back.");
      }
      
      if (health_conditions.includes('Joint issues')) {
        healthTips.push("Consider low-impact exercises and focus on proper form. Use lighter weights with higher repetitions.");
      }
    }
  
    return {
      goal: goal,
      fitness_level: fitness_level,
      total_weeks: plan_duration_weeks || 4,
      schedule: schedule,
      exercises: exercises,
      diet_tips: dietTips,
      health_tips: healthTips,
      seo_title: `${plan_duration_weeks || 4}-Week ${goal} Workout Plan`,
      seo_content: `This comprehensive ${plan_duration_weeks || 4}-week workout plan is designed for ${fitness_level} fitness levels aiming to ${goal.toLowerCase()} efficiently.`,
      seo_keywords: `${goal.toLowerCase()}, workout plan, fitness, ${fitness_level.toLowerCase()}`
    };
  };
  
  module.exports = {
    generateWorkoutPlan
  };