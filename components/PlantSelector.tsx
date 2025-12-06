
import React from 'react';
import { PlantType, LevelConfig, LevelScene, AnimationState } from '../types';
import { PLANT_STATS, ZOMBIE_STATS, MAX_DECK_SIZE } from '../constants';
import { t, tEntity, Lang } from '../i18n';

interface PlantSelectorProps {
  selectedPlants: PlantType[];
  onTogglePlant: (plant: PlantType) => void;
  onStartGame: () => void;
  onBack: () => void;
  levelConfig: LevelConfig;
  unlockedPlants: PlantType[]; // PASSED FROM APP
  isEndless?: boolean; // New Prop
  onSaveAndQuit?: () => void; // New Prop
  language: Lang;
}

export const PlantSelector: React.FC<PlantSelectorProps> = ({ selectedPlants, onTogglePlant, onStartGame, onBack, levelConfig, unlockedPlants, isEndless, onSaveAndQuit, language }) => {
  const allPlants = Object.values(PLANT_STATS);
  const maxSeeds = levelConfig.seedSlots || MAX_DECK_SIZE;

  // Get unique Zombies for display with fallback
  const levelZombies = Array.from(new Set(levelConfig.enabledZombies || [])) as string[];

  return (
    <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="w-[95%] h-full max-h-[90%] bg-yellow-900/20 rounded-xl border-4 border-yellow-900/50 p-6 shadow-2xl backdrop-blur-sm flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-center shrink-0">
             <div className="flex items-center gap-4">
                 <button onClick={onBack} className="bg-slate-700 hover:bg-slate-600 text-white font-pixel px-4 py-2 rounded border-2 border-slate-500 shadow-md transition-transform hover:scale-105 active:scale-95">
                     &lt; {t('BACK', language)}
                 </button>
                 <h2 className="text-3xl text-yellow-100 font-pixel drop-shadow-md">{t('CHOOSE_SEEDS', language)}</h2>
             </div>
             <div className="text-right">
                 <div className="text-yellow-400 font-pixel text-xs mb-1">{t('SELECTED', language)}</div>
                 <div className={`text-xl font-bold font-pixel ${selectedPlants.length === maxSeeds ? 'text-red-400' : 'text-green-400'}`}>
                   {selectedPlants.length} / {maxSeeds}
                 </div>
             </div>
        </div>

        {/* Selected Bar */}
        <div className="h-24 bg-slate-800 rounded-lg border-2 border-slate-600 flex items-center px-2 gap-2 overflow-hidden shadow-inner justify-center shrink-0">
           {selectedPlants.map(type => (
             <div 
               key={type} 
               onClick={() => onTogglePlant(type)}
               className="w-16 h-20 bg-green-900/80 border-2 border-green-500 rounded cursor-pointer hover:bg-red-900/50 flex flex-col items-center justify-center group shrink-0"
             >
                <span className="text-3xl group-hover:scale-90 transition-transform">{PLANT_STATS[type].icon}</span>
                <span className="text-[10px] text-green-100 mt-1 font-pixel">{PLANT_STATS[type].cost}</span>
             </div>
           ))}
           {Array.from({ length: Math.max(0, maxSeeds - selectedPlants.length) }).map((_, i) => (
             <div key={`empty-${i}`} className="w-16 h-20 bg-black/20 border-2 border-dashed border-slate-700 rounded shrink-0" />
           ))}
        </div>

        {/* Main Content Area: Split View */}
        <div className="flex gap-6 flex-1 min-h-0">
            
            {/* Left: Plant Repository */}
            <div className="flex-1 bg-amber-100/10 rounded-lg p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900 scrollbar-track-transparent">
               <div className="flex flex-wrap gap-2 justify-center">
                  {allPlants.map(plant => {
                    const isUnlocked = unlockedPlants.includes(plant.type);
                    const isSelected = selectedPlants.includes(plant.type);
                    
                    return (
                      <div
                        key={plant.type}
                        onClick={() => isUnlocked ? onTogglePlant(plant.type) : null}
                        className={`
                          relative w-20 h-24 rounded border-2 flex flex-col items-center justify-center transition-all duration-100 shrink-0
                          ${!isUnlocked 
                             ? 'bg-black border-slate-800 opacity-60 cursor-not-allowed' 
                             : isSelected 
                                ? 'bg-slate-700 border-slate-600 opacity-50 grayscale cursor-pointer' 
                                : 'bg-slate-800 border-amber-700 hover:bg-slate-700 hover:border-amber-500 hover:scale-105 cursor-pointer'
                          }
                        `}
                      >
                         {!isUnlocked ? (
                            <>
                                <span className="text-4xl mb-1 drop-shadow-lg brightness-0 opacity-50">{plant.icon}</span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl">🔒</span>
                                </div>
                            </>
                         ) : (
                            <>
                                <span className="text-4xl mb-1 drop-shadow-lg">{plant.icon}</span>
                                <span className="text-xs text-amber-100 font-bold font-pixel">{plant.cost}</span>
                                {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                                    <span className="text-green-400 font-bold text-xl">✓</span>
                                </div>
                                )}
                            </>
                         )}
                         {/* Optional Name Tooltip Logic Could Go Here */}
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Right: Level Info */}
            <div className="w-64 bg-slate-900/80 rounded-lg border-2 border-slate-600 p-4 flex flex-col shrink-0">
                <div className="text-center border-b border-slate-700 pb-2 mb-4">
                    <h3 className="text-blue-300 font-pixel text-sm">{t('LEVEL_INFO', language)}</h3>
                    <div className="text-white font-bold text-lg mt-1">{levelConfig.name}</div>
                    <div className="text-slate-400 text-xs font-mono mt-1">{t(levelConfig.scene, language)}</div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <h4 className="text-red-400 font-pixel text-xs mb-2 text-center">{t('ZOMBIES_DETECTED', language)}</h4>
                    <div className="flex-1 overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-2">
                             {levelZombies.map(zId => {
                                 // Safety check: ensure stats exist for this ID (in case DLC was unloaded)
                                 const stats = ZOMBIE_STATS[zId];
                                 if (!stats) return null;
                                 
                                 // Try to use pixel art first
                                 const idleAnim = stats.visuals?.['idle'] as AnimationState | undefined;
                                 const frame = idleAnim?.frames?.[0];
                                 
                                 return (
                                     <div key={zId} className="bg-slate-800 border border-slate-700 rounded p-2 flex flex-col items-center justify-center hover:bg-slate-700 transition-colors" title={tEntity(zId, zId, language)}>
                                         <div className="w-12 h-12 flex items-center justify-center mb-1 overflow-hidden">
                                             {frame ? (
                                                 <img src={frame} className="w-full h-full object-contain image-pixelated" alt={zId} />
                                             ) : (
                                                 <span className="text-3xl">{stats.icon}</span>
                                             )}
                                         </div>
                                     </div>
                                 )
                             })}
                             {levelZombies.length === 0 && (
                                 <div className="col-span-2 text-slate-500 text-xs text-center italic mt-4">
                                     None detected
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {isEndless && onSaveAndQuit && (
                     <button 
                        onClick={onSaveAndQuit} 
                        className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded font-pixel text-xs shadow-lg border-b-4 border-purple-800 active:border-b-0 active:translate-y-1"
                     >
                        💾 {t('SAVE_QUIT', language)}
                     </button>
                )}
            </div>
        </div>

        <div className="flex justify-center shrink-0">
          <button
            onClick={onStartGame}
            disabled={selectedPlants.length === 0}
            className={`
              px-16 py-4 font-pixel text-2xl rounded shadow-xl transition-all
              ${selectedPlants.length > 0 
                ? 'bg-red-600 text-white hover:bg-red-500 hover:scale-105 hover:shadow-red-900/50' 
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {t('LETS_ROCK', language)}
          </button>
        </div>

      </div>
    </div>
  );
};
