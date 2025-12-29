
import { Video } from './types';

const BOT_TOKEN = "8377287398:AAHlw02jpdHRE6OtwjABgCPVrxF4HLRQT9A";
const CHANNEL_ID = "-1003563010631";

const urlCache = new Map<string, {url: string, expiry: number}>();

/**
 * جلب رابط فيديو مباشر متجدد من تليجرام
 */
export const getDirectVideoUrl = async (fileId: string): Promise<string | null> => {
  if (!fileId) return null;
  const cached = urlCache.get(fileId);
  if (cached && cached.expiry > Date.now()) return cached.url;

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    if (!response.ok) throw new Error("File fetch failed");
    const data = await response.json();
    if (data.ok && data.result?.file_path) {
      const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
      urlCache.set(fileId, { url, expiry: Date.now() + 3000000 }); 
      return url;
    }
    return null;
  } catch (error) {
    console.warn("Error refreshing video link:", error);
    return null;
  }
};

/**
 * دالة مساعدة لفك ترميز النصوص وضمان التعامل الصحيح مع الحروف العربية
 */
const decodeTelegramText = (text: string): string => {
  try {
    return decodeURIComponent(JSON.parse(`"${text.replace(/"/g, '\\"')}"`));
  } catch (e) {
    return text;
  }
};

/**
 * جلب الفيديوهات مع دعم channel_post ونظام الأرشفة الذكي
 */
export const fetchChannelVideos = async (): Promise<Video[]> => {
  try {
    // جلب آخر 100 تحديث من البوت
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1&limit=100`);
    
    if (!response.ok) throw new Error(`Telegram API Error: ${response.status}`);
    const data = await response.json();
    
    const newFetchedVideos: Video[] = [];

    if (data.ok && data.result) {
      data.result.forEach((item: any) => {
        // دعم منشورات القنوات (channel_post) والرسائل العادية
        const msg = item.channel_post || item.message;
        if (!msg) return;

        const isVideo = msg.video || (msg.document && msg.document.mime_type?.includes('video'));
        if (isVideo) {
          const videoData = msg.video || msg.document;
          const caption = msg.caption ? decodeTelegramText(msg.caption) : "";
          
          // استخراج البيانات باستخدام Regex مرن
          const categoryMatch = caption.match(/\[التصنيف:\s*(.*?)\]/);
          const titleMatch = caption.match(/\[العنوان:\s*(.*?)\]/);
          const narrationMatch = caption.match(/\[السرد:\s*(.*?)\]/);
          const typeMatch = caption.match(/\[النوع:\s*(.*?)\]/);

          const category = categoryMatch ? categoryMatch[1].trim() : "أهوال مرعبة";
          const title = titleMatch ? titleMatch[1].trim() : "كابوس من الحديقة";
          const narration = narrationMatch ? narrationMatch[1].trim() : "";
          const typeTag = typeMatch ? typeMatch[1].trim() : null;
          
          const fileId = videoData.file_id;
          
          newFetchedVideos.push({
            id: fileId,
            public_id: videoData.file_unique_id,
            video_url: "", // سيتم جلبه عند التشغيل لتوفير الموارد
            telegram_file_id: fileId,
            title: title,
            category: category,
            narration: narration,
            type: typeTag === 'long' ? 'long' : (videoData.height || 0) > (videoData.width || 0) ? 'short' : 'long',
            likes: 0,
            views: 0,
            created_at: new Date(msg.date * 1000).toISOString()
          });
        }
      });
    }

    // دمج النتائج الجديدة مع الأرشيف المحلي لضمان عدم فقدان أي فيديو قديم
    const savedVaultRaw = localStorage.getItem('horror_vault_permanent_v4');
    const savedVault: Video[] = savedVaultRaw ? JSON.parse(savedVaultRaw) : [];
    
    const uniqueMap = new Map<string, Video>();
    
    // إضافة الفيديوهات القديمة أولاً
    savedVault.forEach(v => uniqueMap.set(v.id, v));
    // إضافة الفيديوهات الجديدة (ستقوم بتحديث القديمة إذا وجد تكرار)
    newFetchedVideos.forEach(v => uniqueMap.set(v.id, v));

    const finalVideos = Array.from(uniqueMap.values())
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    // حفظ الأرشيف المحدث
    localStorage.setItem('horror_vault_permanent_v4', JSON.stringify(finalVideos));
    return finalVideos;
  } catch (error) {
    console.error("Fetch Error:", error);
    const cached = localStorage.getItem('horror_vault_permanent_v4');
    return cached ? JSON.parse(cached) : [];
  }
};

export const uploadVideoWithProgress = (
  file: File, 
  metadata: { title: string, category: string, narration: string, type: 'short' | 'long' },
  onProgress: (p: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('chat_id', CHANNEL_ID);
    formData.append('video', file);
    const caption = `[التصنيف: ${metadata.category}] [العنوان: ${metadata.title}] [السرد: ${metadata.narration}] [النوع: ${metadata.type}]`;
    formData.append('caption', caption);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, true);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(`Telegram Upload Failed: ${xhr.status}`));
    };
    
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};
