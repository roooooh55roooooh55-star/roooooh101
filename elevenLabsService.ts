
/**
 * خدمة ElevenLabs المتقدمة مع نظام تدوير المفاتيح الذكي
 */

export interface SubscriptionInfo {
  character_count: number;
  character_limit: number;
  status: string;
}

export async function getSubscriptionInfo(apiKey: string): Promise<SubscriptionInfo | null> {
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/user/subscription`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('ElevenLabs Subscription Error:', error);
    return null;
  }
}

/**
 * دالة توليد الصوت مع دعم التناوب المتسلسل (Sequential Rotation)
 * تقوم بحفظ آخر مفتاح ناجح لتبدأ منه في المرة القادمة، مما يسرع العملية جداً
 */
export async function generateSpeech(text: string, apiKeys: string[], voiceId: string): Promise<string | null> {
  if (!apiKeys || apiKeys.length === 0 || !text) return null;

  // تنظيف النص لضمان استقرار الخدمة
  const cleanText = text.replace(/[\n\r]/g, ' ').trim();

  // الحصول على فهرس آخر مفتاح كان يعمل من الذاكرة المحلية
  let startIndex = parseInt(localStorage.getItem('eleven_labs_active_index') || '0');
  if (startIndex >= apiKeys.length) startIndex = 0;

  // محاولة المرور على كل المفاتيح بدءاً من المفتاح الذي كان يعمل
  for (let i = 0; i < apiKeys.length; i++) {
    const currentIndex = (startIndex + i) % apiKeys.length;
    const key = apiKeys[currentIndex];
    
    if (!key) continue;
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': key,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        }),
      });

      if (response.ok) {
        // إذا نجح المفتاح، نقوم بحفظ الفهرس الخاص به ليكون هو الأول في المحاولة القادمة
        localStorage.setItem('eleven_labs_active_index', currentIndex.toString());
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      
      // إذا كان المفتاح مستهلك (429) أو غير صالح (401)
      if (response.status === 429 || response.status === 401) {
        console.warn(`Key Rotation: Key at index ${currentIndex} is exhausted/invalid. Trying next...`);
        // نستمر في الحلقة لتجربة المفتاح التالي
        continue;
      }
      
      const errorText = await response.text();
      console.error(`ElevenLabs Error ${response.status}:`, errorText);
    } catch (error) {
      console.error(`ElevenLabs Network Error:`, error);
    }
  }

  // إذا وصلنا إلى هنا، فهذا يعني أن جميع المفاتيح فشلت
  console.error("Critical: All ElevenLabs keys are exhausted or invalid.");
  return null;
}
