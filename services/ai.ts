import { GoogleGenAI } from "@google/genai";
import { SystemState } from '../types';

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI", error);
}

export const getSystemAnalysis = async (state: SystemState): Promise<string> => {
  if (!ai) return "Gemini API Key not configured.";

  const prompt = `
    You are a Senior Site Reliability Engineer (SRE). Analyze the following system simulation state and provide a brief, professional status report.
    
    Current Metrics:
    - Traffic: ${state.actualTraffic.toFixed(0)} RPS
    - Servers: ${state.serverCount}
    - Databases: ${state.dbCount}
    - Architecture includes Queue: ${state.hasQueue ? "Yes" : "No"}
    - Queue Size: ${state.queueSize}
    - Auto-scaling Enabled: ${state.isAutoScaling ? "Yes" : "No"}

    Identify bottlenecks, comment on the efficiency of the current scaling strategy, and suggest if manual intervention is needed. 
    Keep it under 3 sentences. Be concise and technical.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert backend engineer monitoring a high-traffic web application.",
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought
      }
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "System analysis temporarily unavailable.";
  }
};