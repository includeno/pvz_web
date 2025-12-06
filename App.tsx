
import React, { useState, useEffect, useRef } from 'react';
import {
  PlantType,
  LevelConfig,
  GamePhase,
  DLCManifest,
  LevelScene,
  AppSettings,
  BasePlantType,
  EndlessSaveSlot
} from './types';
import {
  PLANT_STATS,
  ZOMBIE_STATS,
  LEVELS,
  RESTORE_CONSTANTS,
  MAX_DECK_SIZE
} from './constants';
import { EntitiesLayer } from './components/EntitiesLayer';
import { PlantSelector } from './components/PlantSelector';
import { LevelSelector } from './components/LevelSelector';
import { SettingsModal } from './components/SettingsModal';
import { LevelEditor } from './components/LevelEditor';
import { BaseEditor } from './components/BaseEditor';
import { DLCManager } from './components/DLCManager';
import { EndlessModeSelector } from './components/EndlessModeSelector';
import { EndlessShop } from './components/EndlessShop';
import { GameHUD } from './components/GameHUD';
import { GameGrid } from './components/GameGrid';
import { useGameLogic } from './hooks/useGameLogic';
import { reloadDLCs, AVAILABLE_DLCS, initDLCs } from './dlc';
import { t } from './i18n';

const STAGE_WIDTH = 1050;
const STAGE_HEIGHT = 700; 

const App: React.FC = () => {
  const [enabledDLCs, setEnabledDLCs] = useState<string[]>([]);
  const [unlockedPlants, setUnlockedPlants] = useState<PlantType[]>(Object.values(BasePlantType));
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- UI & HIGH LEVEL STATE ---
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.MENU);
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [deck, setDeck] = useState<PlantType[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [isShovelActive, setShovelActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDLCManager, setShowDLCManager] = useState(false);
  const [isPaused, setPaused] = useState(false);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
      musicVolume: 0.5, sfxVolume: 0.8, gameSpeed: 1.0, language: 'zh'
  });
  const lang = appSettings.language;

  const [endlessState, setEndlessState] = useState<{
      active: boolean; slotId: number | null; floor: number; inventory: Record<string, number>;
  }>({ active: false, slotId: null, floor: 1, inventory: {} });

  // --- INITIALIZATION ---
  useEffect(() => {
    const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scaleX = w / STAGE_WIDTH;
        const scaleY = h / STAGE_HEIGHT;
        setScale(Math.min(scaleX, scaleY) * 0.95);
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 10);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { 
      // Initialize Custom DLCs from Storage
      initDLCs();

      const allDlcIds = AVAILABLE_DLCS.map(d => d.id);
      setEnabledDLCs(allDlcIds);
      reloadDLCs(allDlcIds);

      const basePlants = Object.values(BasePlantType);
      const dlcPlants = allDlcIds.flatMap(id => {
          const dlc = AVAILABLE_DLCS.find(d => d.id === id);
          return dlc?.plants?.map(p => p.type) || [];
      });
      setUnlockedPlants(Array.from(new Set([...basePlants, ...dlcPlants])));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gamePhase === GamePhase.PLAYING) {
             if (engine.stateRef.current.targetingPlantId) {
                 engine.stateRef.current.targetingPlantId = null;
                 engine.setDragOverCell(null); 
                 return;
             }
             if (showSettings) setShowSettings(false);
             else setPaused(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gamePhase, showSettings]);

  // --- ENDLESS HELPERS ---
  const generateEndlessLevel = (floor: number): LevelConfig => {
      const scenes = Object.values(LevelScene);
      const scene = scenes[(floor - 1) % scenes.length];
      const waves = Math.min(20, 5 + Math.floor(floor / 2));
      const zombies = Object.keys(ZOMBIE_STATS) as string[]; // Cast to generic string to allow zombies
      const numTypes = Math.min(zombies.length, 3 + Math.floor(floor / 3));
      const enabledZombies: string[] = [];
      while(enabledZombies.length < numTypes) {
          const z = zombies[Math.floor(Math.random() * zombies.length)];
          if(!enabledZombies.includes(z)) enabledZombies.push(z);
      }
      return {
          id: 9000 + floor,
          name: `${t('FLOOR', lang)} ${floor}`,
          mode: 'CLASSIC',
          scene,
          totalWaves: waves,
          startingSun: 500 + (Math.min(10, floor) * 50),
          enabledZombies: enabledZombies as any,
          spawnIntervalMultiplier: Math.max(0.2, 1.2 - (floor * 0.05)),
          difficulty: Math.min(10, Math.ceil(floor / 5)),
          seedSlots: 10
      };
  };

  const saveEndlessProgress = () => {
      if (!endlessState.active || endlessState.slotId === null) return;
      const stored = localStorage.getItem('pvz_endless_saves');
      let saves: EndlessSaveSlot[] = stored ? JSON.parse(stored) : [];
      const idx = saves.findIndex(s => s.id === endlessState.slotId);
      const currentGridSnapshot = engine.stateRef.current.grid.map(row => row.map(plant => plant ? { ...plant, createdAt: plant.createdAt - engine.stateRef.current.time, lastActionTime: plant.lastActionTime - engine.stateRef.current.time } : null));
      const currentSunSnapshot = engine.stateRef.current.suns.map(s => ({ ...s, createdAt: s.createdAt - engine.stateRef.current.time }));
      if (idx > -1) {
          saves[idx].floor = endlessState.floor;
          saves[idx].score = engine.stateRef.current.score;
          saves[idx].inventory = endlessState.inventory;
          saves[idx].timestamp = Date.now();
          saves[idx].gridSnapshot = currentGridSnapshot;
          saves[idx].sunSnapshot = currentSunSnapshot;
      }
      localStorage.setItem('pvz_endless_saves', JSON.stringify(saves));
  };

  const handleEndlessVictory = () => {
      const nextFloor = endlessState.floor + 1;
      setEndlessState(prev => ({ ...prev, floor: nextFloor }));
      setTimeout(() => saveEndlessProgress(), 100);
      
      // Clear victory flag so it doesn't persist
      engine.setUiState(prev => ({ ...prev, victory: false }));

      if (nextFloor % 5 === 0) {
          setGamePhase(GamePhase.ENDLESS_SHOP);
      } else {
          const level = generateEndlessLevel(nextFloor);
          engine.resetGame(level, { keepProgress: true });
          setGamePhase(GamePhase.SELECTION);
      }
  };

  // --- GAME ENGINE HOOK ---
  const engine = useGameLogic({
      gamePhase,
      currentLevel,
      appSettings,
      isPaused,
      endlessState,
      unlockedPlants,
      setUnlockedPlants,
      setGamePhase,
      onEndlessVictory: handleEndlessVictory
  });

  // --- HANDLERS ---
  const startGame = (level: LevelConfig, fromSave?: EndlessSaveSlot) => {
      setCurrentLevel(level);
      setAppSettings(prev => ({ ...prev, gameSpeed: 1.0 }));
      engine.resetGame(level, { fromSave });
      setDeck([]);
      setSelectedPlant(null);
      setShovelActive(false);
      setPaused(false);
      
      if (endlessState.active && fromSave) {
          setGamePhase(GamePhase.SELECTION);
      } else if (endlessState.active) {
          // New game or next floor
          setGamePhase(GamePhase.SELECTION);
      } else {
          // Classic
          setGamePhase(GamePhase.SELECTION);
      }
  };

  const handleStartEndless = (save: EndlessSaveSlot) => {
      RESTORE_CONSTANTS();
      Object.assign(PLANT_STATS, save.statsSnapshot.plants);
      Object.assign(ZOMBIE_STATS, save.statsSnapshot.zombies);
      setEndlessState({ active: true, slotId: save.id, floor: save.floor, inventory: save.inventory });
      const level = generateEndlessLevel(save.floor);
      startGame(level, save);
  };

  const handleSaveAndQuit = () => { saveEndlessProgress(); setGamePhase(GamePhase.MENU); engine.restoreState(); setEndlessState(prev => ({...prev, active: false})); };

  const handleUseConsumable = (type: string) => {
     if (!endlessState.inventory[type] || endlessState.inventory[type] <= 0) return;
     engine.handleUseConsumable(type as any);
     setEndlessState(prev => ({ ...prev, inventory: { ...prev.inventory, [type]: prev.inventory[type] - 1 } }));
  };

  return (
    <div ref={containerRef} className="w-full h-screen bg-black flex items-center justify-center overflow-hidden font-pixel text-white select-none">
       <div 
          className="relative bg-slate-900 shadow-2xl overflow-hidden"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
       >
           {/* BACKGROUND */}
           <div className={`absolute inset-0 z-0 transition-colors duration-1000 ${currentLevel.scene === LevelScene.LAWN_NIGHT ? 'bg-indigo-950' : currentLevel.scene === LevelScene.GRAVEYARD ? 'bg-slate-950' : currentLevel.scene === LevelScene.FACTORY ? 'bg-slate-800' : 'bg-green-800'}`}>
               <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDQwaDQwVjBIMHY0MHptMjAgMjBoMjBWMjBIMjB2MjB6TTAgMjBoMjBWMEgwdjIweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L2c+PC9zdmc+')]"></div>
           </div>

           {/* GAMEPLAY LAYER */}
           {gamePhase === GamePhase.PLAYING && (
              <>
                <div className="absolute top-[80px] left-[20px] right-[20px] bottom-[20px] z-10">
                    <GameGrid 
                        grid={engine.grid}
                        onCellClick={(r, c) => engine.handleInteractWithCell(r, c, selectedPlant, isShovelActive, setSelectedPlant, setShovelActive)}
                        onHover={(r, c) => engine.setDragOverCell({row: r, col: c})}
                        onLeave={() => engine.setDragOverCell(null)}
                        dragOverCell={engine.dragOverCell}
                        scene={currentLevel.scene}
                        targetingPlantId={engine.stateRef.current.targetingPlantId}
                        selectedPlantType={selectedPlant}
                        isShovelActive={isShovelActive}
                    />
                    <div className="absolute left-[120px] top-[20px] w-[720px] h-[540px] z-30 pointer-events-none">
                         <EntitiesLayer gameStateRef={engine.stateRef} onCollectSun={engine.handleCollectSun} />
                    </div>
                </div>

                <GameHUD 
                    sun={engine.uiState.sun}
                    deck={deck}
                    selectedPlant={selectedPlant}
                    isShovelActive={isShovelActive}
                    onSelectPlant={(p) => { setSelectedPlant(p); setShovelActive(false); engine.stateRef.current.targetingPlantId = null; }}
                    onToggleShovel={() => { setShovelActive(!isShovelActive); setSelectedPlant(null); engine.stateRef.current.targetingPlantId = null; }}
                    onMenuClick={() => setPaused(true)}
                    levelConfig={currentLevel}
                    language={lang}
                    targetingPlantId={engine.stateRef.current.targetingPlantId}
                />

                {/* OVERLAYS */}
                {engine.showHugeWave && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <h1 className="text-6xl text-red-600 font-pixel drop-shadow-[4px_4px_0_black] animate-pulse scale-150">A HUGE WAVE OF ZOMBIES IS APPROACHING!</h1>
                    </div>
                )}
                {engine.stateRef.current.activeTextOverlay && (
                    <div className="absolute top-[20%] w-full text-center z-[100] pointer-events-none">
                         <h2 className={`text-4xl font-pixel drop-shadow-md ${engine.stateRef.current.activeTextOverlay.style === 'WARNING' ? 'text-red-500' : engine.stateRef.current.activeTextOverlay.style === 'SPOOKY' ? 'text-purple-400' : 'text-blue-400'}`}>
                             {engine.stateRef.current.activeTextOverlay.content}
                         </h2>
                    </div>
                )}
              </>
           )}

           {/* MENUS AND MODALS */}
           {gamePhase === GamePhase.MENU && (
               <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
                   <div className="mb-12 text-center animate-bounce-subtle">
                       <h1 className="text-6xl text-green-400 font-pixel drop-shadow-[0_5px_0_#14532D] mb-2">{t('GAME_TITLE', lang)}</h1>
                       <div className="text-slate-500 font-mono tracking-widest">{t('VERSION_INFO', lang)}</div>
                   </div>
                   
                   <div className="flex flex-col gap-4 w-[300px]">
                       <button onClick={() => { setGamePhase(GamePhase.LEVEL_SELECTION); }} className="py-4 bg-green-600 hover:bg-green-500 text-white font-pixel text-xl rounded shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all">{t('ADVENTURE', lang)}</button>
                       <button onClick={() => { setGamePhase(GamePhase.ENDLESS_SELECTION); }} className="py-4 bg-purple-600 hover:bg-purple-500 text-white font-pixel text-xl rounded shadow-lg border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all">{t('ENDLESS_MODE', lang)}</button>
                       <button onClick={() => { setGamePhase(GamePhase.EDITOR_MENU); }} className="py-4 bg-blue-600 hover:bg-blue-500 text-white font-pixel text-xl rounded shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all">{t('EDITOR', lang)}</button>
                       
                       <div className="grid grid-cols-2 gap-4 mt-2">
                           <button onClick={() => setShowDLCManager(true)} className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded border-2 border-slate-600">{t('DLC_MANAGER', lang)}</button>
                           <button onClick={() => setShowSettings(true)} className="py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded border-2 border-slate-600">⚙️ {t('SETTINGS_TITLE', lang)}</button>
                       </div>
                   </div>
                   <div className="absolute bottom-4 text-slate-600 text-xs">React + Tailwind + TS</div>
               </div>
           )}

           {gamePhase === GamePhase.LEVEL_SELECTION && (
               <LevelSelector 
                   onSelectLevel={(l) => { startGame(l); }} 
                   onBack={() => setGamePhase(GamePhase.MENU)}
                   language={lang}
               />
           )}

           {gamePhase === GamePhase.EDITOR_MENU && (
               <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
                   <div className="bg-slate-800 p-8 rounded-xl border-4 border-slate-600 flex flex-col gap-4 w-[400px]">
                       <h2 className="text-2xl text-center text-white font-pixel mb-4">{t('EDITOR_MENU', lang)}</h2>
                       <button onClick={() => setGamePhase(GamePhase.BASE_EDITOR)} className="bg-amber-700 hover:bg-amber-600 text-white p-4 rounded text-left relative group overflow-hidden">
                           <div className="font-bold text-lg">{t('BASE_EDITOR', lang)}</div>
                           <div className="text-xs opacity-70 mt-1">{t('BASE_EDITOR_DESC', lang)}</div>
                           <div className="absolute right-2 bottom-2 text-4xl opacity-20 group-hover:scale-110 transition-transform">📝</div>
                       </button>
                       <button onClick={() => setGamePhase(GamePhase.LEVEL_EDITOR)} className="bg-indigo-700 hover:bg-indigo-600 text-white p-4 rounded text-left relative group overflow-hidden">
                           <div className="font-bold text-lg">{t('DLC_EDITOR', lang)}</div>
                           <div className="text-xs opacity-70 mt-1">{t('DLC_EDITOR_DESC', lang)}</div>
                           <div className="absolute right-2 bottom-2 text-4xl opacity-20 group-hover:scale-110 transition-transform">📦</div>
                       </button>
                       <button onClick={() => setGamePhase(GamePhase.MENU)} className="mt-4 text-slate-400 hover:text-white text-center text-sm">{t('BACK', lang)}</button>
                   </div>
               </div>
           )}

           {gamePhase === GamePhase.BASE_EDITOR && <BaseEditor onBack={() => setGamePhase(GamePhase.EDITOR_MENU)} language={lang} />}
           {gamePhase === GamePhase.LEVEL_EDITOR && (
               <LevelEditor 
                  onPlay={(lvl, dlc) => { 
                      if (dlc.plants) dlc.plants.forEach(p => PLANT_STATS[p.type] = p);
                      if (dlc.zombies) Object.assign(ZOMBIE_STATS, dlc.zombies);
                      if (dlc.plants) setUnlockedPlants(prev => [...prev, ...dlc.plants!.map(p => p.type)]);
                      startGame(lvl); 
                  }} 
                  onBack={() => setGamePhase(GamePhase.EDITOR_MENU)} 
                  language={lang}
               />
           )}

           {gamePhase === GamePhase.SELECTION && (
               <PlantSelector 
                   selectedPlants={deck}
                   onTogglePlant={(p) => {
                       if (deck.includes(p)) setDeck(deck.filter(d => d !== p));
                       else if (deck.length < (currentLevel.seedSlots || MAX_DECK_SIZE)) setDeck([...deck, p]);
                   }}
                   onStartGame={() => setGamePhase(GamePhase.PLAYING)}
                   onBack={() => {
                       if(endlessState.active) { handleSaveAndQuit(); }
                       else setGamePhase(GamePhase.LEVEL_SELECTION);
                   }}
                   levelConfig={currentLevel}
                   unlockedPlants={unlockedPlants}
                   isEndless={endlessState.active}
                   onSaveAndQuit={endlessState.active ? handleSaveAndQuit : undefined}
                   language={lang}
               />
           )}

           {gamePhase === GamePhase.ENDLESS_SELECTION && (
               <EndlessModeSelector 
                  onBack={() => setGamePhase(GamePhase.MENU)}
                  onStartGame={handleStartEndless}
                  language={lang}
               />
           )}

           {gamePhase === GamePhase.ENDLESS_SHOP && (
               <EndlessShop 
                  floor={endlessState.floor}
                  score={engine.stateRef.current.score}
                  inventory={endlessState.inventory}
                  onBuy={(type, cost) => {
                       if (engine.stateRef.current.score >= cost) {
                           engine.stateRef.current.score -= cost;
                           handleUseConsumable(type); // Actually buying puts it in inventory, done in App helper
                       }
                  }}
                  onContinue={() => {
                      const level = generateEndlessLevel(endlessState.floor);
                      startGame(level); // Continue implies new level generation logic or re-entering selection
                      // Simplification: Go to selection
                      setGamePhase(GamePhase.SELECTION);
                  }}
                  language={lang}
               />
           )}

           {/* PAUSE */}
           {isPaused && gamePhase === GamePhase.PLAYING && (
               <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                   <h2 className="text-4xl text-white font-pixel mb-8">{t('PAUSED', lang)}</h2>
                   <div className="flex flex-col gap-4">
                       <button onClick={() => setPaused(false)} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg">{t('RESUME', lang)}</button>
                       <button onClick={() => setShowSettings(true)} className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded shadow-lg">{t('SETTINGS_TITLE', lang)}</button>
                       <button onClick={() => { setPaused(false); setGamePhase(GamePhase.MENU); engine.restoreState(); setEndlessState(prev => ({...prev, active: false})); }} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-lg">{t('EXIT_TO_MENU', lang)}</button>
                   </div>
               </div>
           )}

           {/* GAME OVER */}
           {engine.uiState.gameOver && (
               <div className="absolute inset-0 z-[1000] bg-red-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                   <h2 className="text-6xl text-white font-pixel drop-shadow-[4px_4px_0_black] mb-2">{t('GAME_OVER', lang)}</h2>
                   <div className="text-2xl text-red-200 font-pixel mb-8">THE ZOMBIES ATE YOUR BRAINS!</div>
                   <div className="flex gap-4">
                       <button 
                           onClick={() => { 
                               if(endlessState.active) { 
                                   setGamePhase(GamePhase.MENU); 
                                   engine.restoreState(); 
                                   setEndlessState(prev => ({...prev, active: false})); 
                                   // Reset UI State specifically to clear Game Over flag
                                   engine.setUiState(prev => ({ ...prev, gameOver: false }));
                               } else {
                                   startGame(currentLevel); 
                               }
                           }} 
                           className="px-8 py-4 bg-white text-red-900 font-bold font-pixel rounded shadow-xl hover:scale-105 transition-transform"
                       >
                           {t('TRY_AGAIN', lang)}
                       </button>
                       <button 
                           onClick={() => { 
                               setGamePhase(GamePhase.MENU); 
                               engine.restoreState(); 
                               setEndlessState(prev => ({...prev, active: false})); 
                               // Reset UI State
                               engine.setUiState(prev => ({ ...prev, gameOver: false }));
                           }} 
                           className="px-8 py-4 bg-black text-white font-bold font-pixel rounded shadow-xl hover:scale-105 transition-transform"
                       >
                           {t('MAIN_MENU', lang)}
                       </button>
                   </div>
               </div>
           )}

           {/* VICTORY */}
           {engine.uiState.victory && (
               <div className="absolute inset-0 z-[1000] bg-yellow-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                   <h2 className="text-6xl text-yellow-300 font-pixel drop-shadow-[4px_4px_0_black] mb-2">{endlessState.active ? t('FLOOR_COMPLETE', lang) : t('LEVEL_CLEAR', lang)}</h2>
                   
                   {currentLevel.unlocksPlant && !endlessState.active && (
                       <div className="bg-black/40 p-6 rounded-xl border-2 border-yellow-400 mb-8 flex flex-col items-center animate-bounce-subtle">
                           <div className="text-yellow-200 text-sm mb-2">{t('NEW_PLANT_UNLOCKED', lang)}</div>
                           <div className="text-6xl mb-2">{PLANT_STATS[currentLevel.unlocksPlant].icon}</div>
                           <div className="text-xl font-bold">{PLANT_STATS[currentLevel.unlocksPlant].name}</div>
                       </div>
                   )}

                   <div className="flex gap-4">
                       <button onClick={() => { 
                           if(endlessState.active) { handleEndlessVictory(); } 
                           else { 
                               setGamePhase(GamePhase.LEVEL_SELECTION); 
                               // Reset Victory state so it doesn't persist
                               engine.setUiState(prev => ({ ...prev, victory: false }));
                           }
                        }} className="px-8 py-4 bg-green-500 text-white font-bold font-pixel rounded shadow-xl hover:scale-105 transition-transform border-b-4 border-green-800 active:border-b-0 active:translate-y-1">
                           {endlessState.active ? t('NEXT_FLOOR', lang) : t('CONTINUE', lang)}
                       </button>
                   </div>
               </div>
           )}

           <SettingsModal 
               isOpen={showSettings} 
               onClose={() => setShowSettings(false)} 
               settings={appSettings} 
               onUpdateSettings={setAppSettings}
           />

           {showDLCManager && (
               <DLCManager 
                   enabledDLCs={enabledDLCs} 
                   onClose={() => setShowDLCManager(false)}
                   onSave={(ids) => { setEnabledDLCs(ids); reloadDLCs(ids); setShowDLCManager(false); }}
                   language={lang}
               />
           )}
       </div>
    </div>
  );
};

export default App;
