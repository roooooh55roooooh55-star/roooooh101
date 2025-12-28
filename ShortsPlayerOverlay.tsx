
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Video, UserInteractions } from './types';
import { LOGO_URL } from './MainContent';
import { getDirectVideoUrl } from './telegramClient';

interface ShortsPlayerOverlayProps {
  initialVideo: Video;
  videoList: Video[];
  interactions: UserInteractions;
  onClose: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onCategoryClick: (cat: string) => void;
  onSave: (id: string) => void;
  onProgress: (id: string, progress: number) => void;
  onDownload: (video: Video) => void;
}

const ShortsPlayerOverlay: React.FC<ShortsPlayerOverlayProps> = ({ 
  initialVideo, videoList, interactions, onClose, onLike, onDislike, onCategoryClick, onSave, onProgress, onDownload
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrls, setVideoUrls] = useState<{ [key: string]: string }>({});

  const currentVideo = videoList[currentIndex];
  
  const activeSentence = useMemo(() => {
    if (!currentVideo?.narration) return "";
    const sentences = currentVideo.narration.split(/[.،?!|]/).map(s => s.trim()).filter(s => s.length > 0);
    const index = Math.floor(currentProgress * sentences.length);
    return sentences[Math.min(index, sentences.length - 1)];
  }, [currentVideo?.narration, currentProgress]);

  // حل مشكلة الشاشة السوداء: جلب الرابط المباشر فقط للفيديو الحالي والمجاورين
  const resolveUrl = async (index: number) => {
    const video = videoList[index];
    if (!video || videoUrls[video.id]) return;
    
    const url = await getDirectVideoUrl(video.telegram_file_id || video.id);
    if (url) {
      setVideoUrls(prev => ({ ...prev, [video.id]: url }));
    }
  };

  useEffect(() => {
    // جلب الرابط للفيديو الحالي والتالي للتجهيز
    resolveUrl(currentIndex);
    if (currentIndex + 1 < videoList.length) resolveUrl(currentIndex + 1);
  }, [currentIndex, videoList]);

  useEffect(() => {
    Object.values(videoRefs.current).forEach(v => (v as HTMLVideoElement | null)?.pause());
    const v = videoRefs.current[`main-${currentIndex}`];
    const url = videoUrls[currentVideo?.id];
    
    if (v && url) {
      v.src = url;
      v.muted = isMuted;
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    }
    setCurrentProgress(0);
  }, [currentIndex, isMuted, videoUrls]);

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col overflow-hidden">
      <div 
        ref={containerRef} 
        onScroll={(e) => {
          const idx = Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight);
          if (idx !== currentIndex) setCurrentIndex(idx);
        }}
        className="flex-grow overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full w-full"
      >
        {videoList.map((video, idx) => (
          <div key={`${video.id}-${idx}`} className="h-full w-full snap-start relative bg-black flex overflow-hidden">
            {!videoUrls[video.id] ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-600 animate-pulse gap-4">
                <div className="w-10 h-10 border-4 border-t-transparent border-red-600 rounded-full animate-spin"></div>
                <span className="text-[9px] font-black italic">جلب الكابوس من التليجرام...</span>
              </div>
            ) : (
              <video 
                ref={el => videoRefs.current[`main-${idx}`] = el}
                src={videoUrls[video.id]} 
                muted={isMuted}
                className="h-full w-full object-cover contrast-110 saturate-125"
                playsInline loop
                onTimeUpdate={(e) => {
                  if (idx === currentIndex) {
                    const p = e.currentTarget.currentTime / e.currentTarget.duration;
                    setCurrentProgress(p);
                    onProgress(video.id, p);
                  }
                }}
              />
            )}
            
            {/* Control Sidebar */}
            <div className="absolute bottom-28 left-4 flex flex-col items-center gap-4 z-[600]">
              <button onClick={onClose} className="p-3.5 rounded-2xl bg-black/50 border-2 border-red-600 text-red-600 shadow-[0_0_15px_red] backdrop-blur-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-3.5 rounded-2xl bg-black/50 border-2 border-white/20 text-white backdrop-blur-md">
                {isMuted ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
              </button>
              <button onClick={() => onLike(video.id)} className={`p-3.5 rounded-full border-2 ${interactions.likedIds.includes(video.id) ? 'bg-red-600 border-red-400 text-white' : 'bg-black/40 border-white/20 text-white'}`}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              </button>
              <button onClick={() => onDownload(video)} className={`p-3.5 rounded-2xl border-2 ${interactions.downloadedIds.includes(video.id) ? 'bg-cyan-600' : 'bg-black/40 border-white/20'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
              </button>
              <button onClick={() => onSave(video.id)} className={`p-3.5 rounded-full border-2 ${interactions.savedIds.includes(video.id) ? 'bg-yellow-500' : 'bg-black/40 border-white/20'}`}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              </button>
            </div>

            {/* Info Bottom Right */}
            <div className="absolute bottom-16 right-4 left-24 text-right flex flex-col items-end z-40">
              {activeSentence && idx === currentIndex && (
                <div className="mb-4 max-w-[90%] bg-black/60 backdrop-blur-xl p-3 px-4 rounded-2xl border border-red-600/30 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-white text-xs font-black italic">{activeSentence}</p>
                </div>
              )}
              <button onClick={() => onCategoryClick(video.category)} className="bg-red-600/80 px-4 py-1 rounded-full text-[10px] font-black text-white italic mb-3">{video.category}</button>
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="flex flex-col items-end">
                  <h3 className="text-white text-lg font-black italic">@الحديقة المرعبة</h3>
                  <p className="text-white/90 text-[11px] font-bold italic">{video.title}</p>
                </div>
                <img src={LOGO_URL} className="w-12 h-12 rounded-full border-2 border-red-600 shadow-[0_0_15px_red]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShortsPlayerOverlay;
