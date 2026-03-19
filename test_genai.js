import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ 
  apiKey: process.env.DREAM_API || process.env.GEMINI_API_KEY
});

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'test',
    });
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("Caught error:", err);
  }
}
test();
