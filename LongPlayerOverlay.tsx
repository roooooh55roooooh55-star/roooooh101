
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Video } from './types.ts';
import { formatBigNumber, getDeterministicStats } from './MainContent.tsx';
import { getDirectVideoUrl } from './telegramClient.ts';

interface LongPlayerOverlayProps {
  video: Video;
  allLongVideos: Video[];
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onSwitchVideo: (v: Video) => void;
  onCategoryClick: (cat: string) => void;
  isLiked: boolean;
  isDisliked: boolean;
  isSaved: boolean;
  onProgress: (p: number) => void;
}

const LongPlayerOverlay: React.FC<LongPlayerOverlayProps> = ({ 
  video, allLongVideos, onClose, onLike, onDislike, onSave, onSwitchVideo, onCategoryClick, isLiked, isDisliked, isSaved, onProgress 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [directUrl, setDirectUrl] = useState<string>("");
  const [loadingVideo, setLoadingVideo] = useState(true);
  
  const stats = useMemo(() => getDeterministicStats(video.id), [video.id]);
  const suggestions = useMemo(() => allLongVideos.filter(v => v.id !== video.id), [allLongVideos, video.id]);

  useEffect(() => {
    let isMounted = true;
    setLoadingVideo(true);
    getDirectVideoUrl(video.telegram_file_id || video.id).then(url => {
      if (isMounted && url) {
        setDirectUrl(url);
        setLoadingVideo(false);
      }
    });
    return () => { isMounted = false; };
  }, [video.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !directUrl) return;
    v.load();
    v.play().then(() => setIsPlaying(true)).catch(() => { v.muted = true; v.play().catch(() => {}); });
    
    const onEnded = () => {
      if (isAutoPlay && suggestions.length > 0) {
        onSwitchVideo(suggestions[0]);
      } else {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    };
    v.addEventListener('ended', onEnded);
    return () => v.removeEventListener('ended', onEnded);
  }, [directUrl, isAutoPlay, suggestions, onSwitchVideo]);

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col overflow-hidden animate-in fade-in duration-500" dir="rtl">
      {/* منطقة الفيديو - واضحة تماماً بدون أي ضباب */}
      <div className="h-[40dvh] relative bg-black flex items-center justify-center border-b border-white/5 shadow-[0_0_50px_rgba(255,0,0,0.1)]">
        {loadingVideo ? (
          <div className="flex flex-col items-center gap-4 text-red-600 animate-pulse">
            <div className="w-12 h-12 border-4 border-t-transparent border-red-600 rounded-full animate-spin"></div>
            <span className="text-[10px] font-black italic">جاري الحقن المباشر...</span>
          </div>
        ) : (
          <video 
            ref={videoRef} src={directUrl} 
            className="h-full w-full object-contain z-10" 
            playsInline autoPlay
            onClick={handleTogglePlay}
          />
        )}
        
        {/* أزرار التحكم العلوية النيون */}
        <div className="absolute top-5 left-5 right-5 flex justify-between z-50">
          <button onClick={onClose} className="p-3 bg-black/60 rounded-2xl border-2 border-red-500 text-red-500 shadow-[0_0_20px_#ef4444] backdrop-blur-md active:scale-75 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <button 
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`py-2 px-5 rounded-xl text-[10px] font-black border-2 transition-all duration-500 uppercase tracking-tighter ${
              isAutoPlay 
              ? 'bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_25px_#22c55e] animate-pulse' 
              : 'bg-white/5 border-white/20 text-gray-400'
            }`}
          >
            {isAutoPlay ? 'Auto ON' : 'Auto OFF'}
          </button>
        </div>
      </div>

      {/* منطقة التفاعل - ألوان نيون مبهجة جداً */}
      <div className="flex-1 overflow-y-auto bg-[#030303] p-6 space-y-8 scrollbar-hide">
        
        <div className="flex flex-col gap-3">
           <div className="flex items-center justify-between">
              <button onClick={() => onCategoryClick(video.category)} className="bg-red-600/10 border-2 border-red-600 text-red-600 px-5 py-1.5 rounded-full text-[10px] font-black italic shadow-[0_0_15px_rgba(239,68,68,0.4)]">{video.category}</button>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{formatBigNumber(stats.views)} VIEWS</span>
           </div>
           <h1 className="text-2xl font-black text-white italic drop-shadow-[0_2px_15px_black] leading-tight">{video.title}</h1>
        </div>

        {/* أزرار التفاعل النيون - منطق الإخفاء المتبادل */}
        <div className="flex items-center justify-between gap-4 bg-white/5 p-4 rounded-[2.5rem] border border-white/10 shadow-inner">
           
           {!isDisliked && (
             <button onClick={onLike} className={`flex flex-col items-center gap-1 transition-all duration-500 active:scale-125 ${isLiked ? 'text-pink-500 drop-shadow-[0_0_15px_#ec4899]' : 'text-gray-500'}`}>
               <div className={`p-4 rounded-[1.5rem] border-2 ${isLiked ? 'bg-pink-500/20 border-pink-500 shadow-[0_0_20px_#ec4899]' : 'border-transparent bg-white/5'}`}>
                 <svg className="w-7 h-7" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
               </div>
               <span className="text-[9px] font-black uppercase mt-1">Like</span>
             </button>
           )}

           {!isLiked && (
             <button onClick={onDislike} className={`flex flex-col items-center gap-1 transition-all duration-500 active:scale-125 ${isDisliked ? 'text-cyan-400 drop-shadow-[0_0_15px_#22d3ee]' : 'text-gray-500'}`}>
               <div className={`p-4 rounded-[1.5rem] border-2 ${isDisliked ? 'bg-cyan-400/20 border-cyan-400 shadow-[0_0_20px_#22d3ee]' : 'border-transparent bg-white/5'}`}>
                 <svg className="w-7 h-7 rotate-180" fill={isDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
               </div>
               <span className="text-[9px] font-black uppercase mt-1">Ignore</span>
             </button>
           )}

           <button onClick={handleStop} className="flex flex-col items-center gap-1 text-orange-500 drop-shadow-[0_0_15px_#f97316] active:scale-125 transition-all">
             <div className="p-4 rounded-[1.5rem] border-2 border-orange-500 bg-orange-500/20 shadow-[0_0_20px_#f97316]">
               <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
             </div>
             <span className="text-[9px] font-black uppercase mt-1">Stop</span>
           </button>

           <button onClick={onSave} className={`flex flex-col items-center gap-1 transition-all duration-500 active:scale-125 ${isSaved ? 'text-yellow-400 drop-shadow-[0_0_15px_#facc15]' : 'text-gray-500'}`}>
             <div className={`p-4 rounded-[1.5rem] border-2 ${isSaved ? 'bg-yellow-400/20 border-yellow-400 shadow-[0_0_20px_#facc15]' : 'border-transparent bg-white/5'}`}>
               <svg className="w-7 h-7" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
             </div>
             <span className="text-[9px] font-black uppercase mt-1">Save</span>
           </button>

           <button onClick={() => videoRef.current?.requestFullscreen()} className="flex flex-col items-center gap-1 text-purple-500 drop-shadow-[0_0_15px_#a855f7] active:scale-125 transition-all">
             <div className="p-4 rounded-[1.5rem] border-2 border-purple-500 bg-purple-500/20 shadow-[0_0_20px_#a855f7]">
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5" /></svg>
             </div>
             <span className="text-[9px] font-black uppercase mt-1">Full</span>
           </button>
        </div>

        {/* اقتراحات كوابيس إضافية */}
        <div className="space-y-5 pb-32">
           <h3 className="text-xs font-black text-red-600 uppercase italic px-2 tracking-[0.3em] flex items-center gap-3">
             <span className="w-2 h-2 bg-red-600 rounded-full animate-ping shadow-[0_0_10px_red]"></span> 
             Next Horrors
           </h3>
           <div className="flex flex-col gap-5">
             {suggestions.slice(0, 8).map((s) => (
               <div key={s.id} onClick={() => onSwitchVideo(s)} className="flex gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/5 group hover:border-red-600/40 transition-all shadow-xl">
                 <div className="w-32 h-20 bg-black rounded-2xl overflow-hidden shrink-0 relative border border-white/10">
                    <video src={s.video_url} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                 </div>
                 <div className="flex flex-col justify-center flex-1 text-right">
                   <h4 className="text-[14px] font-black text-white line-clamp-2 italic leading-tight group-hover:text-red-500">{s.title}</h4>
                   <span className="text-[10px] text-cyan-500 font-black mt-2 uppercase tracking-widest">{s.category}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default LongPlayerOverlay;
