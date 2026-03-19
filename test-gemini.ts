import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    try {
        console.log("Testing gemini-2.5-flash...");
        const response1 = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Hello",
        });
        console.log("Success 2.5:", response1.text);
    } catch (e) {
        console.error("Error 2.5:", e);
    }

    try {
        console.log("Testing gemini-3-flash-preview...");
        const response2 = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Hello",
        });
        console.log("Success 3:", response2.text);
    } catch (e) {
        console.error("Error 3:", e);
    }
}

test();
