
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  PlantType,
  ZombieType,
  Plant,
  Zombie,
  Projectile,
  GameState,
  GamePhase,
  ProjectileType,
  LawnCleaner,
  LevelConfig,
  Effect,
  ZombieStatConfig,
  DLCManifest,
  LevelScene,
  BaseZombieType,
  AppSettings,
  BasePlantType,
  EndlessSaveSlot,
  ConsumableType
} from './types';
import {
  ROWS,
  COLS,
  PLANT_STATS,
  ZOMBIE_STATS,
  PROJECTILE_SPEED,
  CLEANER_SPEED,
  PROJECTILE_DAMAGE,
  MELON_DAMAGE,
  KERNEL_DAMAGE,
  BUTTER_DAMAGE,
  COB_DAMAGE,
  NATURAL_SUN_INTERVAL,
  WAVE_INTERVAL,
  MAX_DECK_SIZE,
  LEVELS,
  EFFECT_DURATIONS,
  DIRECTION_VECTORS,
  RESTORE_CONSTANTS,
  CONSUMABLES
} from './constants';
import { GridCell } from './components/GridCell';
import { EntitiesLayer } from './components/EntitiesLayer';
import { PlantSelector } from './components/PlantSelector';
import { LevelSelector } from './components/LevelSelector';
import { SettingsModal } from './components/SettingsModal';
import { LevelEditor } from './components/LevelEditor';
import { BaseEditor } from './components/BaseEditor';
import { DLCManager } from './components/DLCManager';
import { EndlessModeSelector } from './components/EndlessModeSelector';
import { EndlessShop } from './components/EndlessShop';
import { initDLC, reloadDLCs, AVAILABLE_DLCS } from './dlc';

const createGrid = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

const App: React.FC = () => {
  const [enabledDLCs, setEnabledDLCs] = useState<string[]>([]);
  // --- PROGRESSION STATE ---
  // Default Unlocked: ALL BASE PLANTS
  const [unlockedPlants, setUnlockedPlants] = useState<PlantType[]>(Object.values(BasePlantType));

  // Init DLC on mount: Auto-enable ALL available DLCs
  useEffect(() => { 
      const allDlcIds = AVAILABLE_DLCS.map(d => d.id);
      setEnabledDLCs(allDlcIds);
      reloadDLCs(allDlcIds);

      // Auto-unlock all plants from enabled DLCs for the session
      const basePlants = Object.values(BasePlantType);
      const dlcPlants = allDlcIds.flatMap(id => {
          const dlc = AVAILABLE_DLCS.find(d => d.id === id);
          return dlc?.plants?.map(p => p.type) || [];
      });
      setUnlockedPlants(Array.from(new Set([...basePlants, ...dlcPlants])));
  }, []);

  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.MENU);
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [uiState, setUiState] = useState({
    sun: 150, score: 0, wave: 1, gameOver: false, victory: false,
  });
  
  const [deck, setDeck] = useState<PlantType[]>([]);
  const [grid, setGrid] = useState<(Plant | null)[][]>(createGrid());
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [isShovelActive, setShovelActive] = useState(false);
  const [dragOverCell, setDragOverCell] = useState<{row: number, col: number} | null>(null);
  const [showHugeWave, setShowHugeWave] = useState(false);
  
  // --- Settings & DLC State ---
  const [showSettings, setShowSettings] = useState(false);
  const [showDLCManager, setShowDLCManager] = useState(false);
  const [isPaused, setPaused] = useState(false);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
      musicVolume: 0.5,
      sfxVolume: 0.8,
      gameSpeed: 1.0
  });

  // --- ENDLESS MODE STATE ---
  const [endlessState, setEndlessState] = useState<{
      active: boolean;
      slotId: number | null;
      floor: number;
      inventory: Record<string, number>;
  }>({ active: false, slotId: null, floor: 1, inventory: {} });

  // Helper to restore state from Endless mode or Reset (Fixes DLC levels disappearing)
  const restoreGameState = () => {
      RESTORE_CONSTANTS(); // 1. Reset to Vanilla
      if (enabledDLCs.length > 0) {
          reloadDLCs(enabledDLCs); // 2. Re-apply currently enabled DLCs to populate LEVELS
      }
      setEndlessState(prev => ({ ...prev, active: false })); // 3. Disable endless flag
  };

  // --- Scripted Level State ---
  const currentWaveIndexRef = useRef<number>(0);
  const waveStartTimeRef = useRef<number>(0);
  const zombiesSpawnedInWaveRef = useRef<number>(0);
  
  const stateRef = useRef<GameState>({
    sun: 150, grid: createGrid(), zombies: [], projectiles: [], suns: [], lawnCleaners: [], effects: [], decorations: [],
    gameOver: false, victory: false, wave: 1, score: 0, time: 0, activeTextOverlay: undefined, targetingPlantId: null
  });

  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const nextSunSpawnRef = useRef<number>(0);
  const nextZombieSpawnRef = useRef<number>(0);
  const nextWaveRef = useRef<number>(0);

  // RESET GAME
  const resetGame = useCallback((level: LevelConfig, options: { keepProgress?: boolean, fromSave?: EndlessSaveSlot } = {}) => {
     setCurrentLevel(level);
     // Reset Scripted Logic Refs
     currentWaveIndexRef.current = 0;
     waveStartTimeRef.current = 0;
     zombiesSpawnedInWaveRef.current = 0;
     
     // Reset Game Speed to 1.0 on new level load
     setAppSettings(prev => ({ ...prev, gameSpeed: 1.0 }));

     // Calculate preserved values if keeping progress (Endless next floor)
     let startScore = 0;
     let initialGrid = createGrid();
     let initialSun = level.startingSun;
     
     if (options.keepProgress && stateRef.current) {
         startScore = stateRef.current.score;
         // Preserve Grid & Sun from previous floor
         initialGrid = stateRef.current.grid.map(row => row.map(plant => plant ? {...plant, createdAt: plant.createdAt - stateRef.current.time, lastActionTime: plant.lastActionTime - stateRef.current.time } : null));
         initialSun = stateRef.current.sun;
     }

     if (options.fromSave) {
         // Load from Save Slot
         startScore = options.fromSave.score;
         // Load Saved Grid if available
         if (options.fromSave.gridSnapshot && options.fromSave.gridSnapshot.length > 0) {
             initialGrid = options.fromSave.gridSnapshot.map(row => row.map(plant => plant ? {...plant} : null));
         }
         // Load Saved Sun logic (could be part of score or sun) - usually separate
         if (options.fromSave.sunSnapshot && options.fromSave.sunSnapshot.length > 0) {
            // Restore sun entities
            // We need to restore them to stateRef later, but for initialSun value, 
            // usually we don't save floating suns in snapshots for logic simplicity, just the banked value.
            // But if we want to restore active floating suns:
            // stateRef.current.suns = options.fromSave.sunSnapshot; // Handled below in stateRef init
         }
         // Restore Grid Snapshot is handled in initialGrid above
     }

     stateRef.current = {
        sun: initialSun,
        grid: initialGrid,
        zombies: [],
        projectiles: [],
        suns: options.fromSave?.sunSnapshot ? options.fromSave.sunSnapshot : [], // Restore floating suns if saved
        lawnCleaners: Array.from({ length: ROWS }, (_, i) => ({
            id: uuidv4(),
            row: i,
            position: { row: i, col: -1, x: -0.1 }, 
            active: false,
        })),
        effects: [],
        decorations: level.backgroundDecorations ? [...level.backgroundDecorations] : [],
        gameOver: false,
        victory: false,
        wave: 1,
        score: startScore,
        time: 0,
        activeTextOverlay: undefined,
        targetingPlantId: null
    };
    setGrid(initialGrid);
    setUiState({ sun: initialSun, score: startScore, wave: 1, gameOver: false, victory: false });
    setSelectedPlant(null);
    setShovelActive(false);
    setShowHugeWave(false);
    setDeck([]);
    setPaused(false);
  }, []); 

  // Keyboard Listener for ESC and Right Click cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gamePhase === GamePhase.PLAYING) {
             // If targeting, cancel targeting
             if (stateRef.current.targetingPlantId) {
                 stateRef.current.targetingPlantId = null;
                 // Force update to remove reticle
                 setDragOverCell(null); 
                 return;
             }
             
             if (showSettings) {
                 setShowSettings(false);
             } else {
                 setPaused(prev => !prev);
             }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gamePhase, showSettings]);

  const generateEndlessLevel = (floor: number): LevelConfig => {
      const scenes = Object.values(LevelScene);
      const scene = scenes[(floor - 1) % scenes.length];
      
      const difficultyMult = 1 + (floor * 0.1);
      const waves = Math.min(20, 5 + Math.floor(floor / 2));
      const zombies = Object.keys(ZOMBIE_STATS) as ZombieType[];
      // Filter strong zombies based on floor? Or just random mix
      // For simplicity, allow all, but maybe limit types count
      const numTypes = Math.min(zombies.length, 3 + Math.floor(floor / 3));
      const enabledZombies: ZombieType[] = [];
      while(enabledZombies.length < numTypes) {
          const z = zombies[Math.floor(Math.random() * zombies.length)];
          if(!enabledZombies.includes(z)) enabledZombies.push(z);
      }

      return {
          id: 9000 + floor,
          name: `ENDLESS FLOOR ${floor}`,
          mode: 'CLASSIC',
          scene,
          totalWaves: waves,
          startingSun: 500 + (Math.min(10, floor) * 50),
          enabledZombies,
          spawnIntervalMultiplier: Math.max(0.2, 1.2 - (floor * 0.05)),
          difficulty: Math.min(10, Math.ceil(floor / 5)),
          seedSlots: 10 // Max slots always
      };
  };

  const handleStartEndless = (save: EndlessSaveSlot) => {
      // 1. Restore Stats Snapshot (Decouple from current DLCs)
      RESTORE_CONSTANTS(); // Clear first
      Object.assign(PLANT_STATS, save.statsSnapshot.plants);
      Object.assign(ZOMBIE_STATS, save.statsSnapshot.zombies);

      // 2. Set State
      setEndlessState({
          active: true,
          slotId: save.id,
          floor: save.floor,
          inventory: save.inventory
      });
      stateRef.current.score = save.score;

      // 3. Generate Level
      const level = generateEndlessLevel(save.floor);
      // Pass fromSave option if we want to load score etc
      resetGame(level, { fromSave: save });
      setGamePhase(GamePhase.SELECTION);
  };

  const saveEndlessProgress = () => {
      if (!endlessState.active || endlessState.slotId === null) return;
      
      const stored = localStorage.getItem('pvz_endless_saves');
      let saves: EndlessSaveSlot[] = stored ? JSON.parse(stored) : [];
      
      const idx = saves.findIndex(s => s.id === endlessState.slotId);
      
      // Capture Grid Snapshot with normalized times
      const currentGridSnapshot = stateRef.current.grid.map(row => 
          row.map(plant => plant ? {
              ...plant, 
              // Normalize times to be relative (0 based) so they restore correctly on load where time=0
              createdAt: plant.createdAt - stateRef.current.time,
              lastActionTime: plant.lastActionTime - stateRef.current.time
          } : null)
      );
      
      // Capture Sun Snapshot
      const currentSunSnapshot = stateRef.current.suns.map(s => ({
          ...s,
          createdAt: s.createdAt - stateRef.current.time
      }));

      if (idx > -1) {
          saves[idx].floor = endlessState.floor;
          saves[idx].score = stateRef.current.score;
          saves[idx].inventory = endlessState.inventory;
          saves[idx].timestamp = Date.now();
          saves[idx].gridSnapshot = currentGridSnapshot;
          saves[idx].sunSnapshot = currentSunSnapshot;
          // We don't update statsSnapshot mid-run usually
      }
      localStorage.setItem('pvz_endless_saves', JSON.stringify(saves));
  };

  const handleEndlessVictory = () => {
      const nextFloor = endlessState.floor + 1;
      setEndlessState(prev => ({ ...prev, floor: nextFloor }));
      
      // Auto Save
      setTimeout(() => saveEndlessProgress(), 100);

      if (nextFloor % 5 === 0) {
          setGamePhase(GamePhase.ENDLESS_SHOP);
      } else {
          const level = generateEndlessLevel(nextFloor);
          // Keep progress (Sun, Grid)
          resetGame(level, { keepProgress: true });
          setGamePhase(GamePhase.SELECTION);
      }
  };
  
  const handleSaveAndQuit = () => {
      saveEndlessProgress();
      setGamePhase(GamePhase.MENU);
      restoreGameState();
  };

  const handleUseConsumable = (type: ConsumableType) => {
      if (!endlessState.inventory[type] || endlessState.inventory[type] <= 0) return;

      // Apply Effect
      if (type === ConsumableType.SUN_PACK) {
          stateRef.current.sun += 500;
          setUiState(prev => ({ ...prev, sun: stateRef.current.sun }));
      } else if (type === ConsumableType.REPAIR_KIT) {
          stateRef.current.grid.forEach(row => row.forEach(p => { if(p) p.health = p.maxHealth; }));
      } else if (type === ConsumableType.TACTICAL_NUKE) {
          stateRef.current.effects.push({ id: uuidv4(), type: 'DOOM_EXPLOSION', row: 2, col: 4, createdAt: Date.now(), duration: 2000 });
          stateRef.current.zombies.forEach(z => z.health = -9999);
      } else if (type === ConsumableType.TIME_FREEZE) {
          stateRef.current.effects.push({ id: uuidv4(), type: 'FREEZE', createdAt: Date.now(), duration: 10000 });
          stateRef.current.zombies.forEach(z => z.freezeEffect = 10000);
      }

      // Deduct
      setEndlessState(prev => ({
          ...prev,
          inventory: { ...prev.inventory, [type]: prev.inventory[type] - 1 }
      }));
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    
    // APPLY GAME SPEED
    const rawDelta = timestamp - lastTimeRef.current;
    const deltaTime = rawDelta * appSettings.gameSpeed;
    
    lastTimeRef.current = timestamp;

    const currentState = stateRef.current;
    // Use global stats directly
    const currentStats = ZOMBIE_STATS; 
    
    if (currentState.gameOver || currentState.victory || isPaused) return;

    let { grid: gridData, zombies, projectiles, suns, lawnCleaners, effects, time } = currentState;
    let gridDirty = false; 
    let uiDirty = false;  

    time += deltaTime;
    currentState.time = time;

    // 0. Effects & Overlay Cleanup
    currentState.effects = effects.filter(e => (Date.now() - e.createdAt) < e.duration); 
    if (currentState.activeTextOverlay && time > currentState.activeTextOverlay.endTime) {
        currentState.activeTextOverlay = undefined;
        uiDirty = true;
    }

    // 0.5 Event Scripts Check
    if (currentLevel.events) {
        currentLevel.events.forEach(ev => {
            if (time >= ev.time && time - deltaTime < ev.time) {
                currentState.activeTextOverlay = {
                    content: ev.content,
                    style: ev.style,
                    endTime: time + ev.duration
                };
                uiDirty = true;
            }
        });
    }

    // 1. Sun Spawning
    if (time > nextSunSpawnRef.current) {
      suns.push({
        id: uuidv4(),
        position: { row: -1, col: Math.floor(Math.random() * COLS), x: Math.random() * 0.8 + 0.1, y: -10 },
        targetY: Math.random() * 60 + 20,
        value: 25,
        createdAt: time,
        isCollected: false,
      });
      nextSunSpawnRef.current = time + NATURAL_SUN_INTERVAL;
    }

    // 2. Zombie Spawning Logic
    if (currentLevel.mode === 'SCRIPTED' && currentLevel.waves) {
        // --- SCRIPTED MODE ---
        const waveIdx = currentWaveIndexRef.current;
        
        if (waveIdx < currentLevel.waves.length) {
            const waveDef = currentLevel.waves[waveIdx];
            
            // Start Wave logic
            if (waveStartTimeRef.current === 0) {
                if (time > (waveDef.startDelay || 5000)) { 
                    waveStartTimeRef.current = time; 
                    
                    if (waveDef.isFlagWave) {
                        setShowHugeWave(true);
                        setTimeout(() => setShowHugeWave(false), 4000);
                    }
                    uiDirty = true;
                    currentState.wave = waveDef.waveNumber;
                }
            } 
            else {
                const zombiesInThisWave: ZombieType[] = [];
                waveDef.zombies.forEach(grp => {
                    for(let i=0; i<grp.count; i++) zombiesInThisWave.push(grp.type);
                });

                const totalToSpawn = zombiesInThisWave.length;
                
                if (zombiesSpawnedInWaveRef.current < totalToSpawn) {
                    if (time > nextZombieSpawnRef.current) {
                        const zType = zombiesInThisWave[zombiesSpawnedInWaveRef.current];
                        const stats = currentStats[zType] || ZOMBIE_STATS[BaseZombieType.NORMAL];
                        const spawnRow = Math.floor(Math.random() * ROWS);
                        
                        zombies.push({
                            id: uuidv4(),
                            type: zType,
                            position: { row: spawnRow, col: COLS, x: 1.05 }, 
                            health: stats.health, maxHealth: stats.health, speed: stats.speed, 
                            isEating: false, attackDamage: stats.damage, freezeEffect: 0, stunEffect: 0, isDying: false, dyingSince: 0
                        });

                        zombiesSpawnedInWaveRef.current++;
                        nextZombieSpawnRef.current = time + (1500 * (currentLevel.spawnIntervalMultiplier || 1));
                    }
                } else {
                    if (time > nextZombieSpawnRef.current + 10000) {
                        currentWaveIndexRef.current++;
                        waveStartTimeRef.current = 0; 
                        zombiesSpawnedInWaveRef.current = 0;
                        nextZombieSpawnRef.current = time; 
                    }
                }
            }
        } else if (zombies.length === 0) {
            currentState.victory = true;
            if (endlessState.active) {
                handleEndlessVictory();
            } else {
                // UNLOCK LOGIC
                if (currentLevel.unlocksPlant && !unlockedPlants.includes(currentLevel.unlocksPlant)) {
                    setUnlockedPlants(prev => [...prev, currentLevel.unlocksPlant!]);
                }
                setUiState(prev => ({ ...prev, victory: true }));
            }
        }

    } else {
        // --- CLASSIC MODE ---
        if (time > nextZombieSpawnRef.current && currentState.wave <= (currentLevel.totalWaves || 10)) {
            const spawnRow = Math.floor(Math.random() * ROWS);
            const isWave = time > nextWaveRef.current;
            let count = 1;
            if (isWave) {
                count = Math.floor(currentState.wave * 1.5) + 2;
                if (currentState.wave === currentLevel.totalWaves) count = 15; 
            }

            for(let i=0; i<count; i++) {
                const allowedTypes = currentLevel.enabledZombies;
                const validTypes = allowedTypes.filter(t => currentStats[t]);
                const zType = validTypes.length > 0 ? validTypes[Math.floor(Math.random() * validTypes.length)] : BaseZombieType.NORMAL;
                
                if (currentStats[zType]) {
                    const stats = currentStats[zType];
                    zombies.push({
                        id: uuidv4(),
                        type: zType,
                        position: { row: spawnRow, col: COLS, x: 1.05 + (i * 0.15) }, 
                        health: stats.health, maxHealth: stats.health, speed: stats.speed + (Math.random() * 0.01), 
                        isEating: false, attackDamage: stats.damage, freezeEffect: 0, stunEffect: 0, isDying: false, dyingSince: 0
                    });
                }
            }

            if (isWave) {
                currentState.wave++;
                nextWaveRef.current = time + WAVE_INTERVAL;
                uiDirty = true;
                if (currentState.wave === Math.floor((currentLevel.totalWaves||10) / 2) || currentState.wave === currentLevel.totalWaves) {
                    setShowHugeWave(true);
                    setTimeout(() => setShowHugeWave(false), 4000);
                }
            }
            
            const baseDelay = Math.max(1500, 8000 - (currentState.wave * 500));
            const adjustedDelay = baseDelay * currentLevel.spawnIntervalMultiplier;
            nextZombieSpawnRef.current = time + adjustedDelay;
        } 
        else if (currentState.wave > (currentLevel.totalWaves || 10) && zombies.length === 0) {
            currentState.victory = true;
            if (endlessState.active) {
                handleEndlessVictory();
            } else {
                // UNLOCK LOGIC
                if (currentLevel.unlocksPlant && !unlockedPlants.includes(currentLevel.unlocksPlant)) {
                    setUnlockedPlants(prev => [...prev, currentLevel.unlocksPlant!]);
                }
                setUiState(prev => ({ ...prev, victory: true }));
            }
        }
    }

    // 3. Projectiles & Physics
    const nextProjectiles: Projectile[] = [];
    projectiles.forEach(p => {
        // Special Logic for COB (Arcing Projectile)
        if (p.type === ProjectileType.COB) {
            p.elapsedTime = (p.elapsedTime || 0) + (deltaTime / 1000);
            
            // Linear horizontal
            const dx = (p.targetCol !== undefined ? (p.targetCol + 0.5) / COLS : 1) - (p.position.x || 0);
            const dy = (p.targetRow !== undefined ? p.targetRow : p.row) - p.row;
            
            // Move towards target
            const speed = 2.0; // Fast
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 0.1) {
                // Impact!
                currentState.effects.push({ 
                    id: uuidv4(), 
                    type: 'DOOM_EXPLOSION', // Use Doom explosion visual for massiveness
                    row: p.targetRow, 
                    col: p.targetCol, 
                    createdAt: Date.now(), 
                    duration: 1500 
                });
                
                // Damage Area (3x3)
                const r = p.targetRow || 0;
                const c = p.targetCol || 0;
                currentState.zombies.forEach(z => {
                   if (!z.isDying) {
                       const zCol = Math.floor((z.position.x || 0) * COLS);
                       if (Math.abs(z.position.row - r) <= 1 && Math.abs(zCol - c) <= 1) {
                           z.health -= COB_DAMAGE;
                       }
                   } 
                });
                
                // Don't keep projectile
            } else {
                // Move x/y
                // Simple lerp-like movement or velocity
                const angle = Math.atan2(dy, dx);
                p.position.x = (p.position.x || 0) + (Math.cos(angle) * speed * (deltaTime/1000));
                p.row += (Math.sin(angle) * speed * (deltaTime/1000) * (COLS/ROWS)); // rough aspect ratio fix for row
                nextProjectiles.push(p);
            }
        } 
        else {
            // Standard OR Vector Projectiles
            const speed = p.speed * (deltaTime / 1000);
            
            if (p.vector) {
                // Directional Movement
                p.position.x = (p.position.x || 0) + (p.vector.x * speed);
                p.row += (p.vector.y * speed); // Note: row is 0-5, y moves visually, collision checks raw row value
            } else {
                // Classic Right Movement
                p.position.x = (p.position.x || 0) + speed;
            }

            const col = Math.floor(p.position.x || 0);
            // Torchwood Interaction (Only for horizontal projectiles in grid)
            if (!p.vector && col >= 0 && col < COLS) {
                const plant = gridData[Math.round(p.row)][col];
                if (plant && plant.type === 'TORCHWOOD' && (p.type === ProjectileType.NORMAL || p.type === ProjectileType.FROZEN)) {
                    p.type = ProjectileType.FIRE; p.damage = PROJECTILE_DAMAGE * 2;
                }
            }
            
            // Bounds Check
            if ((p.position.x || 0) < 1.1 && (p.position.x || 0) > -0.1 && p.row > -1 && p.row < ROWS) {
                nextProjectiles.push(p);
            }
        }
    });
    currentState.projectiles = nextProjectiles;

    // Cleaners logic ...
    const nextCleaners: LawnCleaner[] = [];
    lawnCleaners.forEach(cleaner => {
        if (cleaner.active) {
            cleaner.position.x = (cleaner.position.x || 0) + (CLEANER_SPEED * (deltaTime / 1000));
            zombies.forEach(z => { if (z.position.row === cleaner.row && !z.isDying && Math.abs((cleaner.position.x||0) - (z.position.x||0)) < 0.1) z.health = -9999; });
        }
        if ((cleaner.position.x || 0) < 1.1) nextCleaners.push(cleaner);
    });
    currentState.lawnCleaners = nextCleaners;

    // Plants & Zombies
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const plant = gridData[r][c];
        if (plant) {
          const plantConfig = PLANT_STATS[plant.type];

          // Recharge Logic for Cob Cannon
          if (plant.type === BasePlantType.COB_CANNON && !plant.isReady) {
              if (time - plant.lastActionTime > plantConfig.cooldown) {
                  plant.isReady = true;
                  gridDirty = true;
              }
          }

          if (plant.type === 'POTATO_MINE' && !plant.isReady && time - plant.createdAt > 15000) { plant.isReady = true; gridDirty = true; }
          
          // --- SHOOTING LOGIC ---
          // 1. Multi-Directional Shooters (Starfruit etc)
          if (plantConfig.attackDirections && plantConfig.attackDirections.length > 0) {
              if (time - plant.lastActionTime > 1400) {
                  plantConfig.attackDirections.forEach(dir => {
                      const vec = DIRECTION_VECTORS[dir];
                      stateRef.current.projectiles.push({ 
                          id: uuidv4(), 
                          position: { row: r, col: c, x: (c / COLS) + 0.05 }, 
                          damage: PROJECTILE_DAMAGE, 
                          speed: PROJECTILE_SPEED, 
                          row: r, 
                          type: ProjectileType.STAR,
                          vector: vec
                      });
                  });
                  plant.lastActionTime = time;
              }
          }
          // 2. Standard Lane Shooters
          else {
              const shooters = ['PEASHOOTER', 'SNOW_PEA', 'REPEATER', 'GATLING_PEA', 'PUFF_SHROOM', 'MELON_PULT', 'KERNEL_PULT', 'THREEPEATER', 'LASER_BEAN'];
              if (shooters.includes(plant.type)) {
                 let targetRows = [r];
                 if (plant.type === 'THREEPEATER') targetRows = [r-1, r, r+1].filter(row => row >= 0 && row < ROWS);
                 let rangeLimit = 1.1; if (plant.type === 'PUFF_SHROOM') rangeLimit = (c / COLS) + 0.4;
                 const zombieInSight = zombies.some(z => targetRows.includes(z.position.row) && !z.isDying && (z.position.x || 0) > (c / COLS) && (z.position.x || 0) < rangeLimit);
                 if (zombieInSight && time - plant.lastActionTime > 1400) {
                     const fire = (row: number, delay: number = 0) => {
                         setTimeout(() => {
                            let projType = ProjectileType.NORMAL; let damage = PROJECTILE_DAMAGE;
                            if (plant.type === 'SNOW_PEA') projType = ProjectileType.FROZEN;
                            else if (plant.type === 'MELON_PULT') { projType = ProjectileType.MELON; damage = MELON_DAMAGE; }
                            else if (plant.type === 'KERNEL_PULT') { projType = Math.random() < 0.25 ? ProjectileType.BUTTER : ProjectileType.KERNEL; damage = projType === ProjectileType.BUTTER ? BUTTER_DAMAGE : KERNEL_DAMAGE; }
                            else if (plant.type === 'LASER_BEAN') projType = ProjectileType.FIRE;
                            stateRef.current.projectiles.push({ id: uuidv4(), position: { row: row, col: c, x: (c / COLS) + 0.05 }, damage, speed: PROJECTILE_SPEED, row: row, type: projType });
                         }, delay / appSettings.gameSpeed);
                     };
                     if (plant.type === 'THREEPEATER') targetRows.forEach(tr => fire(tr));
                     else { fire(r); if (['REPEATER', 'GATLING_PEA'].includes(plant.type)) fire(r, 150); if (plant.type === 'GATLING_PEA') { fire(r, 300); fire(r, 450); } }
                     plant.lastActionTime = time;
                 }
              }
          }
          
          if (['SUNFLOWER', 'SUN_SHROOM', 'TWIN_SUNFLOWER'].includes(plant.type) && time - plant.lastActionTime > PLANT_STATS[plant.type].cooldown) {
                const val = plant.type === 'TWIN_SUNFLOWER' ? 50 : (plant.type === 'SUN_SHROOM' ? 15 : 25);
                suns.push({ id: uuidv4(), position: { row: r, col: c, x: (c / COLS) + 0.05, y: (r * 20) + 5 }, targetY: (r * 20) + 5, value: val, createdAt: time, isCollected: false });
                plant.lastActionTime = time;
          }
          else if (['CHERRY_BOMB', 'DOOM_SHROOM', 'JALAPENO', 'ICE_SHROOM'].includes(plant.type) && time - plant.createdAt > 1000) {
              if (plant.type === 'JALAPENO' && time - plant.createdAt > 700) {
                  currentState.effects.push({ id: uuidv4(), type: 'FIRE_ROW', row: r, createdAt: Date.now(), duration: EFFECT_DURATIONS.FIRE_ROW });
                  currentState.zombies.forEach(z => { if (z.position.row === r && !z.isDying) z.health = -999; });
                  gridData[r][c] = null; gridDirty = true;
              }
          }
        }
      }
    }

    // Zombies Logic ...
    const aliveZombies: Zombie[] = [];
    currentState.zombies.forEach(zombie => {
       if (zombie.isDying) { if (time - zombie.dyingSince < 800) aliveZombies.push(zombie); return; }
       let isEating = false; const zombieX = zombie.position.x || 0;
       
       if (zombie.freezeEffect > 0) zombie.freezeEffect -= deltaTime; else zombie.freezeEffect = 0;
       if (zombie.stunEffect > 0) zombie.stunEffect -= deltaTime; else zombie.stunEffect = 0;
       
       let currentSpeed = zombie.speed;
       if (zombie.type === 'NEWSPAPER' && zombie.health < (zombie.maxHealth / 2)) currentSpeed *= 3.0;
       if (zombie.freezeEffect > 0) currentSpeed *= 0.5;

       const colIndex = Math.floor(zombieX * COLS);
       if (colIndex >= 0 && colIndex < COLS && zombie.stunEffect <= 0) {
           const plant = gridData[zombie.position.row][colIndex];
           if (plant && Math.abs(zombieX - ((colIndex + 0.5) / COLS)) < 0.1) {
               if (plant.type === 'POTATO_MINE' && plant.isReady) { 
                   currentState.effects.push({ id: uuidv4(), type: 'EXPLOSION', row: zombie.position.row, col: colIndex, createdAt: Date.now(), duration: EFFECT_DURATIONS.EXPLOSION });
                   zombie.health = -999; gridData[zombie.position.row][colIndex] = null; gridDirty = true;
               } else if (plant.type === 'CHOMPER' && plant.isReady) {
                   zombie.health = -999; plant.isReady = false; setTimeout(() => { if(plant) plant.isReady = true; }, 30000 / appSettings.gameSpeed);
               } else if (plant.type !== 'SPIKEWEED') {
                   isEating = true; plant.health -= zombie.attackDamage * (deltaTime / 16);
                   if (plant.health <= 0) { gridData[zombie.position.row][colIndex] = null; isEating = false; gridDirty = true; }
               } else { zombie.health -= 0.5; }
           }
       }
       if (!isEating && zombie.stunEffect <= 0) zombie.position.x = zombieX - (currentSpeed * (deltaTime / 1000));
       zombie.isEating = isEating;

       // Projectile Collision
       const hit = nextProjectiles.filter(p => {
           if (p.type === ProjectileType.COB) return false; // Handled by splash
           
           // Standard horizontal collision
           if (!p.vector) {
               return p.row === zombie.position.row && Math.abs((p.position.x || 0) - (zombie.position.x || 0)) < 0.05;
           } 
           // Vector collision (approximate)
           else {
               const dx = Math.abs((p.position.x || 0) - (zombie.position.x || 0));
               const dy = Math.abs(p.row - zombie.position.row);
               // Use normalized coords. Row difference < 0.5 means roughly same lane. X diff < 0.05 means contact.
               return dy < 0.5 && dx < 0.05;
           }
       });

       if (hit.length > 0) {
           hit.forEach(p => {
               zombie.health -= p.damage;
               if (p.type === ProjectileType.FROZEN) zombie.freezeEffect = 5000;
               else if (p.type === ProjectileType.BUTTER) zombie.stunEffect = 3000;
               else if (p.type === ProjectileType.FIRE) zombie.freezeEffect = 0;
               const pIndex = nextProjectiles.indexOf(p); if (pIndex > -1) nextProjectiles.splice(pIndex, 1);
           });
       }
       
       if (zombie.position.x && zombie.position.x < -0.05) {
           const row = Math.round(zombie.position.row); // Round to handle slight visual float if any
           const cleaner = currentState.lawnCleaners.find(c => c.row === row);
           if (cleaner) { if (!cleaner.active) cleaner.active = true; }
           else if (zombie.position.x < -0.15) { currentState.gameOver = true; setUiState(prev => ({ ...prev, gameOver: true })); }
       }

       if (zombie.health <= 0) { zombie.isDying = true; zombie.dyingSince = time; currentState.score += 10 * currentState.wave; uiDirty = true; aliveZombies.push(zombie); }
       else aliveZombies.push(zombie);
    });
    currentState.zombies = aliveZombies;

    // Update Suns
    suns.forEach(s => { if (s.position.y && s.position.y < s.targetY) s.position.y += (0.5 * appSettings.gameSpeed); });
    currentState.suns = suns.filter(s => (time - s.createdAt) < 12000 && !s.isCollected);

    if (gridDirty) setGrid(gridData.map(row => [...row]));
    if (uiDirty) {
        setUiState(prev => ({ ...prev, score: currentState.score, wave: currentState.wave, sun: currentState.sun }));
    }
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [currentLevel, isPaused, appSettings.gameSpeed, unlockedPlants, endlessState.active]);

  const handleCollectSun = useCallback((id: string) => {
      const sunIndex = stateRef.current.suns.findIndex(s => s.id === id);
      if (sunIndex > -1) {
          const amount = stateRef.current.suns[sunIndex].value;
          stateRef.current.suns.splice(sunIndex, 1);
          stateRef.current.sun += amount;
          setUiState(prev => ({ ...prev, sun: stateRef.current.sun }));
      }
  }, []);

  const handlePlantSelect = (type: PlantType) => {
      const max = currentLevel.seedSlots || MAX_DECK_SIZE;

      if (gamePhase === GamePhase.SELECTION) { 
          if (deck.includes(type)) setDeck(deck.filter(p => p !== type)); 
          else if (deck.length < max) setDeck([...deck, type]); 
      }
      else if (gamePhase === GamePhase.PLAYING && !isPaused) { 
          setShovelActive(false); 
          // Cancel targeting if selecting a new plant
          stateRef.current.targetingPlantId = null;
          
          if (selectedPlant === type) { setSelectedPlant(null); setDragOverCell(null); } 
          else if (stateRef.current.sun >= PLANT_STATS[type].cost) setSelectedPlant(type); 
      }
  };

  const handleShovelToggle = () => { 
      if(isPaused) return; 
      setShovelActive(!isShovelActive); 
      setSelectedPlant(null); 
      setDragOverCell(null); 
      stateRef.current.targetingPlantId = null;
  };

  const handlePlacePlant = useCallback((row: number, col: number) => {
      if (isPaused) return;
      const currentGrid = stateRef.current.grid;
      
      // 1. Shovel
      if (isShovelActive) { 
          if (currentGrid[row][col]) { currentGrid[row][col] = null; setGrid(currentGrid.map(row => [...row])); setShovelActive(false); } 
          return; 
      }
      
      // 2. Cob Cannon Targeting
      if (stateRef.current.targetingPlantId) {
          // Fire!
          const cannonId = stateRef.current.targetingPlantId;
          // Find the cannon
          let cannon: Plant | null = null;
          for(let r=0; r<ROWS; r++) {
              for(let c=0; c<COLS; c++) {
                  if (currentGrid[r][c]?.id === cannonId) {
                      cannon = currentGrid[r][c];
                      break;
                  }
              }
          }
          
          if (cannon) {
              cannon.isReady = false; // Disarm
              cannon.lastActionTime = stateRef.current.time;
              
              // Launch Cob
              stateRef.current.projectiles.push({
                  id: uuidv4(),
                  type: ProjectileType.COB,
                  damage: COB_DAMAGE,
                  speed: 2.0,
                  row: cannon.position.row,
                  position: { row: cannon.position.row, col: cannon.position.col, x: (cannon.position.col + 0.5) / COLS },
                  targetRow: row,
                  targetCol: col,
                  elapsedTime: 0
              });
          }
          
          stateRef.current.targetingPlantId = null;
          // Force update to remove cursor
          setDragOverCell(null); 
          return;
      }

      // 3. Planting
      if (!selectedPlant) {
          // If clicking on a plant without tool, check for interactions (Cob Cannon)
          const plant = currentGrid[row][col];
          if (plant && plant.type === BasePlantType.COB_CANNON && plant.isReady) {
              stateRef.current.targetingPlantId = plant.id;
              // Trigger update for cursor change
              setDragOverCell(null); 
              return;
          }
          return;
      }
      
      const cost = PLANT_STATS[selectedPlant].cost;
      if (currentGrid[row][col] === null && stateRef.current.sun >= cost) {
          const isCobCannon = selectedPlant === BasePlantType.COB_CANNON;
          currentGrid[row][col] = { 
              id: uuidv4(), 
              type: selectedPlant, 
              position: { row, col }, 
              health: PLANT_STATS[selectedPlant].health, 
              maxHealth: PLANT_STATS[selectedPlant].health, 
              isReady: !isCobCannon && selectedPlant !== 'POTATO_MINE', // Cob Cannon starts not ready? Usually manual fire plants start ready in PvZ if upgraded, but here it's fresh. Let's start Uncharged to prevent instant OP. Or start Ready. Let's start Ready.
              lastActionTime: isCobCannon ? -99999 : 0, // Ensure ready if logic requires time check
              createdAt: stateRef.current.time 
          };
          
          if (isCobCannon) currentGrid[row][col]!.isReady = true;

          stateRef.current.sun -= cost; 
          setGrid(currentGrid.map(row => [...row])); 
          setUiState(prev => ({ ...prev, sun: stateRef.current.sun })); 
          setSelectedPlant(null); 
          setDragOverCell(null);
      }
  }, [selectedPlant, isShovelActive, isPaused]);
  
  // ... Handlers ...

  const handleLevelSelect = (level: LevelConfig) => { resetGame(level); setGamePhase(GamePhase.SELECTION); };
  const handleEditorPlay = (customConfig: LevelConfig, tempDLC: DLCManifest) => {
      if (tempDLC.plants) tempDLC.plants.forEach(p => { /* @ts-ignore */ PLANT_STATS[p.type] = p; });
      if (tempDLC.zombies) Object.entries(tempDLC.zombies).forEach(([id, stats]) => { /* @ts-ignore */ ZOMBIE_STATS[id] = stats; });
      resetGame(customConfig); setGamePhase(GamePhase.SELECTION);
  };
  const handleStartLevel = () => { setGamePhase(GamePhase.PLAYING); };
  
  const handleInteraction = (e: React.MouseEvent | React.DragEvent, action: 'hover' | 'click' | 'leave') => {
      if (isPaused) return;
      
      if (action === 'leave') { setDragOverCell(null); return; }
      
      const rect = e.currentTarget.getBoundingClientRect(); 
      const x = e.clientX - rect.left; 
      const y = e.clientY - rect.top;
      const c = Math.floor((x / rect.width) * COLS); 
      const r = Math.floor((y / rect.height) * ROWS);
      
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) { 
          if (action === 'hover') { 
              if (dragOverCell?.row !== r || dragOverCell?.col !== c) setDragOverCell({ row: r, col: c }); 
          } else if (action === 'click') {
              handlePlacePlant(r, c); 
          } 
      } else {
          setDragOverCell(null);
      }
  };

  const handleSaveDLCs = (newEnabledIds: string[]) => {
      setEnabledDLCs(newEnabledIds);
      reloadDLCs(newEnabledIds);
      
      // Auto-unlock all plants from enabled DLCs
      const basePlants = Object.values(BasePlantType);
      const dlcPlants = newEnabledIds.flatMap(id => {
          const dlc = AVAILABLE_DLCS.find(d => d.id === id);
          return dlc?.plants?.map(p => p.type) || [];
      });
      
      // Merge unique
      const allUnlocked = Array.from(new Set([...basePlants, ...dlcPlants]));
      setUnlockedPlants(allUnlocked);
      
      setShowDLCManager(false);
  };

  const toggleGameSpeed = () => {
      const speeds = [0.5, 1.0, 1.25, 1.5, 2.0, 3.0];
      let nextSpeed = speeds.find(s => s > appSettings.gameSpeed + 0.01); 
      if (!nextSpeed) nextSpeed = speeds[0]; 
      setAppSettings(prev => ({ ...prev, gameSpeed: nextSpeed }));
  };

  // Loop trigger
  useEffect(() => {
    if (gamePhase === GamePhase.PLAYING && !uiState.gameOver && !uiState.victory && !isPaused) {
        lastTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gamePhase, uiState.gameOver, uiState.victory, isPaused, gameLoop]);

  let bgStyle = 'bg-slate-900';
  const scene = currentLevel.scene;
  if (gamePhase === GamePhase.PLAYING) {
      if (scene === LevelScene.LAWN_NIGHT) bgStyle = 'bg-slate-950';
      else if (scene === LevelScene.BALCONY) bgStyle = 'bg-amber-950';
      else if (scene === LevelScene.FACTORY) bgStyle = 'bg-slate-800';
      else if (scene === LevelScene.GRAVEYARD) bgStyle = 'bg-gray-900';
  }

  // Cursor Style Logic
  let cursorClass = '';
  if (stateRef.current.targetingPlantId) cursorClass = 'cursor-crosshair';
  else if (isShovelActive) cursorClass = 'cursor-help';
  else if (selectedPlant) cursorClass = 'cursor-pointer';

  return (
    <div className={`w-screen h-screen ${bgStyle} flex flex-col items-center justify-center font-sans select-none relative overflow-hidden`}>
      
      {/* ... (Menu / Selectors kept same) ... */}
      
      {/* Settings Modals etc... */}
      {gamePhase === GamePhase.MENU && (
         <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center">
            <button onClick={() => setShowSettings(true)} className="absolute top-4 left-4 p-2 text-2xl bg-slate-800 rounded-full hover:bg-slate-700 transition-colors z-50 border-2 border-slate-600 shadow-lg" title="Settings">⚙️</button>
            <h1 className="font-pixel text-6xl text-green-400 mb-8 drop-shadow-xl animate-bounce tracking-wider">REACT VS UNDEAD</h1>
            <div className="w-64 h-2 bg-green-800 mb-12 rounded-full overflow-hidden"><div className="w-full h-full bg-green-500 animate-pulse"></div></div>
            <div className="flex flex-col gap-4">
                <button onClick={() => { setGamePhase(GamePhase.LEVEL_SELECTION); restoreGameState(); }} className="px-12 py-4 bg-green-600 hover:bg-green-500 hover:scale-105 transition-all text-white font-bold rounded text-2xl font-pixel shadow-[0_0_20px_rgba(74,222,128,0.4)] border-b-8 border-green-800 active:border-b-0 active:translate-y-2">ADVENTURE</button>
                
                <button onClick={() => setGamePhase(GamePhase.EDITOR_MENU)} className="px-12 py-3 bg-blue-600 hover:bg-blue-500 hover:scale-105 transition-all text-white font-bold rounded text-lg font-pixel shadow-lg border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 flex items-center gap-2 justify-center">
                    <span>🛠️</span> EDITOR
                </button>

                <button onClick={() => setGamePhase(GamePhase.ENDLESS_SELECTION)} className="px-12 py-3 bg-red-600 hover:bg-red-500 hover:scale-105 transition-all text-white font-bold rounded text-lg font-pixel shadow-[0_0_25px_rgba(220,38,38,0.5)] border-b-8 border-red-800 active:border-b-0 active:translate-y-2 flex items-center gap-2 justify-center">
                    <span>♾️</span> ENDLESS MODE
                </button>
                <button onClick={() => setShowDLCManager(true)} className="px-12 py-3 bg-purple-600 hover:bg-purple-500 hover:scale-105 transition-all text-white font-bold rounded text-lg font-pixel shadow-lg border-b-8 border-purple-800 active:border-b-0 active:translate-y-2 flex items-center gap-2 justify-center">
                    <span>📦</span> DLC ({enabledDLCs.length})
                </button>
            </div>
            <div className="mt-8 text-slate-500 font-pixel text-xs">VERSION 3.0 - ENDLESS UPDATE</div>
         </div>
      )}

      {/* EDITOR MENU PHASE */}
      {gamePhase === GamePhase.EDITOR_MENU && (
          <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center">
              <h2 className="text-4xl text-blue-400 font-pixel mb-12 drop-shadow-[0_4px_0_#000] animate-pulse">EDITOR MENU</h2>
              
              <div className="flex gap-8">
                  {/* Base Editor Card */}
                  <button 
                      onClick={() => { setGamePhase(GamePhase.BASE_EDITOR); restoreGameState(); }} 
                      className="w-72 h-72 bg-amber-900/20 hover:bg-amber-800/40 border-4 border-amber-600 rounded-xl p-6 flex flex-col items-center justify-center gap-6 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(217,119,6,0.3)] group"
                  >
                      <div className="text-7xl group-hover:scale-110 transition-transform drop-shadow-xl">⚙️</div>
                      <div className="flex flex-col items-center">
                          <div className="text-2xl text-amber-400 font-pixel text-center leading-tight">BASE<br/>EDITOR</div>
                          <div className="w-12 h-1 bg-amber-600 rounded-full my-3 group-hover:w-24 transition-all"></div>
                      </div>
                      <div className="text-xs text-amber-200/60 text-center font-mono leading-relaxed px-4">
                          Modify core game stats.<br/>Tweak balance of vanilla plants and zombies.
                      </div>
                  </button>

                  {/* Level/DLC Editor Card */}
                  <button 
                      onClick={() => { setGamePhase(GamePhase.LEVEL_EDITOR); restoreGameState(); }} 
                      className="w-72 h-72 bg-blue-900/20 hover:bg-blue-800/40 border-4 border-blue-600 rounded-xl p-6 flex flex-col items-center justify-center gap-6 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] group"
                  >
                      <div className="text-7xl group-hover:scale-110 transition-transform drop-shadow-xl">📦</div>
                      <div className="flex flex-col items-center">
                          <div className="text-2xl text-blue-400 font-pixel text-center leading-tight">DLC / LEVEL<br/>EDITOR</div>
                          <div className="w-12 h-1 bg-blue-600 rounded-full my-3 group-hover:w-24 transition-all"></div>
                      </div>
                      <div className="text-xs text-blue-200/60 text-center font-mono leading-relaxed px-4">
                          Create new DLC packs.<br/>Design custom levels, plants, and zombies.
                      </div>
                  </button>
              </div>

              <button onClick={() => setGamePhase(GamePhase.MENU)} className="mt-16 px-8 py-3 text-slate-400 hover:text-white font-pixel text-xl hover:underline transition-colors">
                  &lt; BACK TO MENU
              </button>
          </div>
      )}

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={appSettings} onUpdateSettings={setAppSettings} />
      {showDLCManager && <DLCManager enabledDLCs={enabledDLCs} onSave={handleSaveDLCs} onClose={() => setShowDLCManager(false)} />}
      
      {/* Phases */}
      {gamePhase === GamePhase.LEVEL_SELECTION && <LevelSelector onSelectLevel={handleLevelSelect} onBack={() => setGamePhase(GamePhase.MENU)} />}
      {/* Update onBack to return to EDITOR_MENU */}
      {gamePhase === GamePhase.LEVEL_EDITOR && <LevelEditor onPlay={handleEditorPlay} onBack={() => setGamePhase(GamePhase.EDITOR_MENU)} />}
      {gamePhase === GamePhase.BASE_EDITOR && <BaseEditor onBack={() => setGamePhase(GamePhase.EDITOR_MENU)} />}
      
      {gamePhase === GamePhase.ENDLESS_SELECTION && (
          <EndlessModeSelector 
              onBack={() => setGamePhase(GamePhase.MENU)} 
              onStartGame={handleStartEndless} 
          />
      )}

      {gamePhase === GamePhase.ENDLESS_SHOP && (
          <EndlessShop 
              floor={endlessState.floor}
              score={stateRef.current.score}
              inventory={endlessState.inventory}
              onBuy={(type, cost) => {
                  stateRef.current.score -= cost;
                  setEndlessState(prev => ({
                      ...prev,
                      inventory: { ...prev.inventory, [type]: (prev.inventory[type] || 0) + 1 }
                  }));
                  setUiState(prev => ({ ...prev, score: stateRef.current.score })); // Force UI update
                  saveEndlessProgress();
              }}
              onContinue={() => {
                  const nextLevel = generateEndlessLevel(endlessState.floor + 1);
                  setEndlessState(prev => ({ ...prev, floor: endlessState.floor + 1 }));
                  resetGame(nextLevel, { keepProgress: true }); // Pass keepProgress
                  setGamePhase(GamePhase.SELECTION);
              }}
          />
      )}

      {gamePhase === GamePhase.SELECTION && <PlantSelector selectedPlants={deck} onTogglePlant={handlePlantSelect} onStartGame={handleStartLevel} onBack={() => setGamePhase(GamePhase.MENU)} levelConfig={currentLevel} unlockedPlants={currentLevel.id >= 100 || endlessState.active ? Object.keys(PLANT_STATS) as PlantType[] : unlockedPlants} isEndless={endlessState.active} onSaveAndQuit={handleSaveAndQuit} />}
      
      {stateRef.current.activeTextOverlay && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
              <div className={`px-12 py-6 rounded-xl border-4 backdrop-blur-sm animate-bounce-subtle ${stateRef.current.activeTextOverlay.style === 'WARNING' ? 'bg-red-900/80 border-red-500 text-red-100' : stateRef.current.activeTextOverlay.style === 'SPOOKY' ? 'bg-purple-900/80 border-purple-500 text-purple-100 font-serif italic' : 'bg-blue-900/80 border-blue-500 text-blue-100'}`}>
                  <h2 className="text-4xl font-pixel text-center drop-shadow-md">{stateRef.current.activeTextOverlay.content}</h2>
              </div>
          </div>
      )}

      {gamePhase === GamePhase.PLAYING && (
          <div className="relative flex items-center justify-center mt-8">
            <button onClick={() => setPaused(true)} className="absolute -top-32 right-0 z-50 w-12 h-12 bg-slate-800 border-2 border-slate-500 rounded flex items-center justify-center hover:bg-slate-700 text-white font-pixel shadow-lg active:translate-y-1 active:shadow-none" title="Pause Menu (ESC)">⏸</button>
             <button onClick={toggleGameSpeed} className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-slate-800/90 border-2 border-slate-500 hover:bg-slate-700 hover:border-green-400 rounded-full flex flex-col items-center justify-center text-white font-pixel shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all active:scale-95 group" title="Toggle Game Speed">
                <span className="text-xl group-hover:scale-110 transition-transform">⏩</span>
                <span className="text-[10px] font-bold text-green-400 mt-1">{appSettings.gameSpeed}x</span>
            </button>
            
            {/* ENDLESS CONSUMABLES HUD */}
            {endlessState.active && (
                <div className="fixed bottom-6 left-6 z-50 flex gap-2">
                    {Object.entries(CONSUMABLES).map(([key, item]) => {
                        const type = key as ConsumableType;
                        const count = endlessState.inventory[type] || 0;
                        if (count <= 0) return null;
                        return (
                            <button 
                                key={type} 
                                onClick={() => handleUseConsumable(type)}
                                className="w-16 h-16 bg-slate-800/90 border-2 border-yellow-500 rounded-lg flex flex-col items-center justify-center relative hover:scale-110 transition-transform shadow-lg active:scale-95"
                                title={item.name}
                            >
                                <span className="text-2xl">{item.icon}</span>
                                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white">
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {isPaused && (
                <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center backdrop-blur-sm bg-black/60 rounded-xl">
                    <div className="bg-slate-800 border-4 border-slate-600 p-8 rounded-xl flex flex-col gap-4 shadow-2xl min-w-[300px]">
                        <h2 className="text-3xl text-yellow-400 font-pixel text-center mb-4 drop-shadow-md">PAUSED</h2>
                        <button onClick={() => setPaused(false)} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-pixel rounded border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all hover:scale-105">RESUME</button>
                        <button onClick={() => setShowSettings(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-pixel rounded border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all hover:scale-105">SETTINGS</button>
                        <button onClick={() => { setPaused(false); setGamePhase(GamePhase.MENU); restoreGameState(); }} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-pixel rounded border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all hover:scale-105">EXIT TO MENU</button>
                    </div>
                </div>
            )}

            <div className="absolute -top-28 left-1/2 -translate-x-1/2 p-2 bg-slate-900/90 rounded-lg border-2 border-slate-600 flex gap-2 shadow-2xl z-50 items-end">
                <div className="w-16 h-20 bg-yellow-900/50 rounded border border-yellow-600/50 flex flex-col items-center justify-center relative mr-2">
                     <div className="text-3xl drop-shadow-lg animate-pulse">☀️</div>
                     <div className="font-pixel text-lg text-yellow-400 mt-1">{uiState.sun}</div>
                </div>
                {endlessState.active && (
                    <div className="w-16 h-20 bg-blue-900/50 rounded border border-blue-600/50 flex flex-col items-center justify-center relative mr-2">
                        <div className="text-xs text-blue-300 font-pixel">FLOOR</div>
                        <div className="font-pixel text-2xl text-white mt-1">{endlessState.floor}</div>
                    </div>
                )}
                {deck.map((plantType) => {
                    const plant = PLANT_STATS[plantType];
                    const canAfford = stateRef.current.sun >= plant.cost;
                    const isSelected = selectedPlant === plantType;
                    return (
                        <div key={plantType} onClick={() => handlePlantSelect(plantType)} className={`relative w-14 h-20 rounded border-2 cursor-pointer transition-all flex flex-col items-center justify-center ${isSelected ? 'bg-slate-700 border-green-400 scale-105 brightness-125' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'} ${!canAfford ? 'opacity-50 grayscale' : ''}`}>
                            <div className="text-2xl drop-shadow-md">{plant.icon}</div>
                            <div className="text-[10px] font-pixel text-white absolute bottom-1">{plant.cost}</div>
                        </div>
                    );
                })}
                <div onClick={handleShovelToggle} className={`w-14 h-20 ml-2 rounded border-2 cursor-pointer transition-all flex flex-col items-center justify-center ${isShovelActive ? 'bg-red-900/50 border-red-500 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}`}>
                    <div className="text-3xl">🥄</div>
                </div>
            </div>

            <div className={`w-[110px] h-[560px] border-y-8 border-l-8 rounded-l-lg relative z-0 flex flex-col justify-around py-4 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] ${scene === LevelScene.BALCONY ? 'bg-amber-800 border-amber-950' : scene === LevelScene.FACTORY ? 'bg-slate-700 border-slate-900' : scene === LevelScene.GRAVEYARD ? 'bg-stone-800 border-stone-950' : 'bg-amber-900/40 border-amber-950'}`}>
                 {[0,1,2,3,4].map(i => <div key={i} className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 mx-auto" />)}
            </div>

            <div className={`relative border-y-8 border-r-8 rounded-r-lg shadow-2xl ${scene === LevelScene.LAWN_NIGHT ? 'bg-indigo-950 border-indigo-900' : scene === LevelScene.BALCONY ? 'bg-amber-900 border-amber-950' : scene === LevelScene.FACTORY ? 'bg-slate-800 border-slate-900' : 'bg-green-800 border-green-900'} ${cursorClass}`} style={{ width: '900px', height: '560px' }}>
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="absolute inset-0 grid grid-rows-5 grid-cols-9 gap-0 z-0">
                        {grid.map((row, rIndex) => (row.map((cell, cIndex) => (
                                <GridCell 
                                    key={`${rIndex}-${cIndex}`} 
                                    row={rIndex} col={cIndex} plant={cell} 
                                    isDragOver={dragOverCell?.row === rIndex && dragOverCell?.col === cIndex} 
                                    scene={scene} 
                                    isTargeting={!!stateRef.current.targetingPlantId}
                                />
                            ))))}
                </div>
                
                {/* ALWAYS RENDER OVERLAY, JUST CONTROL POINTER EVENTS IMPLICITLY BY EXISTENCE, BUT HERE WE ALWAYS WANT TO CAPTURE */}
                {/* Fixed: We need this overlay to capture hover events efficiently for the grid, but we must make sure click-through works or handle it here */}
                {/* Current logic: handleInteraction handles everything. */}
                <div className={`absolute inset-0 z-40`} 
                     onContextMenu={(e) => { e.preventDefault(); setSelectedPlant(null); setDragOverCell(null); setShovelActive(false); stateRef.current.targetingPlantId = null; }} 
                     onClick={(e) => handleInteraction(e, 'click')} 
                     onMouseMove={(e) => handleInteraction(e, 'hover')} 
                     onMouseLeave={(e) => handleInteraction(e, 'leave')} 
                     onDragOver={(e) => { e.preventDefault(); handleInteraction(e, 'hover'); }} 
                     onDrop={(e) => { e.preventDefault(); handleInteraction(e, 'click'); }} 
                />
                
                <EntitiesLayer gameStateRef={stateRef} onCollectSun={handleCollectSun} />
            </div>

            <div className="absolute -bottom-16 right-0 w-64 h-6 bg-slate-900 rounded-full border-2 border-slate-600 overflow-hidden shadow-xl">
                 <div className="relative w-full h-full">
                     <div className="absolute top-0 right-0 h-full bg-gradient-to-l from-green-500 to-yellow-500 transition-all duration-500" style={{ width: `${(uiState.wave / (currentLevel.totalWaves || (currentLevel.waves?.length || 1))) * 100}%` }} />
                     <div className="absolute top-0 right-1/2 -translate-y-1 text-xs">🚩</div>
                 </div>
            </div>
          </div>
      )}

      {uiState.gameOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm z-0"></div>
            <div className="z-10 flex flex-col items-center animate-fall" style={{'--target-y': '0px'} as React.CSSProperties}>
                <div className="text-[120px] mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] filter brightness-75 grayscale contrast-125">🧟‍♂️</div>
                <h1 className="font-pixel text-7xl text-red-600 mb-2 drop-shadow-[0_4px_0_#000] tracking-widest uppercase animate-pulse">GAME OVER</h1>
                <div className="flex gap-4 mt-8">
                    <button onClick={() => { setUiState(prev => ({ ...prev, gameOver: false })); setGamePhase(GamePhase.MENU); }} className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded font-pixel text-xl border-4 border-slate-500 shadow-2xl">MENU</button>
                    <button onClick={() => { setUiState(prev => ({ ...prev, gameOver: false })); resetGame(currentLevel); setGamePhase(GamePhase.SELECTION); }} className="px-12 py-4 bg-slate-800 hover:bg-red-900 text-white rounded font-pixel text-xl border-4 border-slate-600 hover:border-red-500 shadow-2xl transition-all hover:scale-105">TRY AGAIN</button>
                </div>
            </div>
        </div>
      )}
      {uiState.victory && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/90 to-green-800/90 backdrop-blur-md z-0"></div>
           <div className="z-10 flex flex-col items-center">
              <div className="text-[150px] mb-4 drop-shadow-[0_0_50px_rgba(253,224,71,0.6)] animate-bounce-subtle">🏆</div>
              <h1 className="font-pixel text-6xl text-yellow-300 mb-4 drop-shadow-[0_4px_0_rgba(161,98,7,1)] tracking-wider">LEVEL CLEAR!</h1>
              
              {endlessState.active ? (
                  <div className="flex flex-col items-center">
                      <div className="text-2xl text-white font-pixel mb-4">FLOOR {endlessState.floor} COMPLETE</div>
                      <button onClick={handleEndlessVictory} className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-pixel text-xl shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
                          NEXT FLOOR
                      </button>
                  </div>
              ) : (
                  <>
                    {/* Unlock Reward Notification */}
                    {currentLevel.unlocksPlant && (
                        <div className="bg-slate-800/80 p-6 rounded-lg border-2 border-yellow-500 flex flex-col items-center mb-6 animate-pulse">
                            <div className="text-yellow-400 font-pixel text-sm mb-2">NEW PLANT UNLOCKED!</div>
                            <div className="text-6xl mb-2 filter drop-shadow-[0_0_15px_rgba(255,255,0,0.5)]">
                                {PLANT_STATS[currentLevel.unlocksPlant].icon}
                            </div>
                            <div className="text-white font-bold">{PLANT_STATS[currentLevel.unlocksPlant].name}</div>
                        </div>
                    )}

                    <div className="flex gap-4 mt-4">
                        <button onClick={() => { setUiState(prev => ({ ...prev, victory: false })); setGamePhase(GamePhase.MENU); restoreGameState(); }} className="px-10 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-pixel text-xl shadow-[0_5px_0_rgb(51,65,85)] active:shadow-none active:translate-y-[5px] transition-all border-2 border-slate-500">MAIN MENU</button>
                    </div>
                  </>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
