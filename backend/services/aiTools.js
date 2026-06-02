/**
 * Full tool list for the Mezan nutritionist.
 * Group order: Logging → Retrieval → Planning → Intelligence
 */
export const buildTools = () => [

  // ── GROUP 1 · LOGGING ─────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'log_meal',
      description:
        'Log a meal or food item for the user. Call IMMEDIATELY when the user ' +
        'mentions eating anything. Estimate macros if not provided — never ask ' +
        'the user to supply them.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Food or meal name (e.g. "Chicken Biryani")' },
          calories: { type: 'number', description: 'Total estimated calories (kcal)' },
          protein: { type: 'number', description: 'Protein in grams' },
          carbs: { type: 'number', description: 'Carbohydrates in grams' },
          fats: { type: 'number', description: 'Fats in grams' },
          fiber: { type: 'number', description: 'Dietary fiber in grams (estimate if unknown)' },
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'] },
          quantity: { type: 'string', description: 'Portion description (e.g. "1 plate", "200g", "2 pieces")' },
          servings: { type: 'number', description: 'Number of servings logged (e.g. 1, 1.5, 3) — default: 1' },
          confirm_duplicate: { type: 'boolean', description: 'Set to true ONLY if the user explicitly confirmed they want to log a duplicate/second serving of the same food within a 5-minute window.' },
          date: { type: 'string', description: 'YYYY-MM-DD — defaults to today' },
        },
        required: ['name', 'calories', 'protein', 'carbs', 'fats'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'log_water_intake',
      description:
        'Log water or fluid intake. Call whenever the user mentions drinking ' +
        'water, tea, juice, a protein shake, or any beverage.',
      parameters: {
        type: 'object',
        properties: {
          amount_ml: { type: 'number', description: 'Volume in millilitres (e.g. 250 for one glass)' },
          beverage: { type: 'string', description: 'Type of beverage — default: "water"' },
          date: { type: 'string', description: 'YYYY-MM-DD — defaults to today' },
        },
        required: ['amount_ml'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'log_exercise',
      description:
        'Log a workout or physical activity. Call when the user mentions any ' +
        'exercise. After logging, recalculate remaining calorie allowance for the day.',
      parameters: {
        type: 'object',
        properties: {
          activity: { type: 'string', description: 'e.g. "Running", "Weight training", "Cricket"' },
          duration_min: { type: 'number', description: 'Duration in minutes' },
          intensity: { type: 'string', enum: ['low', 'moderate', 'high'] },
          calories_burned: { type: 'number', description: 'If known. AI should estimate otherwise.' },
          notes: { type: 'string', description: 'Optional workout notes' },
          date: { type: 'string', description: 'YYYY-MM-DD — defaults to today' },
        },
        required: ['activity', 'duration_min', 'intensity'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'log_body_metrics',
      description:
        'Log body measurements. Call IMMEDIATELY when the user shares any ' +
        'measurement — weight, body fat %, waist size, etc.',
      parameters: {
        type: 'object',
        properties: {
          weight_kg: { type: 'number', description: 'Body weight in kilograms' },
          body_fat_pct: { type: 'number', description: 'Body fat percentage' },
          waist_cm: { type: 'number', description: 'Waist circumference in cm' },
          chest_cm: { type: 'number', description: 'Chest circumference in cm' },
          hips_cm: { type: 'number', description: 'Hip circumference in cm' },
          notes: { type: 'string', description: 'Optional notes (e.g. "morning weight, post-workout")' },
          date: { type: 'string', description: 'YYYY-MM-DD — defaults to today' },
        },
      },
    },
  },

  // ── GROUP 2 · RETRIEVAL ───────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'get_user_food_logs',
      description:
        'Retrieve the user\'s food diary for a specific date. ' +
        'Call BEFORE discussing today\'s intake, remaining macros, or meal suggestions.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD — defaults to today' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_macro_history',
      description:
        'Fetch macro and calorie history for a date range. ' +
        'Use before weekly check-ins, progress reviews, or spotting nutritional patterns.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Start date YYYY-MM-DD' },
          to: { type: 'string', description: 'End date YYYY-MM-DD' },
          metric: {
            type: 'string',
            enum: ['calories', 'protein', 'carbs', 'fats', 'water', 'all'],
            description: 'Which metric to return — default: all',
          },
        },
        required: ['from', 'to'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_water_intake',
      description:
        'Get the user\'s fluid intake for a given day. ' +
        'Use proactively on hot days (>35 °C) or when the user asks about hydration.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD — defaults to today' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_body_metrics_history',
      description:
        'Retrieve historical body measurements to assess physical progress. ' +
        'Call before discussing weight loss / gain trends.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Start date YYYY-MM-DD' },
          to: { type: 'string', description: 'End date YYYY-MM-DD — defaults to today' },
        },
        required: ['from'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_activity_logs',
      description:
        'Retrieve the user\'s exercise history. ' +
        'Use before adjusting daily calorie allowance or making post-workout meal recommendations.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Single date YYYY-MM-DD' },
          from: { type: 'string', description: 'Range start YYYY-MM-DD' },
          to: { type: 'string', description: 'Range end YYYY-MM-DD' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_streak_and_achievements',
      description:
        'Get the user\'s current logging streak, milestones, and badges. ' +
        'Use on Monday check-ins, or when the user seems disengaged or needs motivation.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },

  // ── GROUP 3 · SEARCH & LOOKUP ─────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'search_food_database',
      description:
        'Look up macro and micronutrient data for a specific food item. ' +
        'Always call this before estimating macros for any named food.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Food item name or description' },
          portion: { type: 'string', description: 'Optional portion size (e.g. "100g", "1 cup")' },
        },
        required: ['query'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_restaurant_menu',
      description:
        'Find nutrition info for menu items at restaurants or fast-food chains. ' +
        'Call when the user mentions eating out at any named restaurant.',
      parameters: {
        type: 'object',
        properties: {
          restaurant: { type: 'string', description: 'Restaurant or chain name (e.g. "McDonald\'s", "Nando\'s", "BBQ Tonight")' },
          item: { type: 'string', description: 'Specific menu item — leave blank to get popular items' },
          location: { type: 'string', description: 'City or country for regional menu variants' },
        },
        required: ['restaurant'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description:
        'Search the Mezan Nutrition Knowledge Base (verified PDFs). ' +
        'MUST be called FIRST before answering any nutrition science, diet, ' +
        'supplement, or health question.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Specific question or topic to search for' },
        },
        required: ['query'],
      },
    },
  },

  // ── GROUP 4 · INTELLIGENCE & PLANNING ────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'get_weather_forecast',
      description:
        'Get real-time weather and 7-day forecast for a location. ' +
        'Use when giving hydration, meal-timing, or exercise recommendations.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City or region (e.g. "Lahore", "Dubai"). Defaults to user\'s registered location.',
          },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'calculate_tdee',
      description:
        'Recalculate the user\'s Total Daily Energy Expenditure (TDEE) and ' +
        'recommended macro targets. Call when the user reports a weight change ' +
        '(±2 kg from profile) or changes their activity level.',
      parameters: {
        type: 'object',
        properties: {
          weight_kg: { type: 'number' },
          height_cm: { type: 'number' },
          age: { type: 'number' },
          gender: { type: 'string', enum: ['male', 'female'] },
          activity_level: {
            type: 'string',
            enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
          },
          goal: {
            type: 'string',
            enum: ['lose', 'maintain', 'gain'],
          },
        },
        required: ['weight_kg', 'height_cm', 'age', 'activity_level', 'goal'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'generate_meal_plan',
      description:
        'Create a structured 1-day or 7-day meal plan tailored to the user\'s ' +
        'macro targets, dietary restrictions, pantry, and local weather.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: '1 or 7' },
          cuisine_pref: { type: 'string', description: 'e.g. "South Asian", "Mediterranean", "Middle Eastern"' },
          use_pantry: { type: 'boolean', description: 'Prioritise pantry ingredients. Default: true' },
          calorie_target: { type: 'number', description: 'Override daily calorie target if needed' },
          exclude_foods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Foods to avoid (allergies, dislikes)',
          },
        },
        required: ['days'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'generate_shopping_list',
      description:
        'Generate a shopping list from a meal plan, subtracting what is already ' +
        'in the user\'s pantry. Only lists items the user actually needs to buy.',
      parameters: {
        type: 'object',
        properties: {
          meal_plan_id: { type: 'string', description: 'ID of an existing meal plan' },
          days: { type: 'number', description: 'Days to plan for (if no meal_plan_id)' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_supplement_recommendations',
      description:
        'Analyse the user\'s food logs for micronutrient gaps and recommend ' +
        'targeted supplements. Call when asked about supplements or after ' +
        'reviewing 7-day history.',
      parameters: {
        type: 'object',
        properties: {
          analyze_from: { type: 'string', description: 'YYYY-MM-DD start of analysis window' },
          analyze_to: { type: 'string', description: 'YYYY-MM-DD end of analysis window' },
        },
        required: ['analyze_from', 'analyze_to'],
      },
    },
  },
];
