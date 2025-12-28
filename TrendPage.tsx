
import React, { useMemo } from 'react';
import { Video } from './types';
import { getDeterministicStats, formatBigNumber } from './MainContent';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

interface TrendPageProps {
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video) => void;
  excludedIds: string[];
  allVideos: Video[];
}

const TrendPage: React.FC<TrendPageProps> = ({ onPlayShort, onPlayLong, excludedIds, allVideos }) => {
  const trendVideos = useMemo(() => {
    return [...allVideos]
      .filter(v => !excludedIds.includes(v.id))
      .sort((a, b) => {
        const statsA = getDeterministicStats(a.video_url || a.id);
        const statsB = getDeterministicStats(b.video_url || b.id);
        return statsB.views - statsA.views;
      })
      .slice(0, 10); 
  }, [allVideos, excludedIds]);

  return (
    <div className="flex flex-col gap-10 pb-40 px-5 animate-in fade-in duration-700" dir="rtl">
      <div className="flex items-center gap-5 border-b-2 border-red-600/20 pb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-red-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <img src={LOGO_URL} className="w-16 h-16 rounded-full border-2 border-red-600 relative z-10 shadow-[0_0_20px_#ff003c]" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-red-600 italic tracking-tighter">الحديقة المرعبة - <span className="text-[#ffea00] drop-shadow-[0_0_10px_#ffea00]">رائج</span></h1>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em]">Top 10 Nightmares</p>
        </div>
      </div>

      <div className="space-y-8">
        {trendVideos.map((video, idx) => {
          const stats = getDeterministicStats(video.id);
          return (
            <div 
              key={video.id}
              onClick={() => video.type === 'short' ? onPlayShort(video, trendVideos.filter(v=>v.type==='short')) : onPlayLong(video)}
              className="group relative bg-[#0a0a0a] rounded-[3rem] border-2 border-red-600/30 hover:border-red-600 shadow-2xl overflow-hidden cursor-pointer transition-all active:scale-95"
            >
              <div className="aspect-video relative overflow-hidden">
                <video src={video.video_url} muted autoPlay loop playsInline className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[5s]" />
                <div className="absolute top-5 right-5 z-20 w-14 h-14 flex items-center justify-center rounded-2xl font-black text-2xl bg-red-600 text-white shadow-[0_0_25px_#ff003c] border-2 border-white/20 italic">
                  #{idx + 1}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>
              <div className="p-7 relative">
                <h3 className="font-black text-xl text-white italic text-right mb-4 group-hover:text-red-500 transition-colors">{video.title}</h3>
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex gap-6 items-center">
                     <span className="text-[11px] text-[#39ff14] font-black">{formatBigNumber(stats.likes)} LIKES</span>
                     <span className="text-[11px] text-[#00f3ff] font-black">{formatBigNumber(stats.views)} VIEWS</span>
                  </div>
                  <span className="text-[10px] text-red-500 font-black italic uppercase">{video.category}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrendPage;
