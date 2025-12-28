
import { GoogleGenAI, Type } from "@google/genai";
import { Video, UserInteractions } from "./types";

export interface VideoAnalysisResult {
  title: string;
  category: string;
  narration: string;
  horrorScore: number;
  diagnostics: string;
}

const OFFICIAL_CATEGORIES_LIST = "[هجمات مرعبة، رعب حقيقي، رعب الحيوانات، أخطر المشاهد، أهوال مرعبة، رعب كوميدي، لحظات مرعبة، صدمه]";

const recommendationCache = new Map<string, string[]>();

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429;
    if (retries > 0 && isRateLimit) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function analyzeVideoFrames(base64Image: string, fileName: string): Promise<VideoAnalysisResult> {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      تحليل عينة فيديو مرعبة بعنوان "${fileName}".
      المطلوب نتيجة JSON بهذا التنسيق:
      {
        "title": "عنوان نيون مرعب",
        "category": "واحد من: ${OFFICIAL_CATEGORIES_LIST}",
        "narration": "سرد درامي قصير مقسم بـ |",
        "horrorScore": 90,
        "diagnostics": "تقرير الحالة"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } }
          ]
        }
      ],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || "{}") as VideoAnalysisResult;
  }).catch(() => ({
    title: "كابوس مجهول الهوية",
    category: "أهوال مرعبة",
    narration: "ظلال تتحرك... | الصمت يقتل... | اهرب الآن.",
    horrorScore: 66,
    diagnostics: "تم استخدام المسح الاحتياطي."
  }));
}

export async function getRecommendedFeed(allVideos: Video[], interactions: UserInteractions): Promise<string[]> {
  const cacheKey = `${allVideos.length}-${interactions.likedIds.length}`;
  if (recommendationCache.has(cacheKey)) return recommendationCache.get(cacheKey)!;

  return callWithRetry(async () => {
    if (!process.env.API_KEY) return allVideos.map(v => v.id);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const likedVideos = allVideos.filter(v => interactions.likedIds.includes(v.id));
    const favoriteCategories = Array.from(new Set(likedVideos.map(v => v.category)));
    
    const prompt = `
      رتب مصفوفة المعرفات التالية بناءً على تفضيل المستخدم لهذه الأقسام: ${favoriteCategories.join(', ')}.
      المعرفات: ${JSON.stringify(allVideos.map(v => v.id))}
      أرجع مصفوفة JSON فقط.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });

    const result = JSON.parse(response.text || "[]");
    recommendationCache.set(cacheKey, result);
    return result;
  }).catch(() => allVideos.map(v => v.id));
}

export async function suggestTags(title: string, category: string): Promise<string[]> {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `اقترح 5 أوسمة (tags) بدون علامة # لفيديو بعنوان "${title}" في قسم "${category}". أرجع مصفوفة JSON فقط.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(response.text || "[]");
  }).catch(() => ["رعب", "غموض", "هجمات", "أهوال"]);
}
