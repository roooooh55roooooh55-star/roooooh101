
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
      أنت خبير في تحليل فيديوهات الرعب والظواهر الخارقة.
      قم بتحليل هذه الصورة المستخرجة من فيديو بعنوان "${fileName}".
      يجب أن تكون نتيجتك دقيقة بنسبة 100% وتتبع هذا التنسيق الصارم جداً (JSON):
      {
        "title": "عنوان نيون درامي وجذاب للغاية باللغة العربية",
        "category": "يجب أن يكون حصراً واحداً من: ${OFFICIAL_CATEGORIES_LIST}",
        "narration": "سرد مرعب وغامض يتكون من 3-5 جمل درامية، افصل بين كل جملة وأخرى برمز | حصراً",
        "horrorScore": 95,
        "diagnostics": "وصف فني موجز لما تم رصده في الصورة"
      }
      
      شروط إضافية:
      1. السرد يجب أن يكون بلهجة عربية فصحى مشوقة أو لهجة مصرية درامية.
      2. العنوان يجب أن يثير الفضول والرعب.
      3. التصنيف يجب أن يطابق أحد التصنيفات المحددة بدقة.
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
        topP: 0.9
      }
    });

    return JSON.parse(response.text || "{}") as VideoAnalysisResult;
  }).catch(() => ({
    title: "كابوس غامض في الحديقة",
    category: "أهوال مرعبة",
    narration: "شيء ما يراقبك من الظلال... | الصمت هنا ليس علامة أمان... | هل تشعر بأنفاسهم خلفك؟",
    horrorScore: 88,
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
    
    const prompt = `
      رتب مصفوفة المعرفات التالية بناءً على تفضيلات المستخدم بناءً على الأقسام التي أعجب بها: ${favoriteCategories.join(', ')}.
      اجعل الفيديوهات الأكثر ملاءمة في البداية.
      المعرفات: ${JSON.stringify(allVideos.map(v => v.id))}
      أرجع مصفوفة JSON فقط تحتوي على المعرفات المرتبة.
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
      contents: `اقترح 5 أوسمة (tags) مرعبة وفريدة لفيديو بعنوان "${title}" في قسم "${category}". أرجع مصفوفة JSON فقط.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return JSON.parse(response.text || "[]");
  }).catch(() => ["رعب", "غموض", "هجمات", "أهوال"]);
}
