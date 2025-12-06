
import React from 'react';
import { PlantType, LevelConfig, AnimationState } from '../types';
import { PLANT_STATS, MAX_DECK_SIZE } from '../constants';
import { t, Lang } from '../i18n';

interface GameHUDProps {
  sun: number;
  deck: PlantType[];
  selectedPlant: PlantType | null;
  isShovelActive: boolean;
  onSelectPlant: (plant: PlantType | null) => void;
  onToggleShovel: () => void;
  onMenuClick: () => void;
  levelConfig: LevelConfig;
  language: Lang;
  targetingPlantId: string | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  sun,
  deck,
  selectedPlant,
  isShovelActive,
  onSelectPlant,
  onToggleShovel,
  onMenuClick,
  levelConfig,
  language,
  targetingPlantId
}) => {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[1000] flex justify-center w-full pointer-events-none">
        <div className="pointer-events-auto bg-[#8d6e63] border-x-4 border-b-4 border-[#3e2723] rounded-b-xl px-4 py-2 shadow-2xl flex items-start gap-3 min-w-[700px] justify-center relative">
            
            {/* Sun Counter (Recessed) */}
            <div className="relative w-20 h-20 bg-[#3e2723] rounded-md border border-[#5d4037] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col items-center justify-end pb-2 mr-2">
                 <div className="absolute -top-4 text-5xl drop-shadow-md filter brightness-110 z-10 animate-spin-slow">☀️</div>
                 <div className="bg-[#fff3e0] border border-[#5d4037] px-1 py-0.5 rounded w-[80%] text-center z-10 shadow-sm">
                     <span className="text-black font-mono font-bold text-sm">{Math.floor(sun)}</span>
                 </div>
            </div>

            {/* Seed Slots Container */}
            <div className="flex gap-1 overflow-x-visible">
                 {deck.map(type => {
                     const config = PLANT_STATS[type];
                     const canAfford = sun >= config.cost;
                     
                     const idleAnim = (config.visuals?.['idle'] || config.visuals?.['walk']) as AnimationState | undefined;
                     const pixelFrame = idleAnim?.frames?.[0];
                     
                     return (
                         <div 
                            key={type}
                            onClick={() => { if(canAfford) { onSelectPlant(type); } }}
                            className={`
                                relative w-14 h-20 bg-[#fff3e0] rounded-sm border flex flex-col items-center cursor-pointer transition-transform group overflow-hidden
                                ${selectedPlant === type ? 'border-green-600 ring-2 ring-green-400 z-10 scale-105' : 'border-[#5d4037] hover:brightness-110'}
                                ${!canAfford ? 'filter grayscale brightness-75' : ''}
                            `}
                         >
                             <div className="flex-1 w-full h-full flex items-center justify-center pb-4 pt-1 px-1">
                                 {pixelFrame ? (
                                     <img 
                                        src={pixelFrame} 
                                        alt={config.name} 
                                        className="w-full h-full object-contain image-pixelated drop-shadow-sm" 
                                     />
                                 ) : (
                                     <span className="text-3xl">{config.icon}</span>
                                 )}
                             </div>
                             <div className="absolute bottom-0 w-full bg-[#ffe0b2] border-t border-[#5d4037] text-[10px] font-bold text-[#3e2723] text-center font-mono leading-tight py-0.5">
                                 {config.cost}
                             </div>
                             {!canAfford && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}
                         </div>
                     );
                 })}
                 
                 {/* Empty Slots Filler */}
                 {Array.from({ length: Math.max(0, (levelConfig.seedSlots || MAX_DECK_SIZE) - deck.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-14 h-20 bg-[#5d4037]/30 rounded-sm border border-[#5d4037]/50 shadow-inner" />
                 ))}
            </div>
            
            {/* Shovel Slot */}
            <div 
               onClick={onToggleShovel}
               className={`
                   w-16 h-16 ml-2 bg-[#3e2723] rounded border-2 border-[#5d4037] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer transition-all group
                   ${isShovelActive ? '-translate-y-2 ring-2 ring-yellow-400' : 'hover:bg-[#4e342e]'}
               `}
               title="Shovel"
            >
                <span className={`text-4xl filter drop-shadow-md transition-transform ${isShovelActive ? '-rotate-45 scale-110' : 'group-hover:-rotate-12'}`}>🥄</span>
            </div>

            {/* Menu Button */}
            <button 
                onClick={onMenuClick} 
                className="absolute top-2 right-[-140px] bg-[#7b1fa2] border-[3px] border-[#4a148c] text-white font-pixel text-xs px-4 py-2 rounded-lg shadow-[0_4px_0_#4a148c] hover:bg-[#8e24aa] hover:-translate-y-0.5 active:shadow-none active:translate-y-1 transition-all pointer-events-auto"
            >
                {t('MENU_BTN', language)}
            </button>
        </div>
    </div>
  );
};
