// services/exerciseService.js

const getExerciseDetails = (exercise_name, lang) => {
    // Exercise database with detailed information
    const exercises = {
      'Squats': {
        description: 'A compound exercise that primarily targets the quadriceps, hamstrings, and glutes.',
        primary_muscles: ['Quadriceps', 'Hamstrings', 'Gluteus Maximus'],
        secondary_muscles: ['Calves', 'Core', 'Lower Back'],
        equipment_needed: ['Barbell (optional)', 'Squat Rack (optional)'],
        instructions: [
          'Step 1: Stand with feet shoulder-width apart.',
          'Step 2: Keep your back straight and chest up.',
          'Step 3: Lower your body by bending your knees and hips, as if sitting in a chair.',
          'Step 4: Descend until your thighs are parallel to the ground, or as low as you can comfortably go.',
          'Step 5: Push through your heels to return to the starting position.'
        ],
        benefits: [
          'Builds lower body strength',
          'Improves core stability',
          'Enhances functional movement patterns',
          'Boosts overall athletic performance'
        ],
        variations: [
          'Bodyweight Squats',
          'Front Squats',
          'Goblet Squats',
          'Bulgarian Split Squats',
          'Jump Squats'
        ]
      },
      'Bench Press': {
        description: 'A compound upper-body exercise that targets the chest, shoulders, and triceps.',
        primary_muscles: ['Pectoralis Major', 'Triceps'],
        secondary_muscles: ['Deltoids', 'Serratus Anterior'],
        equipment_needed: ['Barbell or Dumbbells', 'Bench'],
        instructions: [
          'Step 1: Lie flat on a bench with your feet on the ground.',
          'Step 2: Grip the barbell slightly wider than shoulder-width apart.',
          'Step 3: Unrack the barbell and lower it to your mid-chest.',
          'Step 4: Press the barbell back up to the starting position, fully extending your arms.',
          'Step 5: Repeat for the desired number of repetitions.'
        ],
        benefits: [
          'Develops upper body pushing strength',
          'Builds chest, shoulder, and tricep muscles',
          'Improves pushing power for athletics',
          'Can help correct muscular imbalances when done properly'
        ],
        variations: [
          'Dumbbell Bench Press',
          'Incline Bench Press',
          'Decline Bench Press',
          'Close-Grip Bench Press',
          'Floor Press'
        ]
      },
      'Deadlifts': {
        description: 'A compound exercise that works the entire posterior chain.',
        primary_muscles: ['Hamstrings', 'Gluteus Maximus', 'Lower Back'],
        secondary_muscles: ['Upper Back', 'Forearms', 'Core'],
        equipment_needed: ['Barbell', 'Weight Plates'],
        instructions: [
          'Step 1: Stand with feet hip-width apart, barbell over mid-foot.',
          'Step 2: Bend at the hips and knees to grip the barbell.',
          'Step 3: Keep your back straight and chest up.',
          'Step 4: Drive through your heels to stand up, lifting the barbell.',
          'Step 5: Lower the barbell by hinging at the hips and bending the knees.'
        ],
        benefits: [
          'Develops full-body strength',
          'Strengthens the posterior chain',
          'Improves grip strength',
          'Enhances core stability',
          'Builds functional strength for daily activities'
        ],
        variations: [
          'Romanian Deadlifts',
          'Sumo Deadlifts',
          'Trap Bar Deadlifts',
          'Single-Leg Deadlifts',
          'Deficit Deadlifts'
        ]
      },
      'Pull-ups': {
        description: 'A compound upper-body exercise that targets the back, shoulders, and arms.',
        primary_muscles: ['Latissimus Dorsi', 'Biceps'],
        secondary_muscles: ['Rhomboids', 'Trapezius', 'Core'],
        equipment_needed: ['Pull-up Bar'],
        instructions: [
          'Step 1: Grip the pull-up bar with hands slightly wider than shoulder-width apart.',
          'Step 2: Hang with arms fully extended and shoulders engaged.',
          'Step 3: Pull your body up by driving your elbows down until your chin is over the bar.',
          'Step 4: Lower yourself with control to the starting position.',
          'Step 5: Repeat for the desired number of repetitions.'
        ],
        benefits: [
          'Builds upper body pulling strength',
          'Develops back and arm muscles',
          'Improves grip strength',
          'Enhances shoulder stability'
        ],
        variations: [
          'Chin-ups',
          'Neutral Grip Pull-ups',
          'Wide Grip Pull-ups',
          'Assisted Pull-ups',
          'Negative Pull-ups'
        ]
      },
      'Overhead Press': {
        description: 'A compound upper-body exercise that primarily targets the shoulders and triceps.',
        primary_muscles: ['Deltoids', 'Triceps'],
        secondary_muscles: ['Upper Chest', 'Upper Back', 'Core'],
        equipment_needed: ['Barbell or Dumbbells'],
        instructions: [
          'Step 1: Stand with feet shoulder-width apart, holding the weight at shoulder level.',
          'Step 2: Brace your core and keep your back straight.',
          'Step 3: Press the weight overhead until your arms are fully extended.',
          'Step 4: Lower the weight back to shoulder level with control.',
          'Step 5: Repeat for the desired number of repetitions.'
        ],
        benefits: [
          'Develops shoulder strength and stability',
          'Builds functional overhead pressing power',
          'Engages the core for stabilization',
          'Improves upper body coordination'
        ],
        variations: [
          'Seated Overhead Press',
          'Dumbbell Shoulder Press',
          'Push Press',
          'Arnold Press',
          'Single-Arm Overhead Press'
        ]
      },
      'Rows': {
        description: 'A compound pulling exercise that targets the muscles of the back and arms.',
        primary_muscles: ['Latissimus Dorsi', 'Rhomboids', 'Biceps'],
        secondary_muscles: ['Rear Deltoids', 'Trapezius', 'Forearms'],
        equipment_needed: ['Barbell, Dumbbells, or Cable Machine'],
        instructions: [
          'Step 1: Bend at the hips with a flat back (barbell/dumbbell) or sit at a cable row machine.',
          'Step 2: Grip the weight or handle with hands shoulder-width apart.',
          'Step 3: Pull the weight toward your body, driving elbows back.',
          'Step 4: Squeeze shoulder blades together at the end of the movement.',
          'Step 5: Return to the starting position with control.'
        ],
        benefits: [
          'Strengthens the back muscles',
          'Improves posture',
          'Balances pushing exercises',
          'Develops functional pulling strength'
        ],
        variations: [
          'Bent-Over Barbell Rows',
          'Dumbbell Rows',
          'Cable Rows',
          'Inverted Rows',
          'T-Bar Rows'
        ]
      },
      'Lunges': {
        description: 'A unilateral lower-body exercise that works the legs and improves balance.',
        primary_muscles: ['Quadriceps', 'Hamstrings', 'Gluteus Maximus'],
        secondary_muscles: ['Calves', 'Core', 'Hip Flexors'],
        equipment_needed: ['None (bodyweight) or Dumbbells/Barbell (weighted)'],
        instructions: [
          'Step 1: Stand with feet hip-width apart.',
          'Step 2: Take a step forward with one leg.',
          'Step 3: Lower your body until both knees are bent at roughly 90-degree angles.',
          'Step 4: Push through the front heel to return to the starting position.',
          'Step 5: Repeat with the other leg.'
        ],
        benefits: [
          'Develops lower body strength',
          'Improves balance and coordination',
          'Addresses muscle imbalances between legs',
          'Enhances functional movement patterns'
        ],
        variations: [
          'Walking Lunges',
          'Reverse Lunges',
          'Side Lunges',
          'Bulgarian Split Squats',
          'Curtsy Lunges'
        ]
      },
      'Plank': {
        description: 'An isometric core exercise that builds strength and stability throughout the body.',
        primary_muscles: ['Rectus Abdominis', 'Transverse Abdominis'],
        secondary_muscles: ['Shoulders', 'Chest', 'Lower Back', 'Glutes'],
        equipment_needed: ['None'],
        instructions: [
          'Step 1: Start in a push-up position, but with forearms on the ground.',
          'Step 2: Elbows should be directly under your shoulders.',
          'Step 3: Keep your body in a straight line from head to heels.',
          'Step 4: Engage your core, glutes, and quads.',
          'Step 5: Hold this position for the desired duration.'
        ],
        benefits: [
          'Strengthens the entire core',
          'Improves posture',
          'Enhances spinal stability',
          'Builds isometric strength throughout the body'
        ],
        variations: [
          'Side Plank',
          'High Plank',
          'Plank with Shoulder Taps',
          'Plank Walkouts',
          'Stability Ball Plank'
        ]
      },
      'Running': {
        description: 'A cardiovascular exercise that improves endurance, burns calories, and strengthens the lower body.',
        primary_muscles: ['Quadriceps', 'Hamstrings', 'Calves'],
        secondary_muscles: ['Core', 'Glutes', 'Hip Flexors'],
        equipment_needed: ['Running Shoes'],
        instructions: [
          'Step 1: Maintain good posture with shoulders relaxed and chest up.',
          'Step 2: Land midfoot with each step, not on heels or toes.',
          'Step 3: Keep arms bent at roughly 90 degrees, swinging from shoulders.',
          'Step 4: Breathe rhythmically, typically inhaling for 2-3 steps and exhaling for 2-3 steps.',
          'Step 5: Start with intervals of running and walking if you\'re a beginner.'
        ],
        benefits: [
          'Improves cardiovascular health',
          'Burns calories efficiently',
          'Strengthens lower body muscles',
          'Enhances mental well-being',
          'Improves endurance'
        ],
        variations: [
          'Sprinting',
          'Jogging',
          'Interval Running',
          'Hill Running',
          'Trail Running'
        ]
      },
      'Cycling': {
        description: 'A low-impact cardiovascular exercise that targets the lower body while sparing the joints.',
        primary_muscles: ['Quadriceps', 'Hamstrings', 'Calves'],
        secondary_muscles: ['Glutes', 'Core', 'Hip Flexors'],
        equipment_needed: ['Bicycle or Stationary Bike'],
        instructions: [
          'Step 1: Adjust the seat height so your knee is slightly bent at the bottom of the pedal stroke.',
          'Step 2: Maintain proper posture with back flat or slightly arched.',
          'Step 3: Pedal in smooth circles rather than just pushing down.',
          'Step 4: Keep a light grip on the handlebars.',
          'Step 5: Breathe rhythmically throughout the workout.'
        ],
        benefits: [
          'Provides cardiovascular conditioning with low joint impact',
          'Builds lower body strength and endurance',
          'Can be adjusted for various intensity levels',
          'Improves balance and coordination'
        ],
        variations: [
          'Road Cycling',
          'Stationary Biking',
          'Cycling Intervals',
          'Hill Climbing',
          'Spin Classes'
        ]
      }
      // Additional exercises can be added to the database
    };
  
    const exerciseInfo = exercises[exercise_name];
    
    // If exercise not found in database
    if (!exerciseInfo) {
      return {
        exercise_name: exercise_name,
        description: 'Detailed information for this exercise is not available in our database.',
        primary_muscles: [],
        secondary_muscles: [],
        equipment_needed: [],
        instructions: [],
        benefits: [],
        variations: [],
        seo_title: `${exercise_name} - Exercise Information`,
        seo_content: `Learn about the ${exercise_name} exercise and how to perform it correctly.`,
        seo_keywords: `${exercise_name.toLowerCase()}, exercise, fitness, workout`
      };
    }
  
    // Return complete exercise information
    return {
      exercise_name: exercise_name,
      ...exerciseInfo,
      seo_title: `How to Perform ${exercise_name} Correctly: Technique & Benefits`,
      seo_content: `Learn the proper technique for ${exercise_name}, which muscles it targets, and the benefits of including it in your workout routine.`,
      seo_keywords: `${exercise_name.toLowerCase()}, exercise technique, muscle targeting, fitness`
    };
  };
  
  module.exports = {
    getExerciseDetails
  };