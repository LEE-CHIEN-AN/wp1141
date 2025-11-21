import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL, GEMINI_CONFIG } from "@/config/conversation";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GeminiRequest {
  prompt: string;
  context?: string;
}

export interface GeminiResponse {
  text: string;
  error?: string;
}

export async function generateResponse(
  request: GeminiRequest
): Promise<GeminiResponse> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      ...GEMINI_CONFIG,
    });

    const fullPrompt = request.context
      ? `${request.context}\n\n${request.prompt}`
      : request.prompt;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return { text };
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);

    if (error instanceof Error) {
      // 處理配額限制
      if (error.message.includes("429") || error.message.includes("quota")) {
        return {
          text: "",
          error: "API_QUOTA_EXCEEDED",
        };
      }

      // 處理其他錯誤
      return {
        text: "",
        error: error.message,
      };
    }

    return {
      text: "",
      error: "UNKNOWN_ERROR",
    };
  }
}


