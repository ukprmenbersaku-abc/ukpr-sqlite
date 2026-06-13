import { GoogleGenAI } from "@google/genai";

export const generateSqlFromPrompt = async (apiKey: string, schema: string, userPrompt: string): Promise<string> => {
  // Use the API key provided by the user, not process.env which causes crashes in browser builds
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
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
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Pass through specific API errors if possible
    throw new Error(error.message || "Failed to generate SQL. Please check the system configuration.");
  }
};

export const repairSqlWithError = async (apiKey: string, schema: string, badSql: string, errorMsg: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const systemPrompt = `
    You are an expert SQLite developer.
    The user ran a SQL query that failed with an error. Your task is to correct the SQL query so that it runs successfully and returns the intended result.
    
    Rules:
    1. Return ONLY the corrected SQL query. No markdown formatting (no \`\`\`sql), no explanations.
    2. Use the provided schema to ensure table and column names are correct.
  `;

  const prompt = `
    Database Schema:
    ${schema}

    Failed SQL Query:
    ${badSql}

    Error Message:
    ${errorMsg}

    Please correct the SQL query to resolve this error. Return only the corrected SQL query.
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
    return text.replace(/```sql/g, '').replace(/```/g, '').trim();
  } catch (error: any) {
    console.error("Gemini SQL Repair Error:", error);
    throw new Error(error.message || "Failed to repair SQL.");
  }
};