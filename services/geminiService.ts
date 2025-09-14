import { GoogleGenAI } from "@google/genai";
import { JigRequest } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API 키를 찾을 수 없습니다. API_KEY 환경 변수를 설정해주세요.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export async function getJigRequestSummary(request: JigRequest): Promise<string> {
  if (!API_KEY) {
    return "Gemini API 키가 설정되지 않았습니다. 모의 요약을 반환합니다.";
  }

  const prompt = `
    다음 지그 제작 요청을 관리자가 한눈에 파악할 수 있도록 한 문장으로 요약해 주세요. 
    품명, 핵심 규격, 그리고 요청 사유(비고)가 포함되어야 합니다.

    - 품명: ${request.itemName}
    - 품번: ${request.itemNumber}
    - 규격: ${request.specification}
    - 비고: ${request.remarks}
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API 호출 오류:", error);
    throw new Error("Gemini API와 통신하는데 실패했습니다.");
  }
}
