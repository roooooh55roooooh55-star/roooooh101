
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Video, UserInteractions, AppView } from './types.ts';

export const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

const NEON_VARIANTS = [
  { border: 'border-[#ff003c]', glow: 'shadow-[0_0_15px_rgba(255,0,60,0.5)]', text: 'text-[#ff003c]' },
  { border: 'border-[#00f3ff]', glow: 'shadow-[0_0_15px_rgba(0,243,255,0.5)]', text: 'text-[#00f3ff]' },
  { border: 'border-[#ffea00]', glow: 'shadow-[0_0_15px_rgba(255,234,0,0.5)]', text: 'text-[#ffea00]' },
  { border: 'border-[#bc00ff]', glow: 'shadow-[0_0_15px_rgba(188,0,255,0.5)]', text: 'text-[#bc00ff]' },
  { border: 'border-[#39ff14]', glow: 'shadow-[0_0_15px_rgba(57,255,20,0.5)]', text: 'text-[#39ff14]' },
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
      } else { v.pause(); }
    }, { threshold: 0.1 });
    observer.observe(v);
    return () => observer.disconnect();
  }, [video.video_url, isOverlayActive]);

  const isNew = useMemo(() => !playedIds.includes(video.id), [playedIds, video.id]);
  const isTrending = useMemo(() => stats.views > 3500000, [stats.views]);

  return (
    <div className={`w-full h-full relative bg-[#050505] overflow-hidden rounded-[2rem] border-2 transition-all duration-500 ${neon.border} ${neon.glow} group shadow-2xl active:scale-95`}>
      <video ref={videoRef} src={video.video_url} muted loop playsInline className="w-full h-full object-cover contrast-125 saturate-150 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
      
      {/* أعلى اليسار: القلب والتصنيف */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-30 items-center">
        <button 
          onClick={(e) => { e.stopPropagation(); onLike?.(video.id); }} 
          className={`p-2.5 rounded-2xl backdrop-blur-xl border-2 transition-all duration-500 ${isHeartActive ? 'bg-[#ff003c] border-white shadow-[0_0_20px_#ff003c] scale-110' : 'bg-black/40 border-white/20'}`}
        >
          <svg className="w-6 h-6 text-white" fill={isHeartActive ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
        <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 shadow-lg">
           <span className="text-[9px] font-black text-[#00f3ff] italic uppercase tracking-tighter whitespace-nowrap">{video.category}</span>
        </div>
      </div>

      {/* أعلى اليمين: العلامات */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 items-end">
        {isTrending && (
          <div className="bg-[#ff003c] text-white text-[9px] font-black px-4 py-1.5 rounded-xl italic uppercase shadow-[0_0_20px_#ff003c] animate-pulse border border-white/20">رائج</div>
        )}
        {isNew && (
          <div className="bg-[#ffea00] text-black text-[9px] font-black px-4 py-1.5 rounded-xl italic uppercase shadow-[0_0_20px_#ffea00] border border-black/20">جديد</div>
        )}
      </div>

      {/* أسفل: الإحصائيات الضخمة */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-5 pt-14 z-20">
        <p className="text-white text-[12px] font-black line-clamp-1 italic text-right mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{video.title}</p>
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10">
           <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#39ff14] font-black drop-shadow-[0_0_8px_#39ff14]">{formatBigNumber(stats.likes)}</span>
              <span className="text-[7px] text-white/40 uppercase font-black">Likes</span>
           </div>
           <div className="w-px h-6 bg-white/10"></div>
           <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#00f3ff] font-black drop-shadow-[0_0_8px_#00f3ff]">{formatBigNumber(stats.views)}</span>
              <span className="text-[7px] text-white/40 uppercase font-black">Views</span>
           </div>
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
  const [isDragging, setIsDragging] = useState(false);
  const DEFAULT_SPEED = 1.0;
  const speed = reverse ? -DEFAULT_SPEED : DEFAULT_SPEED;
  const requestRef = useRef<number>(null);

  const displayVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return [...videos, ...videos, ...videos];
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
        className="flex gap-5 px-5 h-full items-center overflow-x-auto scrollbar-hide select-none"
      >
        {displayVideos.map((item, idx) => {
          const neon = getNeonStyle(item.id);
          const isNew = !playedIds.includes(item.id);
          return (
            <div key={`${item.id}-${idx}`} onClick={() => onPlay(item)} className={`${isShorts ? 'w-40 h-64' : 'w-64 h-36'} shrink-0 rounded-[2rem] overflow-hidden border-2 relative active:scale-95 transition-all ${neon.border} ${neon.glow}`} dir="rtl">
              <video src={item.video_url} muted loop playsInline autoPlay className="w-full h-full object-cover pointer-events-none opacity-80" />
              {isNew && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-[#ffea00] text-[7px] text-black px-2 py-0.5 rounded-lg font-black italic shadow-lg">جديد</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-4">
                <p className="text-[10px] font-black text-white truncate italic text-right drop-shadow-md">{item.title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string, color: string }> = ({ title, color }) => (
  <div className="flex items-center gap-3 px-6 mb-5">
    <div className="w-2 h-6 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}></div>
    <h2 className="text-[15px] font-black text-white italic tracking-wide">{title}</h2>
  </div>
);

const MainContent: React.FC<any> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onCategoryClick, onHardRefresh, onOfflineClick, isOverlayActive, onLike, pullOffset, isSyncing, playedIds
}) => {
  const shortsOnly = useMemo(() => videos.filter((v: Video) => v.type === 'short'), [videos]);
  const longsOnly = useMemo(() => videos.filter((v: Video) => v.type === 'long'), [videos]);

  return (
    <div className="flex flex-col pb-32 w-full bg-black min-h-screen" dir="rtl">
      <header className="flex items-center justify-between py-5 bg-black/95 backdrop-blur-2xl sticky top-0 z-[110] px-6 border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4" onClick={onHardRefresh}>
          <div className="relative">
            <div className="absolute inset-0 bg-red-600 rounded-full blur-lg opacity-40 animate-pulse"></div>
            <img src={LOGO_URL} className={`w-10 h-10 rounded-full border-2 ${isSyncing ? 'border-[#ffea00] shadow-[0_0_15px_#ffea00]' : 'border-[#ff003c] shadow-[0_0_15px_#ff003c]'} relative z-10`} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-black italic transition-colors ${isSyncing ? 'text-[#ffea00] shadow-[#ffea00]' : 'text-[#ff003c] shadow-[#ff003c]'}`}>الحديقة المرعبة</h1>
          </div>
        </div>
        <button onClick={onOfflineClick} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-[#ffea00] shadow-[0_0_15px_rgba(255,234,0,0.1)]">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
        </button>
      </header>

      <nav className="h-16 bg-black/95 z-[100] border-b border-white/5 sticky top-[71px] overflow-x-auto scrollbar-hide flex items-center px-6 gap-4">
        {categoriesList?.map((cat: string) => (
          <button 
            key={cat} 
            onClick={() => onCategoryClick(cat)} 
            className="shrink-0 px-6 py-2 rounded-2xl text-[11px] font-black text-white italic whitespace-nowrap bg-white/5 border border-white/10 hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all"
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="pt-8 space-y-14">
        <section>
          <SectionHeader title="كوابيس سريعة" color="#ff003c" />
          <InteractiveMarquee videos={shortsOnly.slice(0, 15)} onPlay={(v) => onPlayShort(v, shortsOnly)} isShorts={true} playedIds={playedIds} />
        </section>

        <section className="px-6">
          <SectionHeader title="الأكثر رعباً اليوم" color="#ffea00" />
          <div className="grid grid-cols-2 gap-5">
            {shortsOnly.slice(15, 19).map(v => (
              <div key={v.id} onClick={() => onPlayShort(v, shortsOnly)} className="aspect-[9/16]">
                <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} playedIds={playedIds} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="أفلام القبو الطويلة" color="#00f3ff" />
          <InteractiveMarquee videos={longsOnly} onPlay={(v) => onPlayLong(v, longsOnly)} reverse={true} playedIds={playedIds} />
        </section>

        <section className="px-6">
          <SectionHeader title="أرشيف الجحيم" color="#bc00ff" />
          <div className="space-y-6">
            {longsOnly.slice(0, 3).map(v => (
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
