import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FieldDefinition, FieldType } from "../types";

const mapFieldTypeToGeminiType = (field: FieldDefinition): Schema => {
  switch (field.type) {
    case FieldType.Number:
      return { type: Type.NUMBER, description: field.name };
    case FieldType.Boolean:
      return { type: Type.BOOLEAN, description: field.name };
    case FieldType.Select:
      return { 
        type: Type.STRING, 
        description: `${field.name} (Must be one of: ${field.options?.join(', ')})`,
        enum: field.options
      };
    case FieldType.KeyValueSelect:
      // For Key-Value, we want the AI to select the VALUE, but we provide context on what it means (the KEY)
      return {
        type: Type.STRING,
        description: `${field.name} (Select the code/value that matches the description: ${field.keyValueOptions?.map(o => `${o.value} (${o.key})`).join(', ')})`,
        enum: field.keyValueOptions?.map(o => o.value)
      };
    case FieldType.Image:
      return { type: Type.STRING, description: `A creative visual description or URL for ${field.name}` };
    default:
      return { type: Type.STRING, description: field.name };
  }
};

export const generateGameContent = async (
  apiKey: string,
  schema: FieldDefinition[],
  userPrompt: string
): Promise<any> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  // Dynamically build the response schema based on the user's table columns
  const properties: Record<string, Schema> = {};
  schema.forEach((field) => {
    properties[field.id] = mapFieldTypeToGeminiType(field);
  });

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: properties,
    required: schema.map(f => f.id),
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a single creative and unique item for a board game database.
      Context: ${userPrompt || "A fantasy board game item."}
      
      For 'image' fields, provide a short visual description text, not a URL.
      Ensure the data strictly follows the provided schema constraints.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};