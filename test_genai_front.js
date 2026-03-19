import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ 
  apiKey: process.env.DREAM_API || process.env.GEMINI_API_KEY
});

async function test() {
  try {
    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            intent: { type: Type.STRING, enum: ["QUESTION", "MODIFICATION", "NEW_DESIGN"] },
            isSufficient: { type: Type.BOOLEAN },
            isTooBroad: { type: Type.BOOLEAN },
            missingParams: { type: Type.ARRAY, items: { type: Type.STRING } },
            reason: { type: Type.STRING }
        },
        required: ["intent"]
      }
    };
    
    // Simulate what body-parser does (stripping prototypes and enum references down to strings)
    const jsonConfig = JSON.parse(JSON.stringify(config));
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Hello",
      config: jsonConfig
    });
    console.log("Success:", !!response.text);
  } catch (err) {
    console.error("Caught error:", err);
  }
}
test();
