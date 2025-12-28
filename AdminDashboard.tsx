
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Video } from './types';
import { uploadVideoWithProgress, fetchChannelVideos } from './telegramClient';
import { analyzeVideoFrames, VideoAnalysisResult } from './geminiService';
import { generateSpeech, getSubscriptionInfo, SubscriptionInfo } from './elevenLabsService';
import { GoogleGenAI } from "@google/genai";

interface AdminDashboardProps {
  onClose: () => void;
  categories: string[];
  initialVideos: Video[];
  errors: string[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, categories, initialVideos, errors 
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'settings' | 'list' | 'debug'>('upload');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  
  const [elevenKeys, setElevenKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin_eleven_keys_v2');
    return saved ? JSON.parse(saved) : [
      '97b061348f54aac071926ba535a848e27bee7e1b66655d2c4aea97e61c1d1a63',
      '6b7ff2d708a0c87354587dab2f6e37f2e981f0ee5361a753b0e5048c13ed4686',
      '3d8249a70637e154c4a407b367681da5ae675d2a555a0202ab5b8e6613c1b835'
    ];
  });
  const [keyStats, setKeyStats] = useState<{[key: string]: SubscriptionInfo | null}>({});
  const [voiceId, setVoiceId] = useState(localStorage.getItem('admin_voice_id') || 'EXAVIT9mxu1B8L2Kx57H');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(categories[0]);
  const [uploadNarration, setUploadNarration] = useState('');
  const [videoType, setVideoType] = useState<'short' | 'long'>('short');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [vaultVideos, setVaultVideos] = useState<Video[]>(initialVideos);

  const [debugChat, setDebugChat] = useState<{role: string, text: string}[]>([]);
  const [debugInput, setDebugInput] = useState('');
  const [isDebugLoading, setIsDebugLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAiLogs(prev => [...prev, `[SYSTEM] تم تحميل الملف: ${file.name}`]);
      
      // كشف مقاسات الفيديو تلقائياً
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        const isShort = tempVideo.videoHeight > tempVideo.videoWidth;
        setVideoType(isShort ? 'short' : 'long');
        setAiLogs(prev => [...prev, `[INFO] تم الكشف عن المقاس: ${isShort ? 'رأسي (شورتس)' : 'أفقي (عادي)'}`]);
      };
    }
  };

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
    else { alert("تم رفض الدخول: الرمز غير صحيح."); setPasscode(''); }
  };

  const executeAiAnalysis = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedFile) return;
    setIsAnalyzing(true);
    setAiLogs(prev => [...prev, "[AI] فحص عميق بواسطة Gemini...", "[PROCESS] استخراج بيانات الحتوى..."]);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      const result = await analyzeVideoFrames(base64Image, selectedFile.name);
      setUploadTitle(result.title);
      setUploadCategory(result.category);
      setUploadNarration(result.narration);
      setAiLogs(prev => [...prev, "[SUCCESS] تم تحليل النمط بنجاح."]);
    } catch (e: any) {
      setAiLogs(prev => [...prev, `[ERROR] فشل التحليل: ${e.message}`]);
    } finally { setIsAnalyzing(false); }
  };

  const handleVoiceGeneration = async () => {
    const currentKey = elevenKeys[0];
    if (!uploadNarration || !currentKey) return;
    setIsGeneratingVoice(true);
    const audioUrl = await generateSpeech(uploadNarration, currentKey, voiceId);
    if (audioUrl) {
      setAiLogs(prev => [...prev, "[VOICE] تم توليد السرد الصوتي بنجاح."]);
      refreshKeyStats();
    } else {
      alert('خطأ: مفتاح الصوت مستهلك أو غير صالح.');
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
        alert("تم الرفع بنجاح للحديقة المرعبة.");
        setPreviewUrl(null); setSelectedFile(null); setUploadNarration('');
        refreshVault();
      }
    } catch (e: any) { alert(`خطأ في الرفع: ${e.message}`); }
    finally { setIsUploading(false); }
  };

  const refreshVault = async () => {
    const data = await fetchChannelVideos();
    setVaultVideos(data);
  };

  const handleEditVideo = (video: Video) => {
    setUploadTitle(video.title);
    setUploadCategory(video.category);
    setUploadNarration(video.narration || "");
    setVideoType(video.type);
    setActiveTab('upload');
  };

  const handleTalkToGemini = async () => {
    if (!debugInput.trim() || isDebugLoading) return;
    const userInput = debugInput;
    setDebugInput('');
    setDebugChat(prev => [...prev, {role: 'user', text: userInput}]);
    setIsDebugLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: `أنت مساعد مطور الحديقة المرعبة. الأخطاء: ${errors.join(', ')}. سؤال: ${userInput}` }] }
        ]
      });
      setDebugChat(prev => [...prev, {role: 'model', text: response.text || "لا يوجد رد."}]);
    } catch (e: any) {
      setDebugChat(prev => [...prev, {role: 'model', text: `خطأ: ${e.message}`}]);
    } finally {
      setIsDebugLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 tech-font">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,243,255,0.15)_0%,_#000000_100%)]"></div>
        <div className="relative z-10 space-y-12 text-center">
          <div className="space-y-2">
            <h2 className="text-5xl font-black text-[#00f3ff] italic tracking-tighter drop-shadow-[0_0_30px_#00f3ff]">دخول النظام</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.5em]">بروتوكول البوابة الآمنة</p>
          </div>
          <input 
            type="password" value={passcode} onChange={e => setPasscode(e.target.value)} 
            placeholder="••••••" className="bg-black/80 border-2 border-[#ffea00]/30 p-6 rounded-[2.5rem] text-center w-72 text-[#ffea00] font-black text-4xl outline-none focus:border-[#ffea00] shadow-[inset_0_0_30px_rgba(255,234,0,0.1)] transition-all"
          />
          <button onClick={handleAuth} className="w-full bg-[#00f3ff] py-6 rounded-full font-black text-black text-xl shadow-[0_0_50px_rgba(0,243,255,0.4)] active:scale-95 transition-all uppercase">بدء التشغيل</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[900] bg-[#020202] overflow-hidden flex flex-col tech-font" dir="rtl">
      <div className="h-20 border-b border-[#00f3ff]/20 flex items-center justify-between px-8 bg-black/90 backdrop-blur-3xl shadow-[0_4px_30px_rgba(0,243,255,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[#ffea00] rounded-full animate-ping shadow-[0_0_20px_#ffea00]"></div>
          <h1 className="text-[14px] font-black text-[#00f3ff] uppercase tracking-[0.3em] italic">لوحة تحكم الحديقة المرعبة</h1>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-[#ffea00] p-2 transition-colors duration-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex border-b border-white/5 bg-neutral-900/10">
        {[
          { id: 'upload', label: 'حقن البيانات', color: 'text-[#00f3ff]', border: 'border-[#00f3ff]' },
          { id: 'settings', label: 'عقد الطاقة', color: 'text-[#ffea00]', border: 'border-[#ffea00]' },
          { id: 'list', label: 'أرشيف الفوكسل', color: 'text-[#00f3ff]', border: 'border-[#00f3ff]' },
          { id: 'debug', label: 'تحليل الأخطاء', color: 'text-[#bc00ff]', border: 'border-[#bc00ff]' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === tab.id ? `${tab.color} bg-white/5 border-b-2 ${tab.border} shadow-[0_5px_15px_rgba(0,0,0,0.5)]` : 'text-white/20 hover:text-white/60'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-32 scrollbar-hide">
        {activeTab === 'upload' && (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-video bg-[#050505] rounded-[2.5rem] border-2 border-dashed border-[#00f3ff]/30 flex items-center justify-center relative overflow-hidden group shadow-[0_0_40px_rgba(0,243,255,0.1)]">
                {previewUrl ? (
                  <video ref={videoRef} src={previewUrl} className="w-full h-full object-contain" controls />
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-6 text-white/30 hover:text-[#00f3ff] transition-all duration-500">
                    <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">تحميل الحمولة</span>
                    <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                  </label>
                )}
              </div>
              <div className="bg-black/60 p-6 rounded-[2.5rem] border border-white/10 flex flex-col shadow-2xl">
                <h3 className="text-[11px] font-black text-[#ffea00] mb-6 uppercase italic tracking-[0.2em]">سجل التحليل الحي</h3>
                <div className="flex-1 h-32 overflow-y-auto text-[10px] text-[#00f3ff]/80 font-mono space-y-2 leading-relaxed">
                  {aiLogs.map((log, i) => <div key={i} className="border-l-2 border-[#00f3ff]/20 pl-3">{" >> "} {log}</div>)}
                </div>
                {previewUrl && (
                  <button onClick={executeAiAnalysis} disabled={isAnalyzing} className="w-full bg-[#00f3ff]/10 py-4 rounded-2xl text-[10px] font-black mt-6 border-2 border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black transition-all">
                    {isAnalyzing ? 'جاري فك التشفير...' : 'تشغيل المحلل الذكي'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#050505]/80 p-10 rounded-[4rem] border border-white/10 space-y-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] text-[#00f3ff] pr-4 uppercase font-black tracking-widest">العنوان</label>
                  <input type="text" placeholder="العنوان..." value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="w-full bg-black border-2 border-white/10 p-5 rounded-[2rem] text-xs text-white outline-none focus:border-[#ffea00]" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-[#00f3ff] pr-4 uppercase font-black tracking-widest">القطاع</label>
                  <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="w-full bg-black border-2 border-white/10 p-5 rounded-[2rem] text-[11px] font-black text-[#ffea00] outline-none">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] text-[#00f3ff] pr-4 uppercase font-black tracking-widest">نوع الفيديو</label>
                 <div className="flex gap-4">
                   <button 
                     onClick={() => setVideoType('short')}
                     className={`flex-1 py-4 rounded-2xl font-black text-[10px] border-2 transition-all ${videoType === 'short' ? 'bg-[#00f3ff] text-black border-white shadow-[0_0_15px_#00f3ff]' : 'bg-black text-[#00f3ff] border-[#00f3ff]/30'}`}
                   >
                     فيديو قصير (Shorts)
                   </button>
                   <button 
                     onClick={() => setVideoType('long')}
                     className={`flex-1 py-4 rounded-2xl font-black text-[10px] border-2 transition-all ${videoType === 'long' ? 'bg-[#ffea00] text-black border-white shadow-[0_0_15px_#ffea00]' : 'bg-black text-[#ffea00] border-[#ffea00]/30'}`}
                   >
                     فيديو طويل (Long)
                   </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center px-4">
                    <label className="text-[10px] text-[#00f3ff] uppercase font-black tracking-widest">منطق السرد</label>
                    <button onClick={handleVoiceGeneration} disabled={isGeneratingVoice} className="text-[10px] text-[#ffea00] bg-[#ffea00]/10 px-5 py-2 rounded-xl border-2 border-[#ffea00]/30 font-black hover:bg-[#ffea00] hover:text-black transition-all">
                      توليد صوت
                    </button>
                 </div>
                 <textarea value={uploadNarration} onChange={e => setUploadNarration(e.target.value)} className="w-full bg-black border-2 border-white/10 p-6 rounded-[2.5rem] h-32 text-xs italic text-white/60 outline-none focus:border-[#00f3ff]" />
              </div>
              
              <button 
                onClick={handlePublish} disabled={!selectedFile || isUploading} 
                className={`w-full py-8 rounded-[3rem] font-black text-black text-xl shadow-[0_20px_60px_rgba(0,243,255,0.2)] transition-all ${!selectedFile || isUploading ? 'bg-neutral-900' : 'bg-[#00f3ff] border-2 border-white/20 hover:bg-[#ffea00] hover:text-black'}`}
              >
                {isUploading ? `جاري الحقن... (${uploadProgress}%)` : 'تنفيذ الرفع'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-xl font-black text-[#ffea00] italic flex items-center gap-4 uppercase">عقد شبكة الحديقة المرعبة</h2>
            {elevenKeys.map((key, index) => {
              const stats = keyStats[key];
              const remaining = stats ? stats.character_limit - stats.character_count : '...';
              return (
                <div key={index} className="bg-[#050505] p-8 rounded-[3rem] border border-white/10 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-[#00f3ff] uppercase">مفتاح الصوت الذكي {index + 1}</span>
                    <span className="text-[12px] font-black text-[#ffea00] italic">المتبقي: {remaining} حرف</span>
                  </div>
                  <input type="password" value={key} onChange={e => {
                    const n = [...elevenKeys]; n[index] = e.target.value; setElevenKeys(n);
                  }} className="w-full bg-black border-2 border-white/5 p-5 rounded-2xl text-[10px] text-white outline-none focus:border-[#ffea00]" />
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="max-w-2xl mx-auto space-y-6">
             <h3 className="text-lg font-black text-[#ffea00] italic px-4 uppercase tracking-widest">الأرشيف العصبي للحديقة ({vaultVideos.length})</h3>
             {vaultVideos.map(v => (
               <div key={v.id} className="bg-[#050505] p-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 shadow-xl group hover:border-[#00f3ff]/40 transition-all">
                  <div className="w-24 h-16 bg-black rounded-2xl overflow-hidden shrink-0 border border-white/5 relative">
                     <video src={v.video_url} className="w-full h-full object-cover opacity-30 group-hover:opacity-100" />
                  </div>
                  <div className="flex-1 overflow-hidden text-right">
                     <h4 className="text-[12px] font-black text-white truncate italic">{v.title}</h4>
                     <p className="text-[10px] text-[#00f3ff] font-black uppercase mt-1 tracking-widest">{v.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditVideo(v)} className="p-4 text-[#ffea00] bg-[#ffea00]/10 border border-[#ffea00]/20 rounded-2xl hover:bg-[#ffea00] hover:text-black transition-all shadow-lg font-black text-[11px]">
                       تعديل
                    </button>
                    <button className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-white shadow-lg text-[11px] font-black">
                       حذف
                    </button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="max-w-2xl mx-auto space-y-8">
             <div className="bg-[#00f3ff]/10 p-6 rounded-[2.5rem] border border-[#00f3ff]/30">
                <h3 className="text-[#ffea00] font-black text-sm mb-4 uppercase italic tracking-widest">سجل أخطاء الحديقة المرعبة</h3>
                <div className="h-32 overflow-y-auto bg-black/60 rounded-xl p-4 font-mono text-[10px] text-[#00f3ff] space-y-2">
                   {errors.length > 0 ? errors.map((err, i) => <div key={i}>{"> "} {err}</div>) : "بوابة الحديقة مستقرة بالكامل."}
                </div>
             </div>

             <div className="flex flex-col h-[50dvh] bg-black/90 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                   <div className="text-[10px] text-gray-500 font-black text-center uppercase tracking-widest">Horror Garden Debug Console</div>
                   {debugChat.map((msg, i) => (
                     <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-black ${msg.role === 'user' ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20' : 'bg-[#ffea00]/10 text-[#ffea00] border border-[#ffea00]/20'}`}>
                           {msg.text}
                        </div>
                     </div>
                   ))}
                </div>
                <div className="p-4 bg-black border-t border-white/10 flex gap-2">
                   <input 
                     type="text" value={debugInput} onChange={e => setDebugInput(e.target.value)}
                     placeholder="اسأل حارس الحديقة الذكي..." 
                     className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-[#00f3ff]"
                   />
                   <button onClick={handleTalkToGemini} className="px-6 bg-[#00f3ff] text-black rounded-2xl font-black text-xs hover:bg-[#ffea00] transition-colors uppercase">تحليل</button>
                </div>
             </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default AdminDashboard;
