// src/utils/carnivoreAnalysis.js
class CarnivoreAnalysis {
  constructor() {
    // Core diet recommendations (kosher, carnivore-focused with safe additions)
    this.primaryMeats = [
      {
        name: "grass-fed beef",
        priority: 1,
        nutrients: ["B12", "Iron", "Zinc", "Creatine"],
        preparation: ["Kosher slaughter, soaked and salted", "Grilled", "Slow-cooked"],
        source: "Grass-fed, kosher-certified"
      },
      {
        name: "lamb",
        priority: 1,
        nutrients: ["B12", "Iron", "Zinc", "CLA"],
        preparation: ["Kosher slaughter, soaked and salted", "Roasted", "Grilled"],
        source: "Grass-fed, kosher-certified"
      },
      {
        name: "organ meats (liver, heart)",
        priority: 1,
        nutrients: ["Vitamin A", "B12", "Iron", "Copper"],
        preparation: ["Kosher slaughter, soaked and salted", "Lightly cooked"],
        source: "From kosher beef or lamb"
      },
      {
        name: "kosher chicken",
        priority: 2,
        nutrients: ["Protein", "B3", "B6"],
        preparation: ["Kosher slaughter, soaked and salted", "Roasted", "Grilled"],
        source: "Free-range, kosher-certified"
      }
    ];

    this.safeFruits = [
      {
        name: "berries (organic)",
        priority: 3,
        nutrients: ["Vitamin C", "Antioxidants"],
        preparation: ["Fresh, inspected for bugs", "Frozen"],
        notes: "Organic, kosher-safe"
      },
      {
        name: "apples (organic)",
        priority: 3,
        nutrients: ["Fiber", "Vitamin C"],
        preparation: ["Fresh, inspected for bugs", "Peeled if preferred"],
        notes: "Organic, kosher-safe"
      }
    ];

    this.safeVeggies = [
      {
        name: "leafy greens (organic)",
        priority: 4,
        nutrients: ["Magnesium", "Vitamin K"],
        preparation: ["Washed thoroughly, inspected for bugs", "Lightly steamed"],
        notes: "Organic, kosher-safe"
      },
      {
        name: "zucchini (organic)",
        priority: 4,
        nutrients: ["Vitamin C", "Potassium"],
        preparation: ["Washed thoroughly, inspected for bugs", "Steamed"],
        notes: "Organic, kosher-safe"
      }
    ];

    // Toxins to avoid (unchanged, compatible with kosher)
    this.toxins = {
      heavyMetals: [
        { name: "mercury", source: "large fish (non-kosher anyway)", avoidance: "Stick to kosher poultry or ruminants" },
        { name: "lead", source: "old pipes", avoidance: "Use filtered water" }
      ],
      pesticides: [
        { name: "glyphosate", source: "non-organic produce", avoidance: "Buy organic, wash thoroughly" }
      ],
      chemicals: [
        { name: "BPA", source: "plastic containers", avoidance: "Use glass or stainless steel" },
        { name: "PFAs", source: "non-stick pans", avoidance: "Cook with cast iron or stainless steel" }
      ]
    };

    // Lifestyle recommendations (kosher-compatible)
    this.lifestyleTips = [
      "Use filtered water to avoid impurities and maintain kosher purity.",
      "Cook with stainless steel or cast iron to avoid chemical leaching and keep kosher separation.",
      "Source meat from kosher, grass-fed suppliers.",
      "Spend time outdoors for natural vitamin D, aligning with holistic health.",
      "Keep separate utensils for meat and dairy to maintain kosher standards."
    ];

    // Implementation phases (adjusted for kosher)
    this.implementationPhases = {
      elimination: {
        duration: "30 days",
        foods: ["kosher beef", "salt", "water"],
        goals: ["Eliminate non-kosher and plant foods", "Reduce toxin exposure", "Establish baseline"]
      },
      reintroduction: {
        duration: "60-90 days",
        process: ["Add one food at a time", "Wait 3-5 days between additions"],
        order: ["Kosher lamb", "Kosher poultry", "Kosher organ meats", "Safe fruits", "Safe veggies"]
      },
      maintenance: {
        focus: ["Optimal kosher meat variety", "Incorporate low-toxin, kosher fruits/veggies", "Toxin-free, kosher living"]
      }
    };

    // Added preparation guidelines
    this.preparationGuidelines = {
      traditional: {
        requirements: [
          "Traditional hand slaughter",
          "Complete blood drainage",
          "Specific prayer/blessing during process",
          "Strict cleanliness standards"
        ],
        practices: [
          "Separate preparation areas",
          "Specific utensil requirements",
          "Careful meat and dairy separation",
          "Detailed inspection process"
        ],
        quality_checks: [
          "Animal welfare verification",
          "Health inspection",
          "Proper certification",
          "Clean facility standards"
        ]
      }
    };
  }

  // Updated analyzeFood method to include preparation standards
  analyzeFood(food) {
    const lowerFood = food.toLowerCase();

    // Check meats
    const primaryMeat = this.primaryMeats.find(m => m.name.toLowerCase().includes(lowerFood));
    if (primaryMeat) {
      return {
        recommendation: "Optimal Kosher Choice",
        priority: primaryMeat.priority,
        nutrients: primaryMeat.nutrients,
        preparation: primaryMeat.preparation,
        source: primaryMeat.source,
        frequency: "Daily consumption recommended",
        score: 10 - primaryMeat.priority + 1,
        kosherNote: "Ensure kosher certification and preparation",
        preparation_standards: this.preparationGuidelines.traditional // Added preparation guidelines
      };
    }

    // Check fruits
    const safeFruit = this.safeFruits.find(f => f.name.toLowerCase().includes(lowerFood));
    if (safeFruit) {
      return {
        recommendation: "Acceptable Kosher Addition",
        priority: safeFruit.priority,
        nutrients: safeFruit.nutrients,
        preparation: safeFruit.preparation,
        notes: safeFruit.notes,
        frequency: "Occasional use recommended",
        score: 10 - safeFruit.priority + 1,
        kosherNote: "Inspect for bugs per kosher law",
        preparation_standards: this.preparationGuidelines.traditional // Added for consistency, though less relevant for fruits
      };
    }

    // Check veggies
    const safeVeggie = this.safeVeggies.find(v => v.name.toLowerCase().includes(lowerFood));
    if (safeVeggie) {
      return {
        recommendation: "Acceptable Kosher Addition",
        priority: safeVeggie.priority,
        nutrients: safeVeggie.nutrients,
        preparation: safeVeggie.preparation,
        notes: safeVeggie.notes,
        frequency: "Occasional use recommended",
        score: 10 - safeVeggie.priority + 1,
        kosherNote: "Inspect for bugs per kosher law",
        preparation_standards: this.preparationGuidelines.traditional // Added for consistency, though less relevant for veggies
      };
    }

    // Default response for non-kosher or unknown foods
    return {
      recommendation: "Not Recommended",
      priority: 0,
      notes: "Not part of the kosher carnivore protocol",
      frequency: "Avoid",
      score: 0,
      kosherNote: "May not meet kosher standards"
    };
  }

  // Get a random toxin avoidance tip
  getToxinAvoidanceTip() {
    const toxinCategories = Object.keys(this.toxins);
    const category = toxinCategories[Math.floor(Math.random() * toxinCategories.length)];
    const toxin = this.toxins[category][Math.floor(Math.random() * this.toxins[category].length)];
    return {
      toxin: toxin.name,
      source: toxin.source,
      avoidance: toxin.avoidance,
      kosherNote: "Aligns with kosher purity goals"
    };
  }

  // Get a random lifestyle tip
  getLifestyleTip() {
    return this.lifestyleTips[Math.floor(Math.random() * this.lifestyleTips.length)];
  }

  // Get implementation advice for a specific phase
  getImplementationAdvice(phase) {
    return this.implementationPhases[phase] || this.implementationPhases.elimination;
  }

  // Generate a full daily recommendation
  getDailyRecommendation() {
    const meat = this.primaryMeats[Math.floor(Math.random() * this.primaryMeats.length)];
    const fruit = this.safeFruits[Math.floor(Math.random() * this.safeFruits.length)];
    const veggie = this.safeVeggies[Math.floor(Math.random() * this.safeVeggies.length)];
    const toxinTip = this.getToxinAvoidanceTip();
    const lifestyleTip = this.getLifestyleTip();

    return {
      diet: {
        main: {
          food: meat.name,
          preparation: meat.preparation[0],
          source: meat.source,
          kosherNote: "Ensure kosher slaughter and preparation"
        },
        sides: [
          { food: fruit.name, notes: fruit.notes, kosherNote: "Inspect for bugs" },
          { food: veggie.name, notes: veggie.notes, kosherNote: "Inspect for bugs" }
        ],
        separation: "Do not mix with dairy per kosher law"
      },
      toxinAvoidance: toxinTip,
      lifestyle: lifestyleTip
    };
  }
}

export default CarnivoreAnalysis;

// Example usage
/*
const analyzer = new CarnivoreAnalysis();
console.log(analyzer.analyzeFood("grass-fed beef"));
console.log(analyzer.getToxinAvoidanceTip());
console.log(analyzer.getDailyRecommendation());
*/