
import React, { useState, useEffect } from 'react';
import { LEVELS } from '../constants';
import { LevelConfig } from '../types';
import { AVAILABLE_DLCS } from '../dlc';
import { t, Lang } from '../i18n';

interface LevelSelectorProps {
  onSelectLevel: (level: LevelConfig) => void;
  onBack: () => void;
  language: Lang;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelectLevel, onBack, language }) => {
  const [activeTab, setActiveTab] = useState<string>('ADVENTURE');

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // 1. Identify Levels currently loaded in the game
  // Adventure: IDs < 100 (Classic campaign)
  const adventureLevels = LEVELS.filter(l => l.id < 100);

  // 2. Identify active DLCs (only show tabs for DLCs that have levels currently loaded in LEVELS)
  // We match levels by ID to ensure they are actually enabled/loaded.
  const activeDlcTabs = AVAILABLE_DLCS.filter(dlc => {
      if (!dlc.levels || dlc.levels.length === 0) return false;
      // Check if any level from this DLC is present in the global LEVELS list
      return dlc.levels.some(dlcLevel => LEVELS.some(l => l.id === dlcLevel.id));
  });

  // 3. Collect IDs of all DLC levels to separate them from generic "Custom" levels
  const dlcLevelIds = new Set<number>();
  activeDlcTabs.forEach(dlc => dlc.levels?.forEach(l => dlcLevelIds.add(l.id)));

  // 4. Custom Levels: IDs >= 100 that are NOT part of any known DLC
  const customLevels = LEVELS.filter(l => l.id >= 100 && !dlcLevelIds.has(l.id));

  // Determine levels to display based on active tab
  let displayLevels: LevelConfig[] = [];
  let currentDlcPrefix = '';

  if (activeTab === 'ADVENTURE') {
      displayLevels = adventureLevels;
  } else if (activeTab === 'CUSTOM') {
      displayLevels = customLevels;
  } else {
      // It's a DLC ID
      const dlc = activeDlcTabs.find(d => d.id === activeTab);
      if (dlc) {
          // Filter global LEVELS to ensure we only show active ones, but match against DLC definition
          displayLevels = LEVELS.filter(l => dlc.levels?.some(dlLevel => dlLevel.id === l.id));
          // Create a short prefix from DLC Name (e.g. "Neon City" -> "[Neon]")
          currentDlcPrefix = `[${dlc.name.split(' ')[0]}] `;
      }
  }

  // Sort levels by ID to keep them in order
  displayLevels.sort((a, b) => a.id - b.id);

  return (
    <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col items-center justify-center p-8">
       {/* Changed h-[85vh] to h-[90%] to fit within the scaled STAGE_HEIGHT correctly */}
       <div className="w-[950px] h-[90%] bg-slate-800 rounded-xl border-4 border-slate-600 p-6 shadow-2xl relative flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4 relative z-50">
              <h2 className="text-2xl font-pixel text-white drop-shadow-md">{t('SELECT_LEVEL', language)}</h2>
              <button 
                  onClick={onBack} 
                  className="text-slate-400 hover:text-white font-bold text-2xl w-10 h-10 flex items-center justify-center bg-slate-700/50 hover:bg-slate-600 rounded-full transition-colors cursor-pointer"
                  title={t('BACK', language)}
              >
                  ✕
              </button>
          </div>

          {/* Horizontal Scrollable Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-slate-600 border-b border-slate-700 shrink-0">
              {/* Adventure Tab */}
              <button 
                onClick={() => setActiveTab('ADVENTURE')}
                className={`px-6 py-2 font-pixel text-sm rounded-t-lg border-b-4 transition-all whitespace-nowrap shrink-0 ${activeTab === 'ADVENTURE' ? 'text-green-400 border-green-500 bg-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-700/50'}`}
              >
                  {t('ADVENTURE', language)}
              </button>

              {/* DLC Tabs */}
              {activeDlcTabs.map(dlc => (
                  <button 
                    key={dlc.id}
                    onClick={() => setActiveTab(dlc.id)}
                    className={`px-6 py-2 font-pixel text-sm rounded-t-lg border-b-4 transition-all whitespace-nowrap shrink-0 ${activeTab === dlc.id ? 'text-purple-400 border-purple-500 bg-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-700/50'}`}
                  >
                      {dlc.name.toUpperCase()}
                  </button>
              ))}

              {/* Custom Tab (Only show if there are custom levels) */}
              {customLevels.length > 0 && (
                  <button 
                    onClick={() => setActiveTab('CUSTOM')}
                    className={`px-6 py-2 font-pixel text-sm rounded-t-lg border-b-4 transition-all whitespace-nowrap shrink-0 ${activeTab === 'CUSTOM' ? 'text-blue-400 border-blue-500 bg-slate-700' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-700/50'}`}
                  >
                      {t('CUSTOM', language)}
                  </button>
              )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-slate-900/30 rounded-lg border border-slate-700 p-4 min-h-0">
              {displayLevels.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 font-pixel opacity-50">
                      <div className="text-6xl mb-4">📭</div>
                      <div>{t('NO_LEVELS', language)}</div>
                  </div>
              ) : (
                  <div className="grid grid-cols-3 gap-6">
                      {displayLevels.map((level) => (
                          <button
                            key={level.id}
                            onClick={() => onSelectLevel(level)}
                            className={`group relative border-2 rounded-lg p-6 flex flex-col items-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl overflow-hidden
                                ${activeTab === 'ADVENTURE' ? 'bg-slate-700 hover:bg-green-900/40 border-slate-500 hover:border-green-400' : 'bg-slate-700 hover:bg-purple-900/40 border-slate-500 hover:border-purple-400'}
                            `}
                          >
                              {/* Level Preview / Icon */}
                              <div className="mb-3 text-4xl opacity-80 group-hover:scale-110 transition-transform filter drop-shadow-lg">
                                  {activeTab === 'ADVENTURE' ? '🧟' : '📦'} 
                              </div>
                              
                              <h3 className="font-pixel text-white text-md text-center mb-1 leading-tight">
                                  {/* Add Prefix for DLCs */}
                                  {currentDlcPrefix && <span className="text-slate-400 text-xs block mb-1">{currentDlcPrefix}</span>}
                                  {level.name}
                              </h3>
                              
                              <div className="text-[10px] text-slate-400 group-hover:text-white font-mono flex flex-col items-center mt-2 gap-1">
                                  <span className="bg-black/30 px-2 py-0.5 rounded">WAVES: {level.totalWaves || (level.waves?.length || 0)}</span>
                                  <span className="opacity-60">ZOMBIE TYPES: {level.enabledZombies.length}</span>
                              </div>

                              {/* Difficulty Stars */}
                              <div className="flex mt-3 gap-0.5 h-4">
                                  {Array.from({length: Math.min(10, level.difficulty || 1)}).map((_, i) => (
                                      <span key={i} className="text-yellow-400 text-[8px]">⭐</span>
                                  ))}
                              </div>
                              
                              {/* Reward Icon Mini */}
                              {level.unlocksPlant && (
                                  <div className="absolute top-2 right-2 text-xs" title="Unlocks Plant">🎁</div>
                              )}
                          </button>
                      ))}
                  </div>
              )}
          </div>

          <div className="mt-4 flex justify-center relative z-50">
             <button 
                onClick={onBack}
                className="px-10 py-3 bg-slate-700 hover:bg-slate-600 text-white font-pixel text-sm rounded shadow-lg border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all cursor-pointer"
             >
                 &lt; {t('BACK', language)}
             </button>
          </div>
       </div>
    </div>
  );
};
