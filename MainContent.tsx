
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Video, UserInteractions, AppView } from './types.ts';

export const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

const NEON_VARIANTS = [
  { border: 'border-[#ff003c]', glow: 'shadow-[0_0_15px_rgba(255,0,60,0.5)]', text: 'text-[#ff003c]' },
  { border: 'border-[#39ff14]', glow: 'shadow-[0_0_15px_rgba(57,255,20,0.5)]', text: 'text-[#39ff14]' },
  { border: 'border-[#ffea00]', glow: 'shadow-[0_0_15px_rgba(255,234,0,0.5)]', text: 'text-[#ffea00]' },
  { border: 'border-[#bc00ff]', glow: 'shadow-[0_0_15px_rgba(188,0,255,0.5)]', text: 'text-[#bc00ff]' },
  { border: 'border-[#00f3ff]', glow: 'shadow-[0_0_15px_rgba(0,243,255,0.5)]', text: 'text-[#00f3ff]' },
];

const getNeonStyle = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NEON_VARIANTS[Math.abs(hash) % NEON_VARIANTS.length];
};

export const getDeterministicStats = (seed: string) => {
  let hash = 0;
  if (!seed) return { views: 0, likes: 0 };
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const baseViews = Math.abs(hash % 900000) + 1200000; 
  const views = baseViews * (Math.abs(hash % 8) + 3); 
  const likes = Math.abs(Math.floor(views * (0.15 + (Math.abs(hash % 20) / 100)))); 
  return { views, likes };
};

export const formatBigNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

/**
 * شريط الأقسام اللانهائي التفاعلي
 */
const CategoryMarquee: React.FC<{ categories: string[], onCategoryClick: (c: string) => void }> = ({ categories, onCategoryClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // تكرار الأقسام 5 مرات لضمان عدم وجود فراغات أثناء السحب السريع
  const infiniteCategories = useMemo(() => {
    return [...categories, ...categories, ...categories, ...categories, ...categories];
  }, [categories]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const singleWidth = el.scrollWidth / 5;
    // إذا وصل المستخدم لنهاية المجموعات الوسطى، أعده للبداية بصمت
    if (el.scrollLeft >= singleWidth * 3) {
      el.scrollLeft = singleWidth;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft = singleWidth * 2;
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      // ابدأ من المنتصف
      el.scrollLeft = (el.scrollWidth / 5) * 2;
    }
  }, []);

  return (
    <div className="h-14 bg-black/80 backdrop-blur-3xl z-[100] border-b border-white/10 sticky top-16 flex items-center overflow-hidden">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex gap-4 px-4 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing w-full"
        style={{ scrollBehavior: 'auto' }}
      >
        {infiniteCategories.map((cat, idx) => (
          <button 
            key={`${cat}-${idx}`} 
            onClick={() => onCategoryClick(cat)} 
            className="shrink-0 px-6 py-2 rounded-xl text-[10px] font-black text-white italic whitespace-nowrap bg-black/40 border border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] active:scale-95 transition-transform"
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};

const VideoCardThumbnail: React.FC<{ 
  video: Video, 
  isOverlayActive: boolean, 
  interactions: UserInteractions,
  onLike?: (id: string) => void,
  isLarge?: boolean,
  playedIds: string[]
}> = ({ video, isOverlayActive, interactions, onLike, isLarge = false, playedIds }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  if (!video) return null;
  const isHeartActive = interactions?.likedIds?.includes(video.id) || interactions?.savedIds?.includes(video.id);
  const neon = getNeonStyle(video.id);
  const stats = useMemo(() => getDeterministicStats(video.id), [video.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isOverlayActive) { v.pause(); return; }
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { 
        v.play().catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        }); 
      } else { 
        v.pause(); 
      }
    }, { threshold: 0.01 });

    observer.observe(v);
    return () => observer.disconnect();
  }, [video.video_url, isOverlayActive]);

  const isNew = useMemo(() => !playedIds.includes(video.id), [playedIds, video.id]);
  const isTrending = useMemo(() => stats.views > 1000000, [stats.views]);

  return (
    <div className={`w-full h-full relative bg-[#050505] overflow-hidden rounded-[1.5rem] border-2 transition-all duration-500 ${neon.border} ${neon.glow} group shadow-2xl active:scale-95`}>
      <video 
        ref={videoRef} 
        src={video.video_url} 
        muted 
        loop 
        playsInline 
        autoPlay 
        preload="auto"
        className="w-full h-full object-cover contrast-110 saturate-125 pointer-events-none group-hover:scale-110 transition-transform duration-1000" 
      />
      
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-30 items-center">
        <button 
          onClick={(e) => { e.stopPropagation(); onLike?.(video.id); }} 
          className={`p-2 rounded-xl backdrop-blur-xl border-2 transition-all duration-500 ${isHeartActive ? 'bg-[#ff003c] border-white shadow-[0_0_15px_#ff003c]' : 'bg-black/40 border-white/20'}`}
        >
          <svg className="w-5 h-5 text-white" fill={isHeartActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>

      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 items-end">
        {isTrending && (
          <div className="bg-[#ff003c] text-white text-[8px] font-black px-3 py-1 rounded-lg italic uppercase shadow-[0_0_10px_#ff003c] border border-white/20 flex items-center gap-1">
            <span className="w-1 h-1 bg-white rounded-full animate-ping"></span>
            رائج
          </div>
        )}
        {isNew && (
          <div className="bg-[#ffea00] text-black text-[8px] font-black px-3 py-1 rounded-lg italic uppercase shadow-[0_0_10px_#ffea00] border border-black/20">جديد</div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-10 z-20">
        <p className="text-white text-[11px] font-black line-clamp-1 italic text-right mb-2 drop-shadow-md">{video.title}</p>
        <div className="flex justify-between items-center text-[9px] font-bold text-white/60">
           <span>{formatBigNumber(stats.likes)} Likes</span>
           <div className="w-1 h-1 bg-white/20 rounded-full"></div>
           <span>{formatBigNumber(stats.views)} Views</span>
        </div>
      </div>
    </div>
  );
};

export const InteractiveMarquee: React.FC<{ 
  videos: Video[], 
  onPlay: (v: Video) => void,
  reverse?: boolean,
  isShorts?: boolean,
  playedIds: string[]
}> = ({ videos, onPlay, reverse = false, isShorts = false, playedIds }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const DEFAULT_SPEED = 0.5;
  const speed = reverse ? -DEFAULT_SPEED : DEFAULT_SPEED;
  const requestRef = useRef<number>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // تكرار الفيديوهات 4 مرات لضمان عدم وجود فراغات أثناء السحب
  const displayVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return [...videos, ...videos, ...videos, ...videos];
  }, [videos]);

  const animate = useCallback(() => {
    if (containerRef.current && !isInteracting) {
      containerRef.current.scrollLeft += speed;
      const { scrollLeft, scrollWidth } = containerRef.current;
      const quarterWidth = scrollWidth / 4;
      
      if (scrollLeft >= (quarterWidth * 3)) {
        containerRef.current.scrollLeft = quarterWidth;
      } else if (scrollLeft <= 0) {
        containerRef.current.scrollLeft = quarterWidth * 2;
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [speed, isInteracting]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  return (
    <div className={`relative overflow-hidden w-full ${isShorts ? 'h-64' : 'h-40'} bg-black`} dir="ltr">
      <div 
        ref={containerRef}
        onMouseDown={() => setIsInteracting(true)}
        onMouseUp={() => setIsInteracting(false)}
        onTouchStart={() => setIsInteracting(true)}
        onTouchEnd={() => setIsInteracting(false)}
        onScroll={() => {
          // التعامل مع القفزة اللانهائية يدوياً عند السحب
          const el = containerRef.current;
          if (!el) return;
          const quarterWidth = el.scrollWidth / 4;
          if (el.scrollLeft >= (quarterWidth * 3)) el.scrollLeft = quarterWidth;
          else if (el.scrollLeft <= 0) el.scrollLeft = quarterWidth * 2;
        }}
        className="flex gap-3 px-3 h-full items-center overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing"
      >
        {displayVideos.map((item, idx) => {
          const neon = getNeonStyle(item.id);
          return (
            <div key={`${item.id}-${idx}`} onClick={() => onPlay(item)} className={`${isShorts ? 'w-36 h-56' : 'w-60 h-32'} shrink-0 rounded-[1.5rem] overflow-hidden border-2 relative active:scale-95 transition-all ${neon.border} ${neon.glow}`} dir="rtl">
              <video 
                src={item.video_url} 
                muted 
                loop 
                playsInline 
                autoPlay 
                preload="auto"
                className="w-full h-full object-cover pointer-events-none opacity-80" 
              />
              <div className="absolute top-2 right-2 z-10">
                  <span className="bg-[#ff003c] text-[7px] text-white px-2 py-0.5 rounded-md font-black italic shadow-lg">رائج</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3">
                <p className="text-[9px] font-black text-white truncate italic text-right drop-shadow-md">{item.title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string, color: string }> = ({ title, color }) => (
  <div className="flex items-center gap-2 px-6 mb-3">
    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}></div>
    <h2 className="text-[14px] font-black text-white italic tracking-wide">{title}</h2>
  </div>
);

const MainContent: React.FC<any> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onCategoryClick, onHardRefresh, onOfflineClick, isOverlayActive, onLike, pullOffset, isSyncing, playedIds
}) => {
  const shortsOnly = useMemo(() => videos.filter((v: Video) => v.type === 'short'), [videos]);
  const longsOnly = useMemo(() => videos.filter((v: Video) => v.type === 'long'), [videos]);

  return (
    <div className="flex flex-col pb-32 w-full bg-black min-h-screen" dir="rtl">
      {/* هيدر الحديقة */}
      <header className="flex items-center justify-between py-3 bg-black/95 backdrop-blur-3xl sticky top-0 z-[110] px-6 border-b border-white/5 h-16">
        <div className="flex items-center gap-4" onClick={onHardRefresh}>
          <img src={LOGO_URL} className={`w-10 h-10 rounded-full border-2 ${isSyncing ? 'border-[#ffea00] shadow-[0_0_15px_#ffea00]' : 'border-red-600 shadow-[0_0_15px_#ff0000]'} relative z-10`} />
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-black italic transition-colors ${isSyncing ? 'text-[#ffea00]' : 'text-red-600'} drop-shadow-[0_0_10px_red]`}>الحديقة المرعبة</h1>
            {pullOffset > 40 && (
              <span className="bg-black/50 border border-[#ffea00] text-[#ffea00] px-2 py-0.5 rounded-lg text-[9px] font-black animate-pulse">تحديث</span>
            )}
          </div>
        </div>
        <button onClick={onOfflineClick} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-[#ffea00] active:scale-90 transition-transform">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
        </button>
      </header>

      {/* شريط الأقسام التفاعلي اللانهائي الجديد */}
      <CategoryMarquee categories={categoriesList} onCategoryClick={onCategoryClick} />

      <div className="pt-6 space-y-8">
        <section>
          <SectionHeader title="ومضات مرعبة سريعة" color="#ff003c" />
          <InteractiveMarquee videos={shortsOnly.slice(0, 15)} onPlay={(v) => onPlayShort(v, shortsOnly)} isShorts={true} playedIds={playedIds} />
        </section>

        <section>
          <SectionHeader title="عرض الأساطير الطويلة" color="#39ff14" />
          <InteractiveMarquee videos={longsOnly} onPlay={(v) => onPlayLong(v, longsOnly)} reverse={true} playedIds={playedIds} />
        </section>

        <section className="px-3">
          <SectionHeader title="المختار من القبو (شورتي)" color="#ffea00" />
          <div className="grid grid-cols-2 gap-3">
            {shortsOnly.slice(15, 19).map(v => (
              <div key={v.id} onClick={() => onPlayShort(v, shortsOnly)} className="aspect-[9/16]">
                <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} playedIds={playedIds} />
              </div>
            ))}
          </div>
        </section>

        <section className="px-3">
          <SectionHeader title="أهوال حصرية مختارة" color="#bc00ff" />
          <div className="space-y-4">
            {longsOnly.slice(0, 2).map(v => (
              <div key={v.id} onClick={() => onPlayLong(v, longsOnly)} className="aspect-video w-full">
                 <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} isLarge={true} playedIds={playedIds} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MainContent;
