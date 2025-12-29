
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Video } from './types.ts';
import { formatBigNumber, getDeterministicStats } from './MainContent.tsx';
import { getDirectVideoUrl } from './telegramClient.ts';
import { generateSpeech } from './elevenLabsService';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [directUrl, setDirectUrl] = useState<string>("");
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  
  const stats = useMemo(() => getDeterministicStats(video.id), [video.id]);
  const suggestions = useMemo(() => allLongVideos.filter(v => v.id !== video.id), [allLongVideos, video.id]);

  const getElevenConfig = () => {
    const keys = JSON.parse(localStorage.getItem('admin_eleven_keys_v2') || '[]');
    // استخدام معرف صوت 'Adam' الافتراضي كونه أكثر استقراراً
    const voiceId = localStorage.getItem('admin_voice_id') || 'pNInz6obpgDQGcFmaJgB';
    return { key: keys, voiceId };
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  };

  const playNarration = async (text: string) => {
    stopAudio();
    if (isMuted || !text) return;
    const { key, voiceId } = getElevenConfig();
    if (!key || key.length === 0) return;
    try {
      const audioUrl = await generateSpeech(text, key, voiceId);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play().catch(e => console.error("TTS audio play error", e));
      }
    } catch (e) { console.error("Narration generation failed", e); }
  };

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
    v.play().then(() => {
      setIsPlaying(true);
      if (video.narration) playNarration(video.narration);
    }).catch(() => { 
      v.muted = true; 
      v.play().catch(() => {}); 
    });
    return () => stopAudio();
  }, [directUrl, video.id, isMuted]);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        stopAudio();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col overflow-hidden animate-in fade-in duration-500" dir="rtl">
      <div className="h-[45dvh] relative bg-black flex items-center justify-center border-b border-white/5">
        {loadingVideo ? (
          <div className="flex flex-col items-center gap-6 text-red-600 animate-pulse">
            <div className="w-12 h-12 border-4 border-t-transparent border-red-600 rounded-full animate-spin"></div>
            <span className="text-[10px] font-black italic tracking-widest uppercase">حقن كابوس الحديقة المرعبة...</span>
          </div>
        ) : (
          <video 
            ref={videoRef} src={directUrl} 
            className="h-full w-full object-contain z-10" 
            playsInline autoPlay
            onClick={handleTogglePlay}
          />
        )}
        <div className="absolute top-5 left-5 z-50">
          <button onClick={onClose} className="p-4 bg-black/60 rounded-2xl border-2 border-red-500 text-red-500 shadow-[0_0_20px_#ef4444] backdrop-blur-md active:scale-75 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#030303] p-7 space-y-10 scrollbar-hide">
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <button onClick={() => onCategoryClick(video.category)} className="bg-red-600/10 border-2 border-red-600 text-red-600 px-6 py-2 rounded-full text-[11px] font-black italic">{video.category}</button>
              <span className="text-[11px] font-black text-[#00f3ff] uppercase drop-shadow-[0_0_8px_#00f3ff]">{formatBigNumber(stats.views)} VIEWS</span>
           </div>
           <h1 className="text-2xl font-black text-white italic leading-tight">{video.title}</h1>
        </div>

        <div className="flex items-center justify-between gap-4 bg-white/5 p-5 rounded-[3rem] border border-white/10 shadow-2xl">
           <button onClick={onLike} className={`flex flex-col items-center gap-2 transition-all ${isLiked ? 'text-red-500 scale-110' : 'text-gray-500'}`}>
             <div className={`p-5 rounded-3xl border-2 ${isLiked ? 'bg-red-500/20 border-red-500 shadow-[0_0_25px_#ef4444]' : 'border-white/10 bg-black/40'}`}>
               <svg className="w-8 h-8" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">Like</span>
           </button>

           <button onClick={onSave} className={`flex flex-col items-center gap-2 transition-all ${isSaved ? 'text-[#ffea00] scale-110' : 'text-gray-500'}`}>
             <div className={`p-5 rounded-3xl border-2 ${isSaved ? 'bg-[#ffea00]/20 border-[#ffea00] shadow-[0_0_25px_#ffea00]' : 'border-white/10 bg-black/40'}`}>
               <svg className="w-8 h-8" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">Save</span>
           </button>

           <button onClick={() => setIsMuted(!isMuted)} className={`flex flex-col items-center gap-2 transition-all ${!isMuted ? 'text-[#00f3ff] scale-110' : 'text-gray-500'}`}>
             <div className={`p-5 rounded-3xl border-2 ${!isMuted ? 'bg-[#00f3ff]/20 border-[#00f3ff] shadow-[0_0_25px_#00f3ff]' : 'border-white/10 bg-black/40'}`}>
               {!isMuted ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3z"/></svg>}
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">Audio</span>
           </button>
        </div>

        <div className="space-y-6 pb-40">
           <h3 className="text-sm font-black text-red-600 uppercase italic tracking-widest px-3">التالي في القبو</h3>
           <div className="space-y-5">
             {suggestions.slice(0, 8).map((s) => (
               <div key={s.id} onClick={() => onSwitchVideo(s)} className="flex gap-5 p-5 bg-white/5 rounded-[2.5rem] border border-white/5 group hover:border-[#00f3ff]/40 transition-all shadow-xl active:scale-95">
                 <div className="w-36 h-24 bg-black rounded-2xl overflow-hidden shrink-0 relative border border-white/10 shadow-lg">
                    <video src={s.video_url} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                 </div>
                 <div className="flex flex-col justify-center flex-1 text-right">
                   <h4 className="text-[15px] font-black text-white line-clamp-2 italic leading-tight group-hover:text-[#ffea00]">{s.title}</h4>
                   <span className="text-[10px] text-cyan-500 font-black mt-3 uppercase tracking-[0.2em]">{s.category}</span>
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
