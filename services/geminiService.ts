import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateSqlFromPrompt = async (schema: string, userPrompt: string): Promise<string> => {
  const ai = getAiClient();
  
  const systemPrompt = `
    You are an expert SQLite developer.
    Your task is to generate a valid SQLite SQL query based on the provided database schema and the user's natural language request.
    
    Rules:
    1. Return ONLY the SQL query. No markdown formatting (no \`\`\`sql), no explanations.
    2. Use the provided schema to ensure table and column names are correct.
    3. If the user asks for something that cannot be done with the schema, return a SQL comment explaining why (e.g., -- Cannot find table X).
    4. Default to a limit of 100 rows if the result set might be large and no limit is specified.
  `;

  const prompt = `
    Schema:
    ${schema}

    User Request:
    ${userPrompt}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemPrompt,
      },
      contents: prompt,
    });

    const text = response.text || '';
    // Clean up any potential markdown formatting if the model slips up
    return text.replace(/```sql/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate SQL. Please check your API key and try again.");
  }
};
