
import { GoogleGenAI, Type } from "@google/genai";
import { Video, UserInteractions } from "./types";

export interface VideoAnalysisResult {
  title: string;
  category: string;
  narration: string;
  horrorScore: number;
  diagnostics: string;
}

// القائمة الرسمية المعتمدة - يمنع تغيير حرف واحد لضمان عمل البوت
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
    // تم تحسين البرومبت ليكون أكثر دقة ودرامية كما طلب المستخدم
    const prompt = `
      أنت المحلل الرئيسي لـ "الحديقة المرعبة". مهمتك هي تحليل لقطة من فيديو بعنوان "${fileName}" وتقديم بيانات دقيقة بنسبة 100%.
      
      يجب أن تكون النتيجة في تنسيق JSON حصراً:
      {
        "title": "عنوان نيون غامض ومرعب جداً يجذب المشاهد فوراً (بالعربية)",
        "category": "اختر التصنيف الأكثر دقة من هذه القائمة فقط: ${OFFICIAL_CATEGORIES_LIST}",
        "narration": "سرد درامي مشوق ومرعب جداً يحكي ما يحدث في المقطع، يتكون من 4-6 جمل احترافية، افصل بين كل جملة وأخرى برمز | فقط لسهولة العرض",
        "horrorScore": 98,
        "diagnostics": "تحليل فني دقيق للعناصر المرعبة التي رصدتها في اللقطة"
      }
      
      قواعد صارمة:
      1. السرد (narration) يجب أن يكون غامضاً، تقشعر له الأبدان، وبأسلوب رواية القصص المرعبة وحقيقي 100%.
      2. العنوان (title) يجب أن يكون قصيراً وقوياً (مثلاً: "صرخة القبو"، "الكيان المفقود").
      3. لا تخرج عن قائمة التصنيفات الرسمية المحددة لك.
      4. كن مبدعاً في وصف الرعب والغموض لضمان تجربة مستخدم فريدة.
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
        temperature: 0.8,
        topK: 64,
        topP: 0.95
      }
    });

    const resultText = response.text || "{}";
    return JSON.parse(resultText) as VideoAnalysisResult;
  }).catch((e) => {
    console.error("AI Analysis Failed:", e);
    return {
      title: "كيان مجهول في الظلام",
      category: "أهوال مرعبة",
      narration: "شيء ما يتحرك في الزاوية المظلمة.. | هل تظن أنك وحدك هنا؟ | الصمت هو بداية العاصفة.. | الحديقة المرعبة تفتح أبوابها لك الآن.",
      horrorScore: 90,
      diagnostics: "حدث خطأ في الاتصال، تم استخدام السرد الاحتياطي."
    };
  });
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
