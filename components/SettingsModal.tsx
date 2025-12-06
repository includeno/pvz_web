
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
               </div>
               <select
                   value={lang}
                   onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'zh')}
                   className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-3 text-white font-pixel text-sm focus:outline-none focus:border-green-500 appearance-none cursor-pointer"
                   style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto' }}
               >
                   <option value="en">🇺🇸 ENGLISH</option>
                   <option value="zh">🇨🇳 简体中文</option>
               </select>
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
