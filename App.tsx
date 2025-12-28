
import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
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
  'صدمه',
  'لحظات مرعبة'
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [rawVideos, setRawVideos] = useState<Video[]>([]); 
  const [displayVideos, setDisplayVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); 
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [systemErrors, setSystemErrors] = useState<string[]>([]);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  
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

  /**
   * دالة المزامنة الصامتة: تبحث عن جديد تليجرام كل 3 ثوانٍ
   */
  const silentSync = useCallback(async () => {
    try {
      const data = await fetchChannelVideos();
      if (data && data.length > 0) {
        const deletedIds = JSON.parse(localStorage.getItem('al-hadiqa-deleted-ids') || '[]');
        const filtered = data.filter(v => !deletedIds.includes(v.id));
        setRawVideos(filtered);
      }
    } catch (err) {
      // مزامنة صامتة لا تظهر أخطاء للمستخدم
    }
  }, []);

  /**
   * دالة تحديث واجهة المستخدم بالكامل كل 15 ثانية بمحتوى عشوائي متنوع
   */
  const refreshUI = useCallback(async () => {
    if (rawVideos.length === 0) return;
    
    // خلط المحتوى لضمان التنوع
    const shuffled = [...rawVideos].sort(() => Math.random() - 0.5);
    
    try {
      const recommendedOrder = await getRecommendedFeed(shuffled, interactions);
      const orderedVideos = recommendedOrder
        .map(id => shuffled.find(v => v.id === id))
        .filter((v): v is Video => !!v);
      
      const remaining = shuffled.filter(v => !recommendedOrder.includes(v.id));
      setDisplayVideos([...orderedVideos, ...remaining]);
    } catch (e) {
      setDisplayVideos(shuffled);
    }
    setLoading(false);
  }, [rawVideos, interactions]);

  // المزامنة الصامتة كل 3 ثوانٍ
  useEffect(() => {
    silentSync();
    const syncInterval = setInterval(silentSync, 3000);
    return () => clearInterval(syncInterval);
  }, [silentSync]);

  // تحديث واجهة العرض كل 15 ثانية
  useEffect(() => {
    if (rawVideos.length > 0) {
      refreshUI();
      const uiInterval = setInterval(refreshUI, 15000);
      return () => clearInterval(uiInterval);
    }
  }, [refreshUI, rawVideos.length]);

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
    showToast("تم الحفظ في الأرشيف ✨");
  };

  const handleDislike = (id: string) => {
    setInteractions(p => {
      return { 
        ...p, 
        dislikedIds: [...new Set([...p.dislikedIds, id])], 
        likedIds: p.likedIds.filter(x => x !== id) 
      };
    });
    showToast("تم الاستبعاد ⚰️");
    setSelectedShort(null); setSelectedLong(null);
  };

  const markAsPlayed = (id: string) => {
    setPlayedIds(prev => [...new Set([...prev, id])]);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#ff003c] selection:text-white">
      <AppBar onViewChange={setCurrentView} onRefresh={refreshUI} currentView={currentView} />

      <main className="pt-20 max-w-lg mx-auto overflow-x-hidden">
        {currentView === AppView.ADMIN ? (
          <Suspense fallback={null}>
            <AdminDashboard 
              onClose={() => setCurrentView(AppView.HOME)} 
              categories={OFFICIAL_CATEGORIES} 
              initialVideos={rawVideos}
              errors={systemErrors}
            />
          </Suspense>
        ) : (
          (() => {
            const activeVideos = displayVideos.filter(v => !interactions.dislikedIds.includes(v.id));
            const longsOnly = activeVideos.filter(v => v.type === 'long');

            switch(currentView) {
              case AppView.OFFLINE:
                return <Suspense fallback={null}><OfflinePage allVideos={rawVideos} interactions={interactions} onPlayShort={(v, l) => { setSelectedShort({video:v, list:l}); markAsPlayed(v.id); }} onPlayLong={(v) => { setSelectedLong({video:v, list:longsOnly}); markAsPlayed(v.id); }} onBack={() => setCurrentView(AppView.HOME)} onUpdateInteractions={setInteractions} /></Suspense>;
              case AppView.CATEGORY:
                return <Suspense fallback={null}><CategoryPage category={activeCategory} allVideos={activeVideos} isSaved={interactions.savedCategoryNames.includes(activeCategory)} onToggleSave={() => setInteractions(p => ({...p, savedCategoryNames: p.savedCategoryNames.includes(activeCategory) ? p.savedCategoryNames.filter(c => c !== activeCategory) : [...p.savedCategoryNames, activeCategory]}))} onPlayShort={(v, l) => { setSelectedShort({video:v, list:l}); markAsPlayed(v.id); }} onPlayLong={(v) => { setSelectedLong({video:v, list:longsOnly}); markAsPlayed(v.id); }} onBack={() => setCurrentView(AppView.HOME)} /></Suspense>;
              case AppView.TREND:
                return <Suspense fallback={null}><TrendPage onPlayShort={(v, l) => { setSelectedShort({video:v, list:l}); markAsPlayed(v.id); }} onPlayLong={(v) => { setSelectedLong({video:v, list:longsOnly}); markAsPlayed(v.id); }} excludedIds={interactions.dislikedIds} allVideos={rawVideos} /></Suspense>;
              case AppView.LIKES:
                return <SavedPage savedIds={interactions.likedIds} savedCategories={[]} allVideos={rawVideos} onPlayShort={(v, l) => { setSelectedShort({video:v, list:l}); markAsPlayed(v.id); }} onPlayLong={(v) => { setSelectedLong({video:v, list:longsOnly}); markAsPlayed(v.id); }} title="الإعجابات" onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }} />;
              case AppView.SAVED:
                return <SavedPage savedIds={interactions.savedIds} savedCategories={interactions.savedCategoryNames} allVideos={rawVideos} onPlayShort={(v, l) => { setSelectedShort({video:v, list:l}); markAsPlayed(v.id); }} onPlayLong={(v) => { setSelectedLong({video:v, list:longsOnly}); markAsPlayed(v.id); }} title="المحفوظات" onCategoryClick={(c) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }} />;
              case AppView.HIDDEN:
                return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(prev => ({...prev, dislikedIds: prev.dislikedIds.filter(x => x !== id)}))} onPlayShort={(v, l) => { setSelectedShort({video:v, list:l}); markAsPlayed(v.id); }} onPlayLong={(v) => { setSelectedLong({video:v, list:longsOnly}); markAsPlayed(v.id); }} />;
              case AppView.PRIVACY:
                return <PrivacyPage onOpenAdmin={() => setCurrentView(AppView.ADMIN)} />;
              default:
                return (
                  <div 
                    onTouchStart={(e) => window.scrollY <= 5 && setStartY(e.touches[0].pageY)}
                    onTouchMove={(e) => startY > 0 && setPullOffset(Math.min(e.touches[0].pageY - startY, 150))}
                    onTouchEnd={() => { if (pullOffset > 80) refreshUI(); setPullOffset(0); setStartY(0); }}
                    className="relative transition-transform duration-200"
                    style={{ transform: `translateY(${pullOffset}px)` }}
                  >
                    <MainContent 
                      videos={activeVideos} 
                      categoriesList={OFFICIAL_CATEGORIES} 
                      interactions={interactions}
                      onPlayShort={(v, l) => { setSelectedShort({video:v, list:l.filter(x => x.type === 'short')}); markAsPlayed(v.id); }}
                      onPlayLong={(v, l) => { setSelectedLong({video:v, list:l.filter(x => x.type === 'long')}); markAsPlayed(v.id); }}
                      onCategoryClick={(c: string) => { setActiveCategory(c); setCurrentView(AppView.CATEGORY); }}
                      onHardRefresh={refreshUI}
                      onOfflineClick={() => setCurrentView(AppView.OFFLINE)}
                      loading={loading}
                      isOverlayActive={isOverlayActive}
                      onLike={handleLikeToggle}
                      pullOffset={pullOffset}
                      isSyncing={isSyncing}
                      playedIds={playedIds}
                    />
                  </div>
                );
            }
          })()
        )}
      </main>

      <Suspense fallback={null}><AIOracle /></Suspense>
      
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] bg-[#ff003c] px-6 py-2 rounded-full font-black shadow-[0_0_20px_#ff003c] text-white text-[10px] border border-white/20 animate-in fade-in slide-in-from-top-4 tech-font uppercase tracking-widest">
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
            onSwitchVideo={(v) => { setSelectedLong(p => p ? {...p, video: v} : null); markAsPlayed(v.id); }} 
            isLiked={interactions.likedIds.includes(selectedLong.video.id)} isDisliked={interactions.dislikedIds.includes(selectedLong.video.id)} 
            isSaved={interactions.savedIds.includes(selectedLong.video.id)} onProgress={(pr) => {}} 
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
