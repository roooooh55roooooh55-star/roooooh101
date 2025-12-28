
/**
 * خدمة ElevenLabs للتعامل مع توليد الأصوات وجلب إحصائيات المفاتيح
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

export async function generateSpeech(text: string, apiKey: string, voiceId: string): Promise<string | null> {
  if (!apiKey || !text) return null;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) throw new Error('فشل توليد الصوت من ElevenLabs');

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    return null;
  }
}
