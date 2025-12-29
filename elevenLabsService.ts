
/**
 * خدمة ElevenLabs المحدثة مع دعم تدوير المفاتيح المتقدم
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
 * دالة توليد الصوت مع دعم التبديل التلقائي بين المفاتيح في حال فشل أحدها
 * تم تحسين الرؤوس (Headers) لضمان التوافق مع Netlify
 */
export async function generateSpeech(text: string, apiKeys: string[], voiceId: string): Promise<string | null> {
  if (!apiKeys || apiKeys.length === 0 || !text) return null;

  // تنظيف النص لضمان عدم وجود أحرف غريبة قد تسبب فشل الطلب
  const cleanText = text.replace(/[\n\r]/g, ' ').trim();

  for (const key of apiKeys) {
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
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      
      // في حال نفاذ المفتاح (429 أو 401)، ننتقل للمفتاح التالي
      if (response.status === 429 || response.status === 401) {
        console.warn(`Key rotation: Key ${key.substring(0, 6)}... is exhausted or invalid. Switching...`);
        continue;
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error(`ElevenLabs Error: ${response.status}`, errorData);
    } catch (error) {
      console.error(`ElevenLabs Network Error:`, error);
    }
  }

  return null;
}
