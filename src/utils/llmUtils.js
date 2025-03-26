import { Configuration, OpenAIApi } from 'openai';
// You can also import other LLM clients here

export class LLMService {
  constructor(provider = 'openai', apiKey) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.client = this.initializeClient();
  }

  initializeClient() {
    switch(this.provider) {
      case 'openai':
        const configuration = new Configuration({ apiKey: this.apiKey });
        return new OpenAIApi(configuration);
      // Add other LLM providers here
      default:
        throw new Error('Unsupported LLM provider');
    }
  }

  async analyzeDiet(foodData, userPreferences) {
    try {
      const prompt = `
        Analyze this food data for a carnivore-focused diet:
        ${JSON.stringify(foodData)}
        
        User preferences: ${JSON.stringify(userPreferences)}
        
        Provide recommendations considering:
        1. Protein content and quality
        2. Fat content and quality
        3. Micronutrient profile
        4. Compatibility with carnivore diet
        5. Suggested portion sizes
        6. Best cooking methods
        7. Potential complementary foods
        
        Format the response as JSON with these keys:
        - recommendation
        - rating (1-10 for carnivore diet compatibility)
        - portions
        - cooking_methods
        - complementary_foods
        - warnings (if any)
      `;

      const response = await this.client.createCompletion({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      return JSON.parse(response.data.choices[0].text);
    } catch (error) {
      console.error('LLM analysis error:', error);
      throw error;
    }
  }
}