
import { GoogleGenAI, Type } from "@google/genai";
import { Video, UserInteractions } from "./types";

export interface VideoAnalysisResult {
  title: string;
  category: string;
  narration: string;
  horrorScore: number;
  diagnostics: string;
}

const OFFICIAL_CATEGORIES_LIST = "[هجمات مرعبة، رعب حقيقي، رعب الحيوانات، أخطر المشاهد، أهوال مرعبة، رعب كوميدي، صدمه، لحظات مرعبة]";

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
    // تم تحسين البرومبت ليكون فائق الدقة كما طلب المستخدم
    const prompt = `
      بصفتك الذكاء الاصطناعي الخاص بـ "الحديقة المرعبة"، قم بتحليل لقطة الفيديو هذه المسمى "${fileName}".
      يجب أن تكون نتيجتك دقيقة وصحيحة بنسبة 100% وتتبع هذا التنسيق الصارم جداً (JSON):
      {
        "title": "عنوان مرعب ودرامي جداً يصف ما يحدث بالضبط في الفيديو بالعربية",
        "category": "يجب أن يكون حصراً واحداً من القائمة الرسمية: ${OFFICIAL_CATEGORIES_LIST}",
        "narration": "سرد مرعب وغامض يحكي قصة ما نراه في 4-6 جمل مشوقة، افصل بين كل جملة وأخرى برمز | حصراً",
        "horrorScore": 99,
        "diagnostics": "وصف فني لما تم تحليله في اللقطة"
      }
      
      شروط حاسمة:
      1. السرد يجب أن يكون حقيقياً ومطابقاً لمحتوى الفيديو بنسبة 100%.
      2. العنوان يجب أن يكون نيون وجذاب (مثال: "صرخة الفجر"، "الكيان الخفي").
      3. لا تخرج أبداً عن قائمة التصنيفات الرسمية.
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
      config: { 
        responseMimeType: "application/json",
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as VideoAnalysisResult;
  }).catch(() => ({
    title: "كيان غامض في الظلام",
    category: "أهوال مرعبة",
    narration: "شيء ما يتحرك في الزوايا المنسية.. | هل تشعر بأنفاسهم خلفك؟ | الحديقة المرعبة لا تنسى أحداً.. | الصمت هو بداية الرعب الحقيقي.",
    horrorScore: 90,
    diagnostics: "تم استخدام المسح الاحتياطي التلقائي."
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
    const prompt = `رتب مصفوفة المعرفات التالية بناءً على تفضيلات المستخدم للأقسام: ${favoriteCategories.join(', ')}. المعرفات: ${JSON.stringify(allVideos.map(v => v.id))}. أرجع مصفوفة JSON فقط.`;
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
