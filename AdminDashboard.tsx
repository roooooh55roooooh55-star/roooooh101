
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Video } from './types';
import { uploadVideoWithProgress, fetchChannelVideos } from './telegramClient';
import { analyzeVideoFrames, VideoAnalysisResult } from './geminiService';
import { generateSpeech, getSubscriptionInfo, SubscriptionInfo } from './elevenLabsService';

interface AdminDashboardProps {
  onClose: () => void;
  categories: string[];
  initialVideos: Video[];
}

const DEFAULT_ELEVEN_KEYS = [
  '97b061348f54aac071926ba535a848e27bee7e1b66655d2c4aea97e61c1d1a63',
  '6b7ff2d708a0c87354587dab2f6e37f2e981f0ee5361a753b0e5048c13ed4686',
  '3d8249a70637e154c4a407b367681da5ae675d2a555a0202ab5b8e6613c1b835'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, categories, initialVideos 
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'settings' | 'list'>('upload');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  
  const [elevenKeys, setElevenKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin_eleven_keys_v2');
    return saved ? JSON.parse(saved) : DEFAULT_ELEVEN_KEYS;
  });
  const [keyStats, setKeyStats] = useState<{[key: string]: SubscriptionInfo | null}>({});
  const [selectedKeyIndex, setSelectedKeyIndex] = useState(0);
  const [voiceId, setVoiceId] = useState(localStorage.getItem('admin_voice_id') || 'EXAVIT9mxu1B8L2Kx57H');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(categories[0]);
  const [uploadNarration, setUploadNarration] = useState('');
  const [videoType, setVideoType] = useState<'short' | 'long'>('short');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [vaultVideos, setVaultVideos] = useState<Video[]>(initialVideos);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isAuthenticated) refreshKeyStats();
  }, [isAuthenticated]);

  const refreshKeyStats = async () => {
    const stats: any = {};
    for (const key of elevenKeys) {
      const info = await getSubscriptionInfo(key);
      stats[key] = info;
    }
    setKeyStats(stats);
  };

  const handleAuth = () => {
    if (passcode === '5030775') setIsAuthenticated(true);
    else { alert("ACCESS DENIED: Unauthorized biological signature."); setPasscode(''); }
  };

  const saveSettings = () => {
    localStorage.setItem('admin_eleven_keys_v2', JSON.stringify(elevenKeys));
    localStorage.setItem('admin_voice_id', voiceId);
    alert('CRYPTO-SEALS UPDATED 💀');
    refreshKeyStats();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAiLogs(["[INFO] RAW SAMPLE LOADED.", "[WAIT] INITIALIZING SCAN..."]);
      const v = document.createElement('video');
      v.src = URL.createObjectURL(file);
      v.onloadedmetadata = () => { setVideoType(v.videoHeight > v.videoWidth ? 'short' : 'long'); };
    }
  };

  const executeAiAnalysis = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedFile) return;
    setIsAnalyzing(true);
    setAiLogs(prev => [...prev, "[AI] DECRYPTING VIA GEMINI-STREAM...", "[PROCESS] EXTRACTING METADATA..."]);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      
      const result = await analyzeVideoFrames(base64Image, selectedFile.name);
      setAnalysisResult(result);
      setUploadTitle(result.title);
      setUploadCategory(result.category);
      setUploadNarration(result.narration);
      setAiLogs(prev => [...prev, "[SUCCESS] ANALYSIS COMPLETE."]);
    } catch (e) {
      setAiLogs(prev => [...prev, "[ERROR] AI PROTOCOL FAILED."]);
    } finally { setIsAnalyzing(false); }
  };

  const handleVoiceGeneration = async () => {
    const currentKey = elevenKeys[selectedKeyIndex];
    if (!uploadNarration || !currentKey) return;
    setIsGeneratingVoice(true);
    const audioUrl = await generateSpeech(uploadNarration, currentKey, voiceId);
    if (audioUrl) {
      setGeneratedAudio(audioUrl);
      setAiLogs(prev => [...prev, "[VOICE] NARRATION SYNTHESIZED."]);
      refreshKeyStats();
    } else {
      alert('KEY DEPLETED OR INVALID.');
    }
    setIsGeneratingVoice(false);
  };

  const handlePublish = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadVideoWithProgress(selectedFile, {
        title: uploadTitle,
        category: uploadCategory,
        narration: uploadNarration,
        type: videoType
      }, (p) => setUploadProgress(p));

      if (result.ok) {
        alert("INJECTION SUCCESSFUL 💀");
        setPreviewUrl(null); setSelectedFile(null); setUploadNarration(''); setGeneratedAudio(null);
        refreshVault();
      }
    } catch (e) { alert("INJECTION FAILURE."); }
    finally { setIsUploading(false); }
  };

  const refreshVault = async () => {
    const data = await fetchChannelVideos();
    setVaultVideos(data);
  };

  const deleteVideoFromVault = (id: string) => {
    if (!window.confirm("ERASE PERMANENTLY?")) return;
    const updated = vaultVideos.filter(v => v.id !== id);
    setVaultVideos(updated);
    const deleted = JSON.parse(localStorage.getItem('al-hadiqa-deleted-ids') || '[]');
    localStorage.setItem('al-hadiqa-deleted-ids', JSON.stringify([...deleted, id]));
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 tech-font">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,0,0,0.15)_0%,_#000000_100%)]"></div>
        <div className="relative z-10 space-y-12 text-center">
          <div className="space-y-2">
            <h2 className="text-5xl font-black text-[#ff003c] italic tracking-tighter drop-shadow-[0_0_30px_#ff003c]">BIO-AUTH</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.5em]">Gate System Protocol // 5030775</p>
          </div>
          <input 
            type="password" value={passcode} onChange={e => setPasscode(e.target.value)} 
            placeholder="••••••" className="bg-black/80 border-2 border-[#ff003c]/30 p-6 rounded-[2.5rem] text-center w-72 text-[#ff003c] font-black text-4xl outline-none focus:border-[#ff003c] shadow-[inset_0_0_20px_rgba(255,0,0,0.1)] transition-all"
          />
          <button onClick={handleAuth} className="w-full bg-[#ff003c] hover:bg-white hover:text-black py-6 rounded-full font-black text-white text-xl shadow-[0_0_50px_rgba(255,0,0,0.6)] active:scale-95 transition-all">TERMINAL LOGIN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[900] bg-[#020202] overflow-hidden flex flex-col tech-font" dir="rtl">
      {/* High-Tech Header */}
      <div className="h-20 border-b border-[#ff003c]/20 flex items-center justify-between px-8 bg-black/90 backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[#ff003c] rounded-full animate-ping shadow-[0_0_20px_#ff003c]"></div>
          <h1 className="text-[12px] font-black text-[#ff003c] uppercase tracking-[0.4em] italic drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">DEV-TERMINAL v8.1</h1>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-[#ff003c] p-2 transition-colors duration-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Cyberpunk Tabs */}
      <div className="flex border-b border-white/5 bg-neutral-900/10">
        {[
          { id: 'upload', label: 'CORE INJECTION', color: 'text-[#ff003c]', border: 'border-[#ff003c]' },
          { id: 'settings', label: 'API NODES', color: 'text-[#00f3ff]', border: 'border-[#00f3ff]' },
          { id: 'list', label: 'LOCAL ARCHIVE', color: 'text-[#ffea00]', border: 'border-[#ffea00]' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === tab.id ? `${tab.color} bg-white/5 border-b-2 ${tab.border}` : 'text-white/20 hover:text-white/60'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-32 scrollbar-hide">
        {activeTab === 'upload' && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-video bg-[#050505] rounded-[2.5rem] border-2 border-dashed border-[#ff003c]/30 flex items-center justify-center relative overflow-hidden group shadow-2xl">
                {previewUrl ? (
                  <video ref={videoRef} src={previewUrl} className="w-full h-full object-contain" controls />
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-6 text-white/30 hover:text-[#ff003c] transition-all duration-500">
                    <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">SELECT PAYLOAD</span>
                    <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                  </label>
                )}
              </div>
              <div className="bg-black/60 p-6 rounded-[2.5rem] border border-white/10 flex flex-col shadow-2xl">
                <h3 className="text-[10px] font-black text-[#ff003c] mb-6 uppercase italic tracking-[0.2em]">ANALYSIS STREAM</h3>
                <div className="flex-1 h-32 overflow-y-auto text-[10px] text-[#ff003c]/80 font-mono space-y-2 leading-relaxed">
                  {aiLogs.map((log, i) => <div key={i} className="border-l-2 border-[#ff003c]/20 pl-3">>> {log}</div>)}
                </div>
                {previewUrl && !analysisResult && (
                  <button onClick={executeAiAnalysis} disabled={isAnalyzing} className="w-full bg-[#ff003c]/10 py-4 rounded-2xl text-[10px] font-black mt-6 border-2 border-[#ff003c]/30 text-[#ff003c] hover:bg-[#ff003c] hover:text-white shadow-[0_0_20px_rgba(255,0,0,0.1)] transition-all">
                    {isAnalyzing ? 'DECODING...' : 'RUN ANALYZER'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#050505]/80 p-10 rounded-[4rem] border border-white/10 space-y-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] text-white/30 pr-4 uppercase font-black tracking-widest">IDENTIFIER</label>
                  <input type="text" placeholder="TITLE..." value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="w-full bg-black border-2 border-white/10 p-5 rounded-[2rem] text-xs text-white outline-none focus:border-[#ff003c] transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-white/30 pr-4 uppercase font-black tracking-widest">PARTITION</label>
                  <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="w-full bg-black border-2 border-white/10 p-5 rounded-[2rem] text-[11px] font-black text-[#ff003c] outline-none focus:border-[#ff003c]">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center px-4">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-widest">NARRATION SCRIPT</label>
                    <div className="flex gap-4">
                       <select value={selectedKeyIndex} onChange={e => setSelectedKeyIndex(Number(e.target.value))} className="bg-black text-[10px] text-[#00f3ff] border-2 border-[#00f3ff]/20 rounded-xl px-3 outline-none">
                          {elevenKeys.map((k, i) => <option key={i} value={i}>NODE {i+1}</option>)}
                       </select>
                       <button onClick={handleVoiceGeneration} disabled={isGeneratingVoice} className="text-[10px] text-[#00f3ff] bg-[#00f3ff]/10 px-5 py-2 rounded-xl border-2 border-[#00f3ff]/30 hover:bg-[#00f3ff] hover:text-black transition-all">
                         {isGeneratingVoice ? 'SYNTHESIZING...' : 'GENERATE VOICE'}
                       </button>
                    </div>
                 </div>
                 <textarea value={uploadNarration} onChange={e => setUploadNarration(e.target.value)} className="w-full bg-black border-2 border-white/10 p-6 rounded-[2.5rem] h-32 text-xs italic text-white/60 outline-none focus:border-[#ff003c] transition-all" />
              </div>
              
              <button 
                onClick={handlePublish} disabled={!selectedFile || isUploading} 
                className={`w-full py-8 rounded-[3rem] font-black text-white text-xl shadow-[0_20px_60px_rgba(255,0,0,0.4)] transition-all active:scale-95 ${!selectedFile || isUploading ? 'bg-neutral-900 border-neutral-800' : 'bg-[#ff003c] border-2 border-white/20 hover:bg-white hover:text-black'}`}
              >
                {isUploading ? `INJECTING PAYLOAD (${uploadProgress}%)` : 'EXECUTE INJECTION'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-xl font-black text-[#00f3ff] italic flex items-center gap-4">
              <span className="w-3 h-3 bg-[#00f3ff] rounded-full animate-pulse shadow-[0_0_20px_#00f3ff]"></span> API NETWORK NODES
            </h2>
            <div className="space-y-6">
              {elevenKeys.map((key, index) => {
                const stats = keyStats[key];
                const remaining = stats ? stats.character_limit - stats.character_count : '...';
                return (
                  <div key={index} className="bg-[#050505] p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">ELEVEN-KEY {index + 1}</span>
                      <span className="text-[12px] font-black text-[#00f3ff] italic drop-shadow-[0_0_10px_#00f3ff]">REMAINING: {remaining} CHR</span>
                    </div>
                    <input type="password" value={key} onChange={e => {
                      const n = [...elevenKeys]; n[index] = e.target.value; setElevenKeys(n);
                    }} className="w-full bg-black border-2 border-white/5 p-5 rounded-2xl text-[10px] text-white outline-none focus:border-[#00f3ff] transition-all" />
                  </div>
                );
              })}
              <button onClick={saveSettings} className="w-full bg-[#00f3ff] py-6 rounded-[2.5rem] font-black text-black shadow-[0_0_40px_rgba(0,243,255,0.4)] hover:bg-white active:scale-95 transition-all">SYNCHRONIZE API NETWORK</button>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="max-w-2xl mx-auto space-y-6">
             <h3 className="text-lg font-black text-[#ffea00] italic px-4 flex items-center gap-4">
               <span className="w-3 h-3 bg-[#ffea00] rounded-full shadow-[0_0_20px_#ffea00]"></span> CLOUD ARCHIVE ({vaultVideos.length})
             </h3>
             {vaultVideos.map(v => (
               <div key={v.id} className="bg-[#050505] p-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 hover:border-[#ffea00]/40 transition-all shadow-xl group">
                  <div className="w-24 h-16 bg-black rounded-2xl overflow-hidden shrink-0 border border-white/5">
                     <video src={v.video_url} className="w-full h-full object-cover opacity-30 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 overflow-hidden text-right">
                     <h4 className="text-[12px] font-black text-white truncate italic">{v.title}</h4>
                     <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">{v.category}</p>
                  </div>
                  <button onClick={() => deleteVideoFromVault(v.id)} className="p-4 text-[#ff003c] bg-[#ff003c]/10 border border-[#ff003c]/20 rounded-2xl hover:bg-[#ff003c] hover:text-white transition-all shadow-lg active:scale-75">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
               </div>
             ))}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default AdminDashboard;
