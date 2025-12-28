
import React from 'react';
import { AppView } from './types';
// Import LOGO_URL from MainContent to fix the reference error
import { LOGO_URL } from './MainContent';

interface AppBarProps {
  onViewChange: (view: AppView) => void;
  onRefresh: () => void;
  currentView: AppView;
}

const AppBar: React.FC<AppBarProps> = ({ onViewChange, onRefresh, currentView }) => {
  const channelId = 'UCDc_3d066uDWC3ljZTccKUg';
  const youtubeWebUrl = `https://www.youtube.com/channel/${channelId}?si=spOUUwvDeudYtwEr`;

  const getBtnClass = (view: AppView, colorClass: string, glowColor: string) => {
    const isActive = currentView === view;
    return `w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 border-2 active:scale-95 ${
      isActive 
      ? `bg-black/80 ${colorClass} border-current scale-110 z-20 shadow-[0_0_30px_${glowColor}]` 
      : `bg-white/5 border-white/10 ${colorClass} opacity-60`
    } hover:shadow-[0_0_20px_${glowColor}] hover:opacity-100`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-black/90 backdrop-blur-3xl z-[100] border-b border-white/10 px-6 flex items-center justify-between shadow-[0_10px_40px_black]">
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onViewChange(AppView.TREND)}
          className={getBtnClass(AppView.TREND, 'text-[#ff003c]', '#ff003c')}
          title="TRENDS"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.55,11.2C17.32,10.93 15.33,8.19 15.33,8.19C15.33,8.19 15.1,10.03 14.19,10.82C13.21,11.66 12,12.24 12,13.91C12,15.12 12.6,16.22 13.56,16.89C13.88,17.11 14.24,17.29 14.63,17.41C15.4,17.63 16.23,17.61 17,17.33C17.65,17.1 18.23,16.69 18.66,16.15C19.26,15.38 19.5,14.41 19.34,13.44C19.16,12.56 18.63,11.83 18.05,11.33C17.9,11.23 17.73,11.25 17.55,11.2M13,3C13,3 12,5 10,7C8.5,8.5 7,10 7,13C7,15.76 9.24,18 12,18C12,18 11.5,17.5 11,16.5C10.5,15.5 10,14.5 10,13.5C10,12.5 10.5,11.5 11.5,10.5C12.5,9.5 14,8 14,8C14,8 15,10 16,12C16.5,13 17,14 17,15C17,15.5 16.9,16 16.75,16.5C17.5,16 18,15.5 18,15C18,13 17,11.5 15,10C13.5,8.88 13,3 13,3Z"/></svg>
        </button>

        <button 
          onClick={() => onViewChange(AppView.LIKES)}
          className={getBtnClass(AppView.LIKES, 'text-[#bc00ff]', '#bc00ff')}
          title="LIKES"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
        </button>

        <button 
          onClick={() => onViewChange(AppView.HIDDEN)}
          className={getBtnClass(AppView.HIDDEN, 'text-[#ffea00]', '#ffea00')}
          title="EXCLUDED"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L4.64 4.64m10.95 10.95l5.24 5.24"/></svg>
        </button>
      </div>

      <button 
        onClick={() => { onViewChange(AppView.HOME); onRefresh(); }}
        className="relative group active:scale-90 transition-all duration-700"
      >
        <div className="absolute inset-0 bg-[#ff003c] rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity"></div>
        <img src={LOGO_URL} className="w-16 h-16 rounded-full border-2 border-white/20 relative z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover:border-[#ff003c]" alt="Logo" />
      </button>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => onViewChange(AppView.SAVED)}
          className={getBtnClass(AppView.SAVED, 'text-[#39ff14]', '#39ff14')}
          title="SAVED"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </button>

        <button 
          onClick={() => window.open(youtubeWebUrl, '_blank')}
          className="w-12 h-12 rounded-[1.2rem] bg-white/5 border-2 border-white/10 flex items-center justify-center text-[#ff003c] hover:shadow-[0_0_25px_#ff003c] transition-all"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z"/></svg>
        </button>

        <button 
          onClick={() => onViewChange(AppView.PRIVACY)}
          className={getBtnClass(AppView.PRIVACY, 'text-[#00f3ff]', '#00f3ff')}
          title="PRIVACY"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04"/></svg>
        </button>
      </div>
    </header>
  );
};

export default AppBar;
