import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Place {
  name: string;
  location: string;
  priceRange: string;
  description: string;
  category: "cafe" | "restaurant" | "activity" | "other";
  rating: number;
}

export interface RecommendationResponse {
  summary: string;
  places: Place[];
}

export async function getRecommendations(query: string): Promise<RecommendationResponse> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: {
      systemInstruction: `You are an expert local guide for Alexandria, Egypt. 
      Your task is to provide recommendations for places to visit, eat, or hang out based on user queries.
      You must respond in the same language as the user (Arabic or English).
      Provide a brief summary and a list of specific places.
      For each place, include:
      - name: The name of the place.
      - location: A short description of where it is (e.g., "Corniche", "Agami", "Smouha").
      - priceRange: Estimated price (e.g., "Cheap", "Moderate", "Expensive" or in EGP).
      - description: A short, catchy description.
      - category: One of "cafe", "restaurant", "activity", or "other".
      - rating: A mock rating from 1 to 5.
      
      Ensure the data is accurate for Alexandria.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: "A brief friendly summary of the recommendations in the user's language.",
          },
          places: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                location: { type: Type.STRING },
                priceRange: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { 
                  type: Type.STRING,
                  enum: ["cafe", "restaurant", "activity", "other"]
                },
                rating: { type: Type.NUMBER }
              },
              required: ["name", "location", "priceRange", "description", "category", "rating"]
            }
          }
        },
        required: ["summary", "places"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text) as RecommendationResponse;
}
