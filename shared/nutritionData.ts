import { PhaseNutritionContent } from './types';

export const PHASE_NUTRITION_CONTENT: PhaseNutritionContent[] = [
  {
    phase: 'menstrual',
    title: 'Menstrual Phase',
    theme: 'Rest and Restore',
    shortDescription:
      'Focus on warmth, gentle nourishment, replenishing iron and fluids, and giving your body quiet space to recover.',
    detailedGuidance:
      'During menstruation, hormone levels are at their lowest point in the cycle. Many people appreciate warm, easily digestible meals, mineral-rich foods, steady hydration, and lower-intensity movement or deliberate rest.',
    typicalDayRangeLabel: 'Typically Days 1 to end of bleeding (varies by person)',
    foodsToEnjoy: [
      {
        category: 'Iron-Rich Foods',
        description: 'Support natural iron replenishment during menstrual flow.',
        vegetarianOptions: [
          'Cooked lentils, black beans, and chickpeas',
          'Spinach, Swiss chard, and cooked kale',
          'Pumpkin seeds, sesame tahini, and fortified oats',
        ],
        nonVegetarianOptions: [
          'Lean grass-fed beef or lamb stews',
          'Sardines, salmon, or mussels',
          'Dark-meat turkey or chicken soup',
        ],
      },
      {
        category: 'Vitamin C Pairings',
        description: 'Helps your body absorb plant-based iron more effectively.',
        vegetarianOptions: [
          'Red bell peppers, citrus segments, and kiwi',
          'Fresh strawberries, broccoli, and lemon dressing over greens',
        ],
        nonVegetarianOptions: [
          'Grilled fish with lemon-herb salsa',
          'Chicken and roasted bell pepper soup',
        ],
      },
      {
        category: 'Warm, Comforting Meals',
        description: 'Gentle on digestion and soothing when experiencing cramps or fatigue.',
        vegetarianOptions: [
          'Roasted squash and ginger soup with sourdough',
          'Warm spiced oatmeal with stewed berries and walnuts',
        ],
        nonVegetarianOptions: [
          'Bone broth vegetable and noodle soup',
          'Slow-simmered chicken, ginger, and rice congee',
        ],
      },
      {
        category: 'Magnesium-Rich Foods',
        description: 'Supports muscle relaxation and everyday calm.',
        vegetarianOptions: [
          'Dark chocolate (70%+), almonds, and cashews',
          'Avocado, black beans, and bananas',
        ],
        nonVegetarianOptions: [
          'Baked mackerel or halibut with steamed greens',
          'Yogurt bowl with cacao nibs and pumpkin seeds',
        ],
      },
    ],
    foodsOrHabitsToModerate: [
      'Very salty processed snacks if you notice fluid retention or bloating',
      'Excess caffeine on an empty stomach, which can heighten tension or disrupt rest',
      'Alcohol, which may affect sleep quality and hydration',
    ],
    hydrationTip:
      'Sip warm water, ginger tea, chamomile, or hibiscus infusions throughout the day to stay comfortably hydrated.',
    exerciseSuggestions: [
      'Gentle restorative yoga or floor stretching',
      'Slow neighborhood walks in fresh air',
      'Light mobility work or taking a full rest day without guilt',
    ],
    restAndSelfCare: [
      'Prioritize 7–9 hours of sleep and allow an earlier bedtime if tired',
      'Use a warm heating pad or warm bath to ease lower abdominal tension',
      'Keep evening schedules lighter where possible',
    ],
    wellnessDisclaimer:
      'General wellness guidance only — not individualized medical or dietary prescription. Consult a healthcare professional for persistent pain or heavy bleeding.',
  },
  {
    phase: 'follicular',
    title: 'Follicular Phase',
    theme: 'Rise and Renew',
    shortDescription:
      'As estrogen gradually rises after bleeding ends, energy and clarity often lift. Support renewal with vibrant, fresh whole foods.',
    detailedGuidance:
      'The follicular phase spans from the end of menstruation toward ovulation. Rising estrogen often pairs well with crisp fresh produce, fermented foods for digestive balance, lean proteins, and energizing movement.',
    typicalDayRangeLabel: 'Typically from end of period until pre-ovulation (varies by cycle length)',
    foodsToEnjoy: [
      {
        category: 'Fresh Colorful Vegetables',
        description: 'Rich in phytonutrients, folate, and light fiber.',
        vegetarianOptions: [
          'Arugula, baby kale, snap peas, and sprouts',
          'Roasted asparagus, zucchini, and carrots',
        ],
        nonVegetarianOptions: [
          'Herb-roasted chicken over crisp spring greens',
          'Poached eggs with sautéed greens and cherry tomatoes',
        ],
      },
      {
        category: 'Quality Lean Proteins',
        description: 'Steady amino acids to support tissue renewal and active days.',
        vegetarianOptions: [
          'Organic tofu, tempeh, and edamame',
          'Hemp seeds, quinoa, and Greek yogurt or skyr',
        ],
        nonVegetarianOptions: [
          'Pasture-raised eggs and grilled chicken breast',
          'Wild-caught trout or cod with herbs',
        ],
      },
      {
        category: 'Fermented Foods',
        description: 'Supports gut microbiome diversity and comfortable digestion.',
        vegetarianOptions: [
          'Kimchi, sauerkraut, miso broth, and water kefir',
          'Plain fermented coconut or dairy yogurt',
        ],
        nonVegetarianOptions: [
          'Kefir smoothies or cultured cottage cheese',
          'Miso-glazed salmon with pickled vegetables',
        ],
      },
      {
        category: 'Complex Carbohydrates',
        description: 'Clean, sustained daytime fuel for rising activity.',
        vegetarianOptions: [
          'Quinoa, buckwheat, farro, and sprouted-grain toast',
          'Roasted sweet potato and oat bowls',
        ],
        nonVegetarianOptions: [
          'Brown rice bowl with seared shrimp and greens',
          'Turkey and avocado wrap on whole-grain flatbread',
        ],
      },
    ],
    foodsOrHabitsToModerate: [
      'Skipping breakfast when morning schedules get busy',
      'Heavy, overly fried meals that may leave you feeling sluggish',
    ],
    hydrationTip:
      'Aim for steady cool or room-temperature water with citrus slices or mint, especially around workouts.',
    exerciseSuggestions: [
      'Brisk walking, cycling, or jogging',
      'Progressive strength training or bodyweight circuits',
      'Trying a new dance, pilates, or vinyasa flow class',
    ],
    restAndSelfCare: [
      'Notice rising focus for planning creative or academic projects',
      'Spend time outdoors in morning sunlight to anchor your sleep rhythm',
    ],
    wellnessDisclaimer:
      'General wellness guidance only — adapt food and movement choices to your personal energy and cultural preferences.',
  },
  {
    phase: 'ovulation',
    title: 'Ovulation Phase',
    theme: 'Shine and Connect',
    shortDescription:
      'Around mid-cycle peak estrogen, many people feel outward and energized. Keep meals balanced, fiber-rich, and refreshing.',
    detailedGuidance:
      'Ovulation occurs roughly 12–16 days before the next period starts (not necessarily Day 14 for every cycle). Supporting hydration, fiber, colorful antioxidants, and balanced protein helps sustain steady energy.',
    typicalDayRangeLabel: 'Estimated mid-cycle window (depends on your actual cycle length)',
    foodsToEnjoy: [
      {
        category: 'Balanced Plate Foundations',
        description: 'Combine fiber, protein, and healthy fats to avoid midday energy dips.',
        vegetarianOptions: [
          'Mediterranean chickpea, cucumber, olive, and feta salad',
          'Quinoa bowl with roasted cauliflower, tahini, and edamame',
        ],
        nonVegetarianOptions: [
          'Grilled salmon with mixed greens, berries, and quinoa',
          'Lemon-herb chicken skewers with roasted veggies and tzatziki',
        ],
      },
      {
        category: 'Antioxidant Fruits & Vegetables',
        description: 'Fresh produce packed with hydration and micronutrients.',
        vegetarianOptions: [
          'Blueberries, raspberries, tomatoes, and cucumber',
          'Steamed or lightly sautéed cruciferous veggies like broccoli',
        ],
        nonVegetarianOptions: [
          'Turkey berry walnut salad with olive oil vinaigrette',
          'Seared tuna or egg niçoise salad with green beans',
        ],
      },
      {
        category: 'Fiber-Rich Foods',
        description: 'Supports smooth digestion and healthy hormone metabolism.',
        vegetarianOptions: [
          'Ground flaxseed, chia pudding, lentils, and pears',
          'Artichokes, raspberries, and whole oats',
        ],
        nonVegetarianOptions: [
          'Grilled white fish with lentil and herb pilaf',
          'Omelet with spinach, mushrooms, and seeded whole-grain toast',
        ],
      },
      {
        category: 'Clean Protein Sources',
        description: 'Sustains muscle recovery during higher-intensity movement.',
        vegetarianOptions: [
          'Lentils, roasted chickpeas, cottage cheese, and almonds',
          'Seitan or spiced tofu stir-fry',
        ],
        nonVegetarianOptions: [
          'Eggs, wild seafood, and lean poultry',
          'Greek yogurt parfait with seeds and fruit',
        ],
      },
    ],
    foodsOrHabitsToModerate: [
      'Reliance on high-sugar drinks for quick energy between busy social or work blocks',
      'Under-hydrating during higher-intensity exercise sessions',
    ],
    hydrationTip:
      'Keep water nearby throughout the day and add electrolytes or coconut water if exercising vigorously.',
    exerciseSuggestions: [
      'Group fitness classes, tennis, swimming, or running',
      'Higher-energy strength or interval sessions if feeling strong',
      'Social outdoor walks or hikes with friends',
    ],
    restAndSelfCare: [
      'Great window for collaborative work, social connection, and community activities',
      'Check in with your body rather than pushing past genuine fatigue',
    ],
    wellnessDisclaimer:
      'Ovulation windows in Bloom are cycle-based estimates only and must NEVER be used for contraception or pregnancy prevention.',
  },
  {
    phase: 'luteal',
    title: 'Luteal Phase',
    theme: 'Slow and Steady',
    shortDescription:
      'As progesterone rises and later tapers before your next period, anchor blood sugar with complex carbs, magnesium, and calming routines.',
    detailedGuidance:
      'In the luteal phase, resting metabolic needs may feel slightly higher and cravings or premenstrual sensitivity can appear. Steady meals with complex carbohydrates, fiber, protein, and magnesium support comfort and calmer evenings.',
    typicalDayRangeLabel: 'Typically the ~12–16 days leading up to your next period',
    foodsToEnjoy: [
      {
        category: 'Complex Carbohydrates',
        description: 'Helps support steady energy, mood balance, and gentle serotonin synthesis.',
        vegetarianOptions: [
          'Roasted sweet potatoes, brown rice, squash, and rolled oats',
          'Whole-grain pasta with roasted tomato and white bean sauce',
        ],
        nonVegetarianOptions: [
          'Baked salmon with wild rice and roasted root vegetables',
          'Herbed chicken and sweet potato sheet-pan dinner',
        ],
      },
      {
        category: 'Magnesium & B-Vitamin Foods',
        description: 'Supports restful sleep and eases premenstrual tension.',
        vegetarianOptions: [
          'Pumpkin seeds, sunflower seeds, spinach, and dark chocolate',
          'Chickpeas, avocado, and toasted almonds',
        ],
        nonVegetarianOptions: [
          'Pasture-raised turkey, tuna, or mackerel',
          'Eggs with sautéed greens and avocado toast',
        ],
      },
      {
        category: 'Balanced Protein & Healthy Fats',
        description: 'Prevents sharp afternoon hunger dips and supports satiety.',
        vegetarianOptions: [
          'Walnuts, peanut or almond butter with apple slices',
          'Hummus, edamame, and lentil curry',
        ],
        nonVegetarianOptions: [
          'Baked cod or chicken thighs with olive oil roasted broccoli',
          'Greek yogurt with walnuts and cinnamon',
        ],
      },
      {
        category: 'Fiber-Rich Comfort Foods',
        description: 'Helps keep digestion regular when progesterone slows transit.',
        vegetarianOptions: [
          'Chia seeds, cooked pears, Brussels sprouts, and black beans',
          'Warm barley and vegetable soup',
        ],
        nonVegetarianOptions: [
          'Turkey and three-bean chili',
          'Grilled trout over warm farro and wilted greens',
        ],
      },
    ],
    foodsOrHabitsToModerate: [
      'Large amounts of caffeine late in the afternoon, which can intensify restlessness or disrupt sleep',
      'Long gaps between meals that trigger blood-sugar dips and irritability',
      'Excess alcohol in the premenstrual days if it worsens sleep or mood',
    ],
    hydrationTip:
      'Sip herbal teas like peppermint, rooibos, or chamomile in the evening alongside steady daytime water intake.',
    exerciseSuggestions: [
      'Pilates, barre, moderate strength training, or steady-state cycling',
      'Transitioning to gentler yoga and stretching in the final premenstrual days',
      'Low-pressure walks listening to music or a podcast',
    ],
    restAndSelfCare: [
      'Keep a consistent wind-down routine and dim screens 45 minutes before bed',
      'Journal thoughts or feelings without self-judgment',
      'Build extra buffer time into busy weeks ahead of your period',
    ],
    wellnessDisclaimer:
      'General wellness guidance only. If premenstrual symptoms significantly interfere with daily life, please consult a qualified clinician.',
  },
];
