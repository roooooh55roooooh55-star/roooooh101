
import { Video } from './types';

const BOT_TOKEN = "8377287398:AAHlw02jpdHRE6OtwjABgCPVrxF4HLRQT9A";
const CHANNEL_ID = "-1003563010631";

const urlCache = new Map<string, {url: string, expiry: number}>();

export const getDirectVideoUrl = async (fileId: string): Promise<string | null> => {
  if (!fileId) return null;
  const cached = urlCache.get(fileId);
  if (cached && cached.expiry > Date.now()) return cached.url;

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const data = await response.json();
    if (data.ok && data.result?.file_path) {
      const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
      urlCache.set(fileId, { url, expiry: Date.now() + 3500000 }); 
      return url;
    }
    return null;
  } catch (error) {
    console.error("خطأ في جلب بوابة الفيديو من الحديقة المرعبة:", error);
    return null;
  }
};

export const fetchChannelVideos = async (): Promise<Video[]> => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1&limit=50&allowed_updates=["channel_post","message"]`);
    const data = await response.json();
    const fetchedVideos: Video[] = [];

    if (data.ok && data.result) {
      data.result.forEach((item: any) => {
        const msg = item.channel_post || item.message;
        if (msg && (msg.video || (msg.document && msg.document.mime_type?.includes('video')))) {
          const videoData = msg.video || msg.document;
          const caption = msg.caption || "";
          const category = caption.match(/\[التصنيف:\s*(.*?)\]/)?.[1]?.trim() || "أهوال مرعبة";
          const title = caption.match(/\[العنوان:\s*(.*?)\]/)?.[1]?.trim() || "كابوس غامض";
          const narration = caption.match(/\[السرد:\s*(.*?)\]/)?.[1]?.trim() || "";
          const typeTag = caption.match(/\[النوع:\s*(.*?)\]/)?.[1]?.trim();
          const fileId = videoData.file_id;
          
          fetchedVideos.push({
            id: fileId,
            public_id: videoData.file_unique_id,
            video_url: "", 
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

    const savedVaultRaw = localStorage.getItem('horror_vault');
    const savedVault: Video[] = savedVaultRaw ? JSON.parse(savedVaultRaw) : [];
    const uniqueMap = new Map<string, Video>();
    savedVault.forEach(v => uniqueMap.set(v.id, v));
    fetchedVideos.forEach(v => uniqueMap.set(v.id, v));

    const finalVideos = Array.from(uniqueMap.values())
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    localStorage.setItem('horror_vault', JSON.stringify(finalVideos));
    return finalVideos;
  } catch (error) {
    console.error("خطأ في الاتصال بمستودع الحديقة المرعبة:", error);
    const cached = localStorage.getItem('horror_vault');
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
      else reject(new Error(`فشل الحقن في الحديقة المرعبة: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('خطأ في الشبكة أثناء الحقن في الحديقة المرعبة'));
    xhr.send(formData);
  });
};
