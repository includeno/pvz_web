
import React from 'react';
import { AppSettings } from '../types';
import { t } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;
  const lang = settings.language || 'en';

  const handleVolumeChange = (type: 'musicVolume' | 'sfxVolume', val: string) => {
      const num = parseFloat(val);
      onUpdateSettings({
          ...settings,
          [type]: num
      });
  };

  const handleSpeedChange = (val: string) => {
      onUpdateSettings({
          ...settings,
          gameSpeed: parseFloat(val)
      });
  };

  const handleLanguageChange = (newLang: 'en' | 'zh') => {
      onUpdateSettings({
          ...settings,
          language: newLang
      });
  };

  return (
    <div className="absolute inset-0 z-[2100] bg-black/80 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-slate-800 border-4 border-slate-600 rounded-xl p-8 w-[500px] shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl text-yellow-400 font-pixel drop-shadow-md">{t('SETTINGS_TITLE', lang)}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
        </div>

        <div className="space-y-6">
           {/* Language Selector */}
           <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
               <div className="flex justify-between mb-2">
                   <span className="text-white font-pixel text-sm">{t('LANGUAGE', lang)}</span>
                   <span className="text-purple-400 font-pixel text-sm">{lang === 'en' ? 'ENGLISH' : '中文'}</span>
               </div>
               <div className="flex gap-2">
                   <button 
                     onClick={() => handleLanguageChange('en')}
                     className={`flex-1 py-2 font-pixel text-xs rounded border-2 transition-colors ${lang === 'en' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                   >
                       ENGLISH
                   </button>
                   <button 
                     onClick={() => handleLanguageChange('zh')}
                     className={`flex-1 py-2 font-pixel text-xs rounded border-2 transition-colors ${lang === 'zh' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                   >
                       中文
                   </button>
               </div>
           </div>

           {/* Music Volume */}
           <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
               <div className="flex justify-between mb-2">
                   <span className="text-white font-pixel text-sm">{t('MUSIC_VOLUME', lang)}</span>
                   <span className="text-yellow-400 font-pixel text-sm">{Math.round(settings.musicVolume * 100)}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" max="1" step="0.05"
                 value={settings.musicVolume}
                 onChange={(e) => handleVolumeChange('musicVolume', e.target.value)}
                 className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-green-500"
               />
           </div>

           {/* SFX Volume */}
           <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
               <div className="flex justify-between mb-2">
                   <span className="text-white font-pixel text-sm">{t('SFX_VOLUME', lang)}</span>
                   <span className="text-yellow-400 font-pixel text-sm">{Math.round(settings.sfxVolume * 100)}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" max="1" step="0.05"
                 value={settings.sfxVolume}
                 onChange={(e) => handleVolumeChange('sfxVolume', e.target.value)}
                 className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
               />
           </div>

           {/* Game Speed */}
           <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
               <div className="flex justify-between mb-2">
                   <span className="text-white font-pixel text-sm">{t('GAME_SPEED', lang)}</span>
                   <span className="text-blue-400 font-pixel text-sm">{settings.gameSpeed.toFixed(1)}x</span>
               </div>
               <input 
                 type="range" 
                 min="0.5" max="3.0" step="0.1"
                 value={settings.gameSpeed}
                 onChange={(e) => handleSpeedChange(e.target.value)}
                 className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
               />
               <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                   <span>{t('SLOW', lang)}</span>
                   <span>{t('NORMAL', lang)}</span>
                   <span>{t('FAST', lang)}</span>
               </div>
           </div>
           
           <div className="text-center text-slate-500 text-xs font-pixel mt-4">
               {t('SETTINGS_FOOTER', lang)}
           </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-pixel rounded shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
