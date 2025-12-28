
import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from 'react';
import { Video, AppView, UserInteractions } from './types.ts';
import { fetchChannelVideos } from './telegramClient.ts';
import { getRecommendedFeed } from './geminiService.ts';
import AppBar from './AppBar.tsx';
import MainContent from './MainContent.tsx';

const ShortsPlayerOverlay = lazy(() => import('./ShortsPlayerOverlay.tsx'));
const LongPlayerOverlay = lazy(() => import('./LongPlayerOverlay.tsx'));
const AdminDashboard = lazy(() => import('./AdminDashboard.tsx'));
const AIOracle = lazy(() => import('./AIOracle.tsx'));
const TrendPage = lazy(() => import('./TrendPage.tsx'));
const SavedPage = lazy(() => import('./SavedPage.tsx'));
const PrivacyPage = lazy(() => import('./PrivacyPage.tsx'));
const HiddenVideosPage = lazy(() => import('./HiddenVideosPage.tsx'));
const CategoryPage = lazy(() => import('./CategoryPage.tsx'));
const OfflinePage = lazy(() => import('./OfflinePage.tsx'));

export const OFFICIAL_CATEGORIES = [
  'هجمات مرعبة',
  'رعب حقيقي',
  'رعب الحيوانات',
  'أخطر المشاهد',
  'أهوال مرعبة',
  'رعب كوميدي',
  'لحظات مرعبة',
  'صدمه'
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [rawVideos, setRawVideos] = useState<Video[]>([]); 
  const [loading, setLoading] = useState(true);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [startY, setStartY] = useState(0);
  const [pullOffset, setPullOffset] = useState(0);

  const isOverlayActive = useMemo(() => !!selectedShort || !!selectedLong, [selectedShort, selectedLong]);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    try {
      const saved = localStorage.getItem('al-hadiqa-interactions-v7');
      return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: [] };
    } catch (e) {
      return { likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: [] };
    }
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async (isHardRefresh = false) => {
    if (isHardRefresh) showToast("SYNCING ARCHIVE...");
    setLoading(true);
    
    try {
      const data = await fetchChannelVideos();
      if (data && data.length > 0) {
        const deletedIds = JSON.parse(localStorage.getItem('al-hadiqa-deleted-ids') || '[]');
        const filtered = data.filter(v => !deletedIds.includes(v.id));

        const recommendedOrder = await getRecommendedFeed(filtered, interactions);
        const orderedVideos = recommendedOrder
          .map(id => filtered.find(v => v.id === id))
          .filter((v): v is Video => !!v);

        const remaining = filtered.filter(v => !recommendedOrder.includes(v.id));
        setRawVideos([...orderedVideos, ...remaining]);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      const cached = localStorage.getItem('horror_vault');
      if (cached) setRawVideos(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [interactions]);

  useEffect(() => {
    loadData(false);
    const syncInterval = setInterval(() => loadData(false), 300000);
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => { 
    localStorage.setItem('al-hadiqa-interactions-v7', JSON.stringify(interactions)); 
  }, [interactions]);

  const handleLikeToggle = (id: string) => {
    setInteractions(p => {
      const isAlreadyLiked = p.likedIds.includes(id);
      if (isAlreadyLiked) {
        return { ...p, likedIds: p.likedIds.filter(x => x !== id) };
      }
      return { 
        ...p, 
        likedIds: [...p.likedIds, id], 
        dislikedIds: p.dislikedIds.filter(x => x !== id) 
      };
    });
    showToast("PAYLOAD LIKED ✨");
  };

  const handleDislike = (id: string) => {
    setInteractions(p => {
      return { 
        ...p, 
        dislikedIds: [...new Set([...p.dislikedIds, id])], 
        likedIds: p.likedIds.filter(x => x !== id) 
      };
    });
    showToast("ARCHIVE EXCLUDED ⚰️");
    setSelectedShort(null); setSelectedLong(null);
  };

  const renderContent = () => {
    const activeVideos = rawVideos.filter(v => !interactions.dislikedIds.includes(v.id));
    const longsOnly = activeVideos.filter(v => v.type === 'long');

    switch(currentView) {
      case AppView.OFFLINE:
        return <Suspense fallback={null}><OfflinePage allVideos={rawVideos} interactions={interactions} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} onBack={() => setCurrentView(AppView.HOME)} onUpdateInteractions={setInteractions} /></Suspense>;
      case AppView.CATEGORY:
        return <Suspense fallback={null}><CategoryPage category={activeCategory} allVideos={activeVideos} isSaved={interactions.savedCategoryNames.includes(activeCategory)} onToggleSave={() => setInteractions(p => ({...p, savedCategoryNames: p.savedCategoryNames.includes(activeCategory) ? p.savedCategoryNames.filter(c => c !== activeCategory) : [...p.savedCategoryNames, activeCategory]}))} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} onBack={() => setCurrentView(AppView.HOME)} /></Suspense>;
      case AppView.ADMIN:
        return <Suspense fallback={null}><AdminDashboard onClose={() => setCurrentView(AppView.HOME)} categories={OFFICIAL_CATEGORIES} initialVideos={rawVideos} /></Suspense>;
      case AppView.TREND:
        return <Suspense fallback={null}><TrendPage onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} excludedIds={interactions.dislikedIds} allVideos={rawVideos} /></Suspense>;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} savedCategories={[]} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} title="الإعجابات" onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} savedCategories={interactions.savedCategoryNames} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} title="المحفوظات" onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(prev => ({...prev, dislikedIds: prev.dislikedIds.filter(x => x !== id)}))} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:longsOnly})} />;
      case AppView.PRIVACY:
        return <PrivacyPage onOpenAdmin={() => setCurrentView(AppView.ADMIN)} />;
      default:
        return (
          <div 
            onTouchStart={(e) => window.scrollY <= 5 && setStartY(e.touches[0].pageY)}
            onTouchMove={(e) => startY > 0 && setPullOffset(Math.min(e.touches[0].pageY - startY, 150))}
            onTouchEnd={() => { if (pullOffset > 80) loadData(true); setPullOffset(0); setStartY(0); }}
            className="relative transition-transform duration-200"
            style={{ transform: `translateY(${pullOffset}px)` }}
          >
            {pullOffset > 30 && (
              <div className="absolute -top-12 left-0 right-0 flex justify-center items-center">
                <div className="w-10 h-10 rounded-full border-4 border-[#00f3ff] border-t-transparent animate-spin shadow-[0_0_15px_#00f3ff]"></div>
              </div>
            )}
            <MainContent 
              videos={activeVideos} 
              categoriesList={OFFICIAL_CATEGORIES} 
              interactions={interactions}
              onPlayShort={(v, l) => setSelectedShort({video:v, list:l.filter(x => x.type === 'short')})}
              onPlayLong={(v, l) => setSelectedLong({video:v, list:l.filter(x => x.type === 'long')})}
              onCategoryClick={(c: string) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }}
              onHardRefresh={() => loadData(true)}
              onOfflineClick={() => setCurrentView(AppView.OFFLINE)}
              loading={loading}
              isOverlayActive={isOverlayActive}
              onLike={handleLikeToggle}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#00f3ff] selection:text-black">
      <AppBar onViewChange={setCurrentView} onRefresh={() => loadData(false)} currentView={currentView} />
      <main className="pt-20 max-w-lg mx-auto overflow-x-hidden">{renderContent()}</main>
      <Suspense fallback={null}><AIOracle /></Suspense>
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] bg-[#00f3ff] px-6 py-2 rounded-full font-black shadow-[0_0_20px_#00f3ff] text-black text-[10px] border border-white/20 animate-in fade-in slide-in-from-top-4 tech-font uppercase tracking-widest">
          {toast}
        </div>
      )}
      
      {selectedShort && (
        <Suspense fallback={null}>
          <ShortsPlayerOverlay 
            initialVideo={selectedShort.video} videoList={selectedShort.list} interactions={interactions} 
            onClose={() => setSelectedShort(null)} onLike={handleLikeToggle} onDislike={handleDislike} 
            onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); setSelectedShort(null); }}
            onSave={(id) => setInteractions(p => ({...p, savedIds: [...new Set([...p.savedIds, id])]}))} 
            onProgress={(id, pr) => {}} onDownload={(video) => {}}
          />
        </Suspense>
      )}

      {selectedLong && (
        <Suspense fallback={null}>
          <LongPlayerOverlay 
            video={selectedLong.video} allLongVideos={selectedLong.list} onClose={() => setSelectedLong(null)} 
            onLike={() => handleLikeToggle(selectedLong.video.id)} onDislike={() => handleDislike(selectedLong.video.id)} 
            onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); setSelectedLong(null); }}
            onSave={() => setInteractions(p => ({...p, savedIds: [...new Set([...p.savedIds, selectedLong.video.id])]}))} 
            onSwitchVideo={(v) => setSelectedLong(p => p ? {...p, video: v} : null)} 
            isLiked={interactions.likedIds.includes(selectedLong.video.id)} isDisliked={interactions.dislikedIds.includes(selectedLong.video.id)} 
            isSaved={interactions.savedIds.includes(selectedLong.video.id)} onProgress={(pr) => {}} 
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
