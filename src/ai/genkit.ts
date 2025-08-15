import google_generative as  genai ;

// Configure genai with API key
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY not found in environment variables');
}

// Initialize genai
export const model = genai.getGenerativeModel({ 
  model: 'gemini-pro',
  apiKey: apiKey
});

// Helper function to generate content
export const generateContent = async (prompt: string): Promise<string> => {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating content with genai:', error);
    throw error;
  }
};

// Helper function to generate structured content (JSON)
export const generateStructuredContent = async <T>(
  prompt: string, 
  fallback: T
): Promise<T> => {
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Try to parse as JSON
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using fallback');
      return fallback;
    }
  } catch (error) {
    console.error('Error generating structured content with genai:', error);
    return fallback;
  }
};

// Configuration for different models
export const models = {
  geminiPro: 'gemini-pro',
  geminiProVision: 'gemini-pro-vision'
} as const;

export type ModelType = typeof models[keyof typeof models];

// Get model instance
export const getModel = (modelType: ModelType = 'gemini-pro') => {
  return genai.getGenerativeModel({ 
    model: modelType,
    apiKey: apiKey
  });
};
