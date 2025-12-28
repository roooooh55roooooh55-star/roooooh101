
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Video, UserInteractions, AppView } from './types.ts';

export const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

const NEON_VARIANTS = [
  { border: 'border-[#ff003c]', glow: 'shadow-[0_0_15px_#ff003c]', text: 'text-[#ff003c]' },
  { border: 'border-[#00f3ff]', glow: 'shadow-[0_0_15px_#00f3ff]', text: 'text-[#00f3ff]' },
  { border: 'border-[#ffea00]', glow: 'shadow-[0_0_15px_#ffea00]', text: 'text-[#ffea00]' },
  { border: 'border-[#bc00ff]', glow: 'shadow-[0_0_15px_#bc00ff]', text: 'text-[#bc00ff]' },
  { border: 'border-[#39ff14]', glow: 'shadow-[0_0_15px_#39ff14]', text: 'text-[#39ff14]' },
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
  const baseViews = Math.abs(hash % 900000) + 500000; 
  const views = baseViews * (Math.abs(hash % 5) + 2); 
  const likes = Math.abs(Math.floor(views * (0.12 + (Math.abs(hash % 15) / 100)))); 
  return { views, likes };
};

export const formatBigNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const VideoCardThumbnail: React.FC<{ 
  video: Video, 
  isOverlayActive: boolean, 
  interactions: UserInteractions,
  onLike?: (id: string) => void
}> = ({ video, isOverlayActive, interactions, onLike }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  if (!video) return null;
  const isHeartActive = interactions?.likedIds?.includes(video.id) || interactions?.savedIds?.includes(video.id);
  const neon = getNeonStyle(video.id);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isOverlayActive) { v.pause(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { v.play().catch(() => {}); } else { v.pause(); }
    }, { threshold: 0.1 });
    observer.observe(v);
    return () => observer.disconnect();
  }, [video.video_url, isOverlayActive]);

  return (
    <div className={`w-full h-full relative bg-[#050505] overflow-hidden rounded-[2rem] border-2 transition-all duration-500 ${neon.border} ${neon.glow}`}>
      <video ref={videoRef} src={video.video_url} muted loop playsInline className="w-full h-full object-cover contrast-125 saturate-150 pointer-events-none" />
      <div className="absolute top-4 right-4 z-30">
        <button onClick={(e) => { e.stopPropagation(); onLike?.(video.id); }} className={`p-2 rounded-2xl backdrop-blur-xl border-2 transition-all ${isHeartActive ? 'bg-[#ff003c]/40 border-[#ff003c] shadow-[0_0_15px_#ff003c]' : 'bg-black/60 border-white/20'}`}>
          <svg className={`w-5 h-5 ${isHeartActive ? 'text-white' : 'text-white/40'}`} fill={isHeartActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-5 z-20">
        <p className="text-white text-[12px] font-black line-clamp-1 italic text-right leading-tight drop-shadow-[0_2px_10px_black]">{video.title}</p>
      </div>
    </div>
  );
};

export const InteractiveMarquee: React.FC<{ 
  videos: Video[], 
  onPlay: (v: Video) => void,
  initialReverse?: boolean,
  isShorts?: boolean,
}> = ({ videos, onPlay, initialReverse = false, isShorts = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const DEFAULT_SPEED = 1.2;
  const [speed, setSpeed] = useState(initialReverse ? -DEFAULT_SPEED : DEFAULT_SPEED);
  const requestRef = useRef<number>(null);

  const displayVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return videos.length < 5 ? [...videos, ...videos, ...videos, ...videos] : [...videos, ...videos, ...videos];
  }, [videos]);

  const animate = useCallback(() => {
    if (containerRef.current && !isDragging) {
      containerRef.current.scrollLeft += speed;
      const { scrollLeft, scrollWidth } = containerRef.current;
      const thirdWidth = scrollWidth / 3;
      if (scrollLeft >= (thirdWidth * 2)) containerRef.current.scrollLeft -= thirdWidth;
      else if (scrollLeft <= 1) containerRef.current.scrollLeft += thirdWidth;
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isDragging, speed]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  return (
    <div className={`relative overflow-hidden w-full ${isShorts ? 'h-72' : 'h-44'} bg-black`} dir="ltr">
      <div 
        ref={containerRef}
        onMouseDown={(e) => { setIsDragging(true); setStartX(e.pageX - (containerRef.current?.offsetLeft || 0)); setScrollLeftState(containerRef.current?.scrollLeft || 0); }}
        onMouseMove={(e) => { if (!isDragging || !containerRef.current) return; const x = e.pageX - (containerRef.current.offsetLeft || 0); containerRef.current.scrollLeft = scrollLeftState - (x - startX) * 1.5; }}
        onMouseUp={() => setIsDragging(false)}
        onMouseEnter={() => setSpeed(0)}
        onMouseLeave={() => setSpeed(initialReverse ? -DEFAULT_SPEED : DEFAULT_SPEED)}
        className="flex gap-6 px-8 h-full items-center overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
      >
        {displayVideos.map((item, idx) => {
          const neon = getNeonStyle(item.id);
          return (
            <div key={`${item.id}-${idx}`} onClick={() => !isDragging && onPlay(item)} className={`${isShorts ? 'w-40 h-64' : 'w-64 h-36'} shrink-0 rounded-[2.5rem] overflow-hidden border-2 relative active:scale-95 transition-all ${neon.border} ${neon.glow}`} dir="rtl">
              <video src={item.video_url} muted loop playsInline autoPlay className="w-full h-full object-cover pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-4">
                <p className="text-[11px] font-black text-white truncate italic text-right leading-none drop-shadow-md">{item.title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MainContent: React.FC<any> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onCategoryClick, onHardRefresh, onOfflineClick, isOverlayActive, onLike
}) => {
  const shortsOnly = useMemo(() => videos.filter((v: any) => v.type === 'short'), [videos]);
  const longsOnly = useMemo(() => videos.filter((v: any) => v.type === 'long'), [videos]);

  return (
    <div className="flex flex-col pb-20 w-full bg-[#020202] min-h-screen" dir="rtl">
      <header className="flex items-center justify-between py-4 bg-black/80 backdrop-blur-3xl sticky top-0 z-[110] px-6 border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-3" onClick={onHardRefresh}>
          <div className="relative">
            <div className="absolute inset-0 bg-red-600 rounded-full blur-lg opacity-40 animate-pulse"></div>
            <img src={LOGO_URL} className="w-10 h-10 rounded-full border-2 border-[#ff003c] relative z-10 shadow-[0_0_15px_#ff003c]" />
          </div>
          <h1 className="text-lg font-black italic text-white tracking-tight tech-font">HORROR ENGINE</h1>
        </div>
        <button onClick={onOfflineClick} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#00f3ff] shadow-[0_0_10px_#00f3ff] active:scale-90 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
        </button>
      </header>

      <nav className="h-16 bg-black/90 z-[100] border-b border-white/5 sticky top-[68px] overflow-x-auto scrollbar-hide flex items-center px-6 gap-4">
        {categoriesList?.map((cat: string) => (
          <button 
            key={cat} 
            onClick={() => onCategoryClick(cat)} 
            className="shrink-0 px-6 py-2 rounded-2xl text-[10px] font-black text-white italic whitespace-nowrap border-2 border-white/10 bg-white/5 hover:border-white shadow-[0_0_10px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="p-6 space-y-16">
        <SectionHeader title="FLASH PROTOCOL" color="#ff003c" />
        <InteractiveMarquee videos={shortsOnly} onPlay={(v) => onPlayShort(v, shortsOnly)} isShorts={true} />

        <SectionHeader title="LEGENDS VAULT" color="#00f3ff" />
        <InteractiveMarquee videos={longsOnly} onPlay={(v) => onPlayLong(v, longsOnly)} initialReverse={true} />

        <SectionHeader title="STREAK ARCHIVE" color="#ffea00" />
        <div className="grid grid-cols-2 gap-4">
          {shortsOnly.slice(0, 4).map((v: any) => (
            <div key={v.id} onClick={() => onPlayShort(v, shortsOnly)} className="aspect-[3/4]">
              <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} />
            </div>
          ))}
        </div>

        <SectionHeader title="DEEP NARRATIVES" color="#bc00ff" />
        <div className="flex flex-col gap-6">
          {longsOnly.slice(0, 4).map((v: any) => (
            <div key={v.id} onClick={() => onPlayLong(v, longsOnly)} className="aspect-video w-full">
              <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string, color: string }> = ({ title, color }) => (
  <div className="flex items-center gap-4">
    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}></div>
    <h2 className="text-[12px] font-black text-white italic tracking-[0.3em] tech-font uppercase">{title}</h2>
  </div>
);

export default MainContent;
