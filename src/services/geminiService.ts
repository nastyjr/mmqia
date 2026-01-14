import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

// Initialize Gemini Client safely for Vite
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Generic helper to get a response from Gemini
 */
export const getGeminiResponse = async (prompt: string, schema?: any): Promise<any> => {
  if (!API_KEY) {
    console.warn("Gemini API Key is missing");
    return null;
  }

  try {
    const config: any = {
      responseMimeType: schema ? "application/json" : "text/plain",
    };

    if (schema) {
      config.responseSchema = schema;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config
    });

    if (schema) {
      return JSON.parse(response.text || '{}');
    }

    return response.text;
  } catch (error) {
    console.error("Error connecting to Gemini:", error);
    return null;
  }
};

export const suggestCategory = async (description: string): Promise<string | null> => {
  if (!description) return null;

  try {
    const response = await getGeminiResponse(
      `Categorize the following financial transaction description into exactly one of these categories: Ventas, Salario, Alquiler, Comida, Transporte, Servicios, Entretenimiento, Salud, Educación, Otros, Inversiones.
      
      Description: "${description}"
      
      Return only the category name as a string.`,
      {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING }
        }
      }
    );

    return response?.category || 'Otros';
  } catch (error) {
    console.error("Error suggesting category:", error);
    return null;
  }
};

export const analyzeFinances = async (transactions: Transaction[]): Promise<{ summary: string, tips: string[] }> => {
  try {
    // Simplify data to save tokens and privacy
    const simplifiedData = transactions.map(t => ({
      date: t.date,
      type: t.type,
      category: t.category,
      amount: t.amount,
      desc: t.description
    }));

    const response = await getGeminiResponse(
      `Analyze the following financial transaction data and provide a brief financial health summary (in Spanish) and 3 actionable tips for saving or improving financial health.

      Data: ${JSON.stringify(simplifiedData)}
      `,
      {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A paragraph summarizing the financial situation." },
          tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 actionable tips." }
        }
      }
    );

    return {
      summary: response?.summary || "No se pudo generar el análisis.",
      tips: response?.tips || []
    };
  } catch (error) {
    console.error("Error analyzing finances:", error);
    return {
      summary: "Hubo un error al conectar con el asistente inteligente.",
      tips: []
    };
  }
};