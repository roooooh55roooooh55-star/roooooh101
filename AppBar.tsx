
import React from 'react';
import { AppView } from './types';
import { LOGO_URL } from './MainContent';

interface AppBarProps {
  onViewChange: (view: AppView) => void;
  onRefresh: () => void;
  currentView: AppView;
}

const AppBar: React.FC<AppBarProps> = ({ onViewChange, onRefresh, currentView }) => {
  const channelId = 'UCDc_3d066uDWC3ljZTccKUg';
  const youtubeWebUrl = `https://www.youtube.com/channel/${channelId}?si=spOUUwvDeudYtwEr`;

  const getBtnClass = (view: AppView, defaultColor: string, glowColor: string) => {
    const isActive = currentView === view;
    const isSaveBtn = view === AppView.SAVED;
    const activeColor = isSaveBtn ? 'text-[#ffea00]' : defaultColor;
    const activeGlow = isSaveBtn ? '#ffea00' : glowColor;

    return `w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 active:scale-90 ${
      isActive 
      ? `bg-black/90 ${activeColor} border-current scale-110 z-20 shadow-[0_0_35px_${activeGlow}] ring-2 ring-white/10` 
      : `bg-white/5 border-white/10 ${isSaveBtn ? 'text-[#ffea00]' : defaultColor} opacity-50`
    } hover:opacity-100`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-black/95 backdrop-blur-3xl z-[150] border-b border-white/10 px-4 flex items-center justify-around shadow-[0_10px_40px_rgba(0,0,0,0.9)]">
      
      <div className="flex items-center gap-3">
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
      </div>

      <button 
        onClick={() => { onViewChange(AppView.HOME); onRefresh(); }}
        className="relative group active:scale-90 transition-all duration-700 mx-4"
      >
        <div className="absolute inset-0 bg-[#ff003c] rounded-full blur-2xl opacity-40 group-hover:opacity-100 transition-opacity"></div>
        <img src={LOGO_URL} className="w-14 h-14 rounded-full border-2 border-[#ff003c]/40 relative z-10 shadow-[0_0_20px_rgba(255,0,60,0.5)] group-hover:border-[#ff003c] group-hover:shadow-[0_0_30px_#ff003c]" alt="Logo" />
      </button>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => onViewChange(AppView.SAVED)}
          className={getBtnClass(AppView.SAVED, 'text-[#ffea00]', '#ffea00')}
          title="SAVED"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
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
