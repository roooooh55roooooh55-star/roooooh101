
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
        const statsA = getDeterministicStats(a.video_url);
        const statsB = getDeterministicStats(b.video_url);
        return statsB.views - statsA.views;
      })
      .slice(0, 15);
  }, [allVideos, excludedIds]);

  if (allVideos.length === 0) return (
    <div className="p-20 text-center flex flex-col items-center justify-center">
      <span className="text-red-600 font-black text-xs italic animate-pulse">جاري تحليل أرشيف التليجرام...</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-700" dir="rtl">
      <div className="flex items-center gap-4 border-b-2 border-red-600/30 pb-4 px-2">
        <div className="relative">
          <div className="absolute inset-0 bg-red-600 rounded-full blur-md opacity-50"></div>
          <img src={LOGO_URL} className="w-14 h-14 rounded-full border-2 border-red-600 relative z-10" />
        </div>
        <div className="flex flex-col text-right">
          <h1 className="text-2xl font-black text-red-600 italic">أهوال التليجرام الرائجة</h1>
          <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">Global Telegram Archive</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 px-2">
        {trendVideos.map((video, idx) => (
          <div 
            key={video.id}
            onClick={() => video.type === 'short' ? onPlayShort(video, trendVideos.filter(v=>v.type==='short')) : onPlayLong(video)}
            className="group relative bg-neutral-900/40 rounded-[3rem] border-2 border-red-600 shadow-2xl overflow-hidden cursor-pointer"
          >
            <div className="aspect-video relative overflow-hidden">
              <video src={video.video_url} muted autoPlay loop playsInline className="w-full h-full object-cover opacity-100 group-hover:scale-110 transition-all duration-[5s]" />
              <div className="absolute top-6 right-6 z-20 w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg bg-red-600 text-white shadow-xl italic">
                {idx + 1}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            </div>
            <div className="p-6">
              <h3 className="font-black text-lg text-white italic text-right mb-2">{video.title}</h3>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                   <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                   <span className="text-[9px] text-gray-500 uppercase">Telegram Source</span>
                </div>
                <span className="text-[10px] text-red-500 font-black italic bg-red-600/10 px-3 py-1 rounded-lg">{video.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendPage;
