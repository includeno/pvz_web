
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
  ConsumableType,
  TrajectoryType,
  AnimationState
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
  CONSUMABLES,
  CELL_HEIGHT
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
import { t, tEntity } from './i18n';

const createGrid = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

const STAGE_WIDTH = 1050;
const STAGE_HEIGHT = 700; 

const App: React.FC = () => {
  const [enabledDLCs, setEnabledDLCs] = useState<string[]>([]);
  const [unlockedPlants, setUnlockedPlants] = useState<PlantType[]>(Object.values(BasePlantType));
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scaleX = w / STAGE_WIDTH;
        const scaleY = h / STAGE_HEIGHT;
        const newScale = Math.min(scaleX, scaleY) * 0.95; 
        setScale(newScale);
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 10);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { 
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
  
  const [showSettings, setShowSettings] = useState(false);
  const [showDLCManager, setShowDLCManager] = useState(false);
  const [isPaused, setPaused] = useState(false);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
      musicVolume: 0.5,
      sfxVolume: 0.8,
      gameSpeed: 1.0,
      language: 'zh'
  });

  const lang = appSettings.language;

  const [endlessState, setEndlessState] = useState<{
      active: boolean;
      slotId: number | null;
      floor: number;
      inventory: Record<string, number>;
  }>({ active: false, slotId: null, floor: 1, inventory: {} });

  const restoreGameState = () => {
      RESTORE_CONSTANTS();
      if (enabledDLCs.length > 0) {
          reloadDLCs(enabledDLCs);
      }
      setEndlessState(prev => ({ ...prev, active: false }));
  };

  const currentWaveIndexRef = useRef<number>(0);
  const waveStartTimeRef = useRef<number>(0);
  const zombiesSpawnedInWaveRef = useRef<number>(0);
  
  const stateRef = useRef<GameState>({
    sun: 150, grid: createGrid(), zombies: [], projectiles: [], suns: [], lawnCleaners: [], effects: [], decorations: [],
    gameOver: false, victory: false, wave: 1, score: 0, time: 0, activeTextOverlay: undefined, targetingPlantId: null
  });

  useEffect(() => {
      if (stateRef.current.grid.length !== ROWS) {
          const newGrid = createGrid();
          stateRef.current.grid = newGrid;
          setGrid(newGrid);
      }
      if (stateRef.current.lawnCleaners.length !== ROWS) {
          stateRef.current.lawnCleaners = Array.from({ length: ROWS }, (_, i) => ({
            id: uuidv4(),
            row: i,
            position: { row: i, col: -1, x: -0.1 }, 
            active: false,
        }));
      }
  }, [gamePhase]);

  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const nextSunSpawnRef = useRef<number>(0);
  const nextZombieSpawnRef = useRef<number>(0);
  const nextWaveRef = useRef<number>(0);

  const resetGame = useCallback((level: LevelConfig, options: { keepProgress?: boolean, fromSave?: EndlessSaveSlot } = {}) => {
     setCurrentLevel(level);
     currentWaveIndexRef.current = 0;
     waveStartTimeRef.current = 0;
     zombiesSpawnedInWaveRef.current = 0;
     
     // Start Natural Sun quickly (1000ms)
     nextSunSpawnRef.current = 1000; 
     nextZombieSpawnRef.current = 0;
     nextWaveRef.current = 0;
     lastTimeRef.current = 0;

     setAppSettings(prev => ({ ...prev, gameSpeed: 1.0 }));

     let startScore = 0;
     let initialGrid = createGrid();
     let initialSun = level.startingSun;
     
     if (options.keepProgress && stateRef.current) {
         startScore = stateRef.current.score;
         const oldGrid = stateRef.current.grid;
         initialGrid = initialGrid.map((row, r) => {
             if (r < oldGrid.length) {
                 return oldGrid[r].map(plant => plant ? {...plant, createdAt: plant.createdAt - stateRef.current.time, lastActionTime: plant.lastActionTime - stateRef.current.time } : null);
             }
             return row;
         });
         initialSun = stateRef.current.sun;
     }

     if (options.fromSave) {
         startScore = options.fromSave.score;
         if (options.fromSave.gridSnapshot && options.fromSave.gridSnapshot.length > 0) {
             initialGrid = initialGrid.map((row, r) => {
                 if (options.fromSave && options.fromSave.gridSnapshot && r < options.fromSave.gridSnapshot.length) {
                     return options.fromSave.gridSnapshot[r].map(plant => plant ? {...plant} : null);
                 }
                 return row;
             });
         }
     }

     stateRef.current = {
        sun: initialSun,
        grid: initialGrid,
        zombies: [],
        projectiles: [],
        suns: options.fromSave?.sunSnapshot ? options.fromSave.sunSnapshot : [],
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gamePhase === GamePhase.PLAYING) {
             if (stateRef.current.targetingPlantId) {
                 stateRef.current.targetingPlantId = null;
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
      const waves = Math.min(20, 5 + Math.floor(floor / 2));
      const zombies = Object.keys(ZOMBIE_STATS) as ZombieType[];
      const numTypes = Math.min(zombies.length, 3 + Math.floor(floor / 3));
      const enabledZombies: ZombieType[] = [];
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
          enabledZombies,
          spawnIntervalMultiplier: Math.max(0.2, 1.2 - (floor * 0.05)),
          difficulty: Math.min(10, Math.ceil(floor / 5)),
          seedSlots: 10
      };
  };

  const handleStartEndless = (save: EndlessSaveSlot) => {
      RESTORE_CONSTANTS();
      Object.assign(PLANT_STATS, save.statsSnapshot.plants);
      Object.assign(ZOMBIE_STATS, save.statsSnapshot.zombies);
      setEndlessState({ active: true, slotId: save.id, floor: save.floor, inventory: save.inventory });
      stateRef.current.score = save.score;
      const level = generateEndlessLevel(save.floor);
      resetGame(level, { fromSave: save });
      setGamePhase(GamePhase.SELECTION);
  };
  
  const saveEndlessProgress = () => {
      if (!endlessState.active || endlessState.slotId === null) return;
      const stored = localStorage.getItem('pvz_endless_saves');
      let saves: EndlessSaveSlot[] = stored ? JSON.parse(stored) : [];
      const idx = saves.findIndex(s => s.id === endlessState.slotId);
      const currentGridSnapshot = stateRef.current.grid.map(row => row.map(plant => plant ? { ...plant, createdAt: plant.createdAt - stateRef.current.time, lastActionTime: plant.lastActionTime - stateRef.current.time } : null));
      const currentSunSnapshot = stateRef.current.suns.map(s => ({ ...s, createdAt: s.createdAt - stateRef.current.time }));
      if (idx > -1) {
          saves[idx].floor = endlessState.floor;
          saves[idx].score = stateRef.current.score;
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
      if (nextFloor % 5 === 0) {
          setGamePhase(GamePhase.ENDLESS_SHOP);
      } else {
          const level = generateEndlessLevel(nextFloor);
          resetGame(level, { keepProgress: true });
          setGamePhase(GamePhase.SELECTION);
      }
  };
  
  const handleSaveAndQuit = () => { saveEndlessProgress(); setGamePhase(GamePhase.MENU); restoreGameState(); };
  
  const handleUseConsumable = (type: ConsumableType) => {
      if (!endlessState.inventory[type] || endlessState.inventory[type] <= 0) return;
      if (type === ConsumableType.SUN_PACK) { stateRef.current.sun += 500; setUiState(prev => ({ ...prev, sun: stateRef.current.sun })); } 
      else if (type === ConsumableType.REPAIR_KIT) { stateRef.current.grid.forEach(row => row.forEach(p => { if(p) p.health = p.maxHealth; })); } 
      else if (type === ConsumableType.TACTICAL_NUKE) { stateRef.current.effects.push({ id: uuidv4(), type: 'DOOM_EXPLOSION', row: 2, col: 4, createdAt: Date.now(), duration: 2000 }); stateRef.current.zombies.forEach(z => z.health = -9999); } 
      else if (type === ConsumableType.TIME_FREEZE) { stateRef.current.effects.push({ id: uuidv4(), type: 'FREEZE', createdAt: Date.now(), duration: 10000 }); stateRef.current.zombies.forEach(z => z.freezeEffect = 10000); }
      setEndlessState(prev => ({ ...prev, inventory: { ...prev.inventory, [type]: prev.inventory[type] - 1 } }));
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const rawDelta = timestamp - lastTimeRef.current;
    const cappedDelta = Math.min(rawDelta, 100); 
    const deltaTime = cappedDelta * appSettings.gameSpeed;
    lastTimeRef.current = timestamp;

    const currentState = stateRef.current;
    const currentStats = ZOMBIE_STATS; 
    
    if (currentState.gameOver || currentState.victory || isPaused) return;

    let { grid: gridData, zombies, projectiles, suns, lawnCleaners, effects, time } = currentState;
    let gridDirty = false; 
    let uiDirty = false;  

    time += deltaTime;
    currentState.time = time;
    currentState.effects = effects.filter(e => (Date.now() - e.createdAt) < e.duration); 
    if (currentState.activeTextOverlay && time > currentState.activeTextOverlay.endTime) { currentState.activeTextOverlay = undefined; uiDirty = true; }
    if (currentLevel.events) { currentLevel.events.forEach(ev => { if (time >= ev.time && time - deltaTime < ev.time) { currentState.activeTextOverlay = { content: ev.content, style: ev.style, endTime: time + ev.duration }; uiDirty = true; } }); }

    // 1. Natural Sun Spawning
    if (time > nextSunSpawnRef.current) {
      console.log(`[Game] Spawning Natural Sun at time: ${Math.floor(time)}`);
      // Spawn at random column, top off-screen
      suns.push({ 
          id: uuidv4(), 
          position: { row: -1, col: -1, x: Math.random() * 0.8 + 0.1, y: -10 }, 
          targetY: Math.random() * 60 + 20, 
          value: 25, 
          createdAt: time, 
          isCollected: false 
      });
      nextSunSpawnRef.current = time + (NATURAL_SUN_INTERVAL || 4000);
    }

    // --- SUN PHYSICS (Update Positions) ---
    suns.forEach(sun => {
        if (!sun.isCollected) {
            // Move Y towards target
            if (sun.position.y < sun.targetY) {
                // Fall speed
                sun.position.y += (0.03 * deltaTime); // Increased speed slightly
            }
        }
    });

    // ... [Zombies and Projectiles Logic] ...
    if (currentLevel.mode === 'SCRIPTED' && currentLevel.waves) {
        const waveIdx = currentWaveIndexRef.current;
        if (waveIdx < currentLevel.waves.length) {
            const waveDef = currentLevel.waves[waveIdx];
            if (waveStartTimeRef.current === 0) {
                if (time > (waveDef.startDelay || 5000)) { 
                    waveStartTimeRef.current = time; 
                    if (waveDef.isFlagWave) { setShowHugeWave(true); setTimeout(() => setShowHugeWave(false), 4000); }
                    uiDirty = true; currentState.wave = waveDef.waveNumber;
                }
            } else {
                const zombiesInThisWave: ZombieType[] = [];
                waveDef.zombies.forEach(grp => { for(let i=0; i<grp.count; i++) zombiesInThisWave.push(grp.type); });
                const totalToSpawn = zombiesInThisWave.length;
                if (zombiesSpawnedInWaveRef.current < totalToSpawn) {
                    if (time > nextZombieSpawnRef.current) {
                        const zType = zombiesInThisWave[zombiesSpawnedInWaveRef.current];
                        const stats = currentStats[zType] || ZOMBIE_STATS[BaseZombieType.NORMAL];
                        const spawnRow = Math.floor(Math.random() * ROWS);
                        zombies.push({
                            id: uuidv4(), type: zType, position: { row: spawnRow, col: COLS, x: 1.05 }, 
                            health: stats.health, maxHealth: stats.health, speed: stats.speed, 
                            isEating: false, attackDamage: stats.damage, freezeEffect: 0, stunEffect: 0, isDying: false, dyingSince: 0,
                            abilityCooldowns: {} 
                        });
                        zombiesSpawnedInWaveRef.current++;
                        nextZombieSpawnRef.current = time + (1500 * (currentLevel.spawnIntervalMultiplier || 1));
                    }
                } else if (time > nextZombieSpawnRef.current + 10000) {
                        currentWaveIndexRef.current++; waveStartTimeRef.current = 0; zombiesSpawnedInWaveRef.current = 0; nextZombieSpawnRef.current = time; 
                }
            }
        } else if (zombies.length === 0) {
            currentState.victory = true; if (endlessState.active) handleEndlessVictory(); else { if (currentLevel.unlocksPlant && !unlockedPlants.includes(currentLevel.unlocksPlant)) setUnlockedPlants(prev => [...prev, currentLevel.unlocksPlant!]); setUiState(prev => ({ ...prev, victory: true })); }
        }
    } else {
        if (time > nextZombieSpawnRef.current && currentState.wave <= (currentLevel.totalWaves || 10)) {
            const spawnRow = Math.floor(Math.random() * ROWS);
            const isWave = time > nextWaveRef.current;
            let count = isWave ? Math.floor(currentState.wave * 1.5) + 2 : 1;
            if (isWave && currentState.wave === currentLevel.totalWaves) count = 15;
            for(let i=0; i<count; i++) {
                const allowedTypes = currentLevel.enabledZombies;
                const validTypes = allowedTypes.filter(t => currentStats[t]);
                const zType = validTypes.length > 0 ? validTypes[Math.floor(Math.random() * validTypes.length)] : BaseZombieType.NORMAL;
                if (currentStats[zType]) {
                    const stats = currentStats[zType];
                    zombies.push({
                        id: uuidv4(), type: zType, position: { row: spawnRow, col: COLS, x: 1.05 + (i * 0.15) }, 
                        health: stats.health, maxHealth: stats.health, speed: stats.speed + (Math.random() * 0.01), 
                        isEating: false, attackDamage: stats.damage, freezeEffect: 0, stunEffect: 0, isDying: false, dyingSince: 0, abilityCooldowns: {}
                    });
                }
            }
            if (isWave) { currentState.wave++; nextWaveRef.current = time + WAVE_INTERVAL; uiDirty = true; if (currentState.wave === Math.floor((currentLevel.totalWaves||10)/2) || currentState.wave === currentLevel.totalWaves) { setShowHugeWave(true); setTimeout(() => setShowHugeWave(false), 4000); } }
            nextZombieSpawnRef.current = time + (Math.max(1500, 8000 - (currentState.wave * 500)) * (currentLevel.spawnIntervalMultiplier || 1));
        } else if (currentState.wave > (currentLevel.totalWaves || 10) && zombies.length === 0) {
            currentState.victory = true; if (endlessState.active) handleEndlessVictory(); else { if (currentLevel.unlocksPlant && !unlockedPlants.includes(currentLevel.unlocksPlant)) setUnlockedPlants(prev => [...prev, currentLevel.unlocksPlant!]); setUiState(prev => ({ ...prev, victory: true })); }
        }
    }

    // 3. Projectiles & Physics
    const nextProjectiles: Projectile[] = [];
    projectiles.forEach(p => {
        if (p.trajectory === TrajectoryType.PARABOLIC || p.trajectory === TrajectoryType.LOBBED) {
            if (!p.startTime) p.startTime = time;
            const progress = Math.min(1, (time - p.startTime) / (p.flightDuration || 1000));
            const startX = p.startX || 0;
            const targetX = (p.destX !== undefined ? p.destX : p.position.x || 0);
            const startRow = p.startRow !== undefined ? p.startRow : p.row;
            const targetRow = p.destRow !== undefined ? p.destRow : p.row;
            p.position.x = startX + (targetX - startX) * progress;
            const currentRow = startRow + (targetRow - startRow) * progress;
            p.row = currentRow;
            const arcHeight = p.arcHeight || 100;
            p.verticalOffset = -Math.sin(progress * Math.PI) * arcHeight;

            if (progress >= 1.0) {
                if (p.type === ProjectileType.COB) {
                    currentState.effects.push({ id: uuidv4(), type: 'DOOM_EXPLOSION', row: p.destRow, col: Math.round(targetX * COLS), createdAt: Date.now(), duration: 1500 });
                    const r = p.destRow || 0; const c = Math.round(targetX * COLS);
                    currentState.zombies.forEach(z => { if (!z.isDying) { const zCol = Math.floor((z.position.x || 0) * COLS); if (Math.abs(z.position.row - r) <= 1 && Math.abs(zCol - c) <= 1) z.health -= COB_DAMAGE; } });
                } else if (p.type === ProjectileType.MELON || p.type === ProjectileType.KERNEL) {
                    const dmgRadius = p.type === ProjectileType.MELON ? 1.5 : 0.5;
                    currentState.effects.push({ id: uuidv4(), type: 'EXPLOSION', row: Math.round(p.row), col: Math.round(p.position.x! * COLS), createdAt: Date.now(), duration: 300 });
                    currentState.zombies.forEach(z => { 
                        if (!z.isDying) {
                            const dx = Math.abs((z.position.x || 0) - (p.position.x || 0)) * COLS;
                            const dy = Math.abs(z.position.row - p.row);
                            if (Math.sqrt(dx*dx + dy*dy) < dmgRadius) {
                                z.health -= p.damage;
                                if (p.type === ProjectileType.FROZEN) z.freezeEffect = 5000;
                                else if (p.type === ProjectileType.BUTTER) z.stunEffect = 3000;
                            }
                        }
                    });
                }
            } else {
                nextProjectiles.push(p);
            }
        } else {
            if (p.homing && !p.vector) {
                let nearest: Zombie | null = null;
                let minDist = 999;
                currentState.zombies.forEach(z => {
                    if (z.isDying) return;
                    const dx = (z.position.x || 0) - (p.position.x || 0);
                    const dy = z.position.row - p.row;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dx > 0 && dist < 4.0 && dist < minDist) {
                        minDist = dist;
                        nearest = z;
                    }
                });
                if (nearest) {
                    const z = nearest as Zombie;
                    const dx = (z.position.x || 0) - (p.position.x || 0);
                    const dy = z.position.row - p.row;
                    const angle = Math.atan2(dy, dx);
                    p.vector = { x: Math.cos(angle), y: Math.sin(angle) };
                }
            } else if (p.homing && p.vector) {
                let nearest: Zombie | null = null;
                let minDist = 999;
                currentState.zombies.forEach(z => {
                    if (z.isDying) return;
                    const dx = (z.position.x || 0) - (p.position.x || 0);
                    const dy = z.position.row - p.row;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 4.0 && dist < minDist) {
                         minDist = dist; nearest = z;
                    }
                });
                 if (nearest) {
                    const z = nearest as Zombie;
                    const dx = (z.position.x || 0) - (p.position.x || 0);
                    const dy = z.position.row - p.row;
                    const angleToTarget = Math.atan2(dy, dx);
                    const angleCurrent = Math.atan2(p.vector.y, p.vector.x);
                    const steerRate = 0.1;
                    const newAngle = angleCurrent + (angleToTarget - angleCurrent) * steerRate;
                    p.vector = { x: Math.cos(newAngle), y: Math.sin(newAngle) };
                }
            }
            const speed = p.speed * (deltaTime / 1000);
            if (p.vector) { p.position.x = (p.position.x || 0) + (p.vector.x * speed); p.row += (p.vector.y * speed); } else { p.position.x = (p.position.x || 0) + speed; }
            const col = Math.floor(p.position.x || 0);
            if (!p.vector && col >= 0 && col < COLS) { const plant = gridData[Math.round(p.row)][col]; if (plant && plant.type === 'TORCHWOOD' && (p.type === ProjectileType.NORMAL || p.type === ProjectileType.FROZEN)) { p.type = ProjectileType.FIRE; p.damage = PROJECTILE_DAMAGE * 2; } }
            if ((p.position.x || 0) < 1.1 && (p.position.x || 0) > -0.1 && p.row > -1 && p.row < ROWS) nextProjectiles.push(p);
        }
    });
    currentState.projectiles = nextProjectiles;

    const nextCleaners: LawnCleaner[] = [];
    lawnCleaners.forEach(cleaner => {
        if (cleaner.active) {
            cleaner.position.x = (cleaner.position.x || 0) + (CLEANER_SPEED * (deltaTime / 1000));
            zombies.forEach(z => { if (z.position.row === cleaner.row && !z.isDying && Math.abs((cleaner.position.x||0) - (z.position.x||0)) < 0.1) z.health = -9999; });
        }
        if ((cleaner.position.x || 0) < 1.1) nextCleaners.push(cleaner);
    });
    currentState.lawnCleaners = nextCleaners;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const plant = gridData[r][c];
        if (plant) {
          const plantConfig = PLANT_STATS[plant.type];
          if (plant.state === 'ATTACK' && time - plant.lastActionTime > 1000) {
              plant.state = 'IDLE';
              gridDirty = true;
          }
          if (plant.type === BasePlantType.COB_CANNON && !plant.isReady) { 
              if (time - plant.lastActionTime > plantConfig.cooldown) { 
                  plant.isReady = true; gridDirty = true; 
              } 
          }
          if (plant.type === 'POTATO_MINE' && !plant.isReady && time - plant.createdAt > 15000) { plant.isReady = true; gridDirty = true; }
          
          if (plantConfig.abilities) {
              plantConfig.abilities.forEach(ability => {
                  if (ability.type === 'PRODUCE_SUN') {
                      // Ensure abilityCooldowns initialized
                      if (!plant.abilityCooldowns) plant.abilityCooldowns = {};
                      
                      const lastProd = plant.abilityCooldowns[ability.type] || plant.createdAt;
                      const interval = ability.interval || 10000;
                      // Allow producing if NO active sun from this plant
                      const hasActiveSun = suns.some(s => s.sourcePlantId === plant.id && !s.isCollected);
                      
                      if (!hasActiveSun && time - lastProd > interval) {
                          console.log(`[Game] Plant ${plant.type} at ${r},${c} producing sun at time: ${Math.floor(time)}`);
                          
                          const rowHeight = 100 / ROWS;
                          // Spawn CENTERED in cell
                          // Start slightly higher to ensure it's "in front" visually 
                          const startY = (r * rowHeight) + 2; 
                          const targetY = (r * rowHeight) + 12;
                          
                          suns.push({ 
                              id: uuidv4(), 
                              // Start exactly at plant position
                              position: { row: r, col: c, x: (c + 0.5) / COLS, y: startY }, 
                              targetY: targetY, 
                              value: ability.sunValue || 25, 
                              createdAt: time, 
                              isCollected: false,
                              sourcePlantId: plant.id
                          });
                          plant.abilityCooldowns[ability.type] = time;
                          gridDirty = true; 
                      }
                  }
                  // ... rest of abilities (SHOOT, EXPLODE, etc.)
                  if (ability.type === 'SHOOT') {
                      const lastShot = plant.lastActionTime;
                      const interval = ability.interval || 1400;
                      if (time - lastShot > interval) {
                          if (plant.type === BasePlantType.COB_CANNON) {
                              if (plant.isReady) {
                                  let target: Zombie | null = null;
                                  let minX = 999;
                                  zombies.forEach(z => {
                                      if(!z.isDying && (z.position.x || 0) < minX) {
                                          minX = z.position.x || 0;
                                          target = z;
                                      }
                                  });
                                  if (target) {
                                      plant.state = 'ATTACK';
                                      plant.isReady = false;
                                      plant.lastActionTime = time; 
                                      setTimeout(() => {
                                         stateRef.current.projectiles.push({
                                              id: uuidv4(),
                                              type: ProjectileType.COB,
                                              damage: COB_DAMAGE,
                                              speed: 0,
                                              row: r,
                                              position: { row: r, col: c, x: (c + 0.5) / COLS },
                                              destRow: target!.position.row,
                                              destX: (target!.position.x || 0),
                                              startRow: r,
                                              startX: (c + 0.5) / COLS,
                                              trajectory: TrajectoryType.LOBBED,
                                              flightDuration: ability.flightDuration || 2000,
                                              arcHeight: ability.arcHeight || 250,
                                              visuals: ability.projectileVisuals
                                         });
                                      }, 500 / appSettings.gameSpeed); 
                                      gridDirty = true;
                                  }
                              }
                          } else {
                                let targetRows = [r]; 
                                if (plant.type === 'THREEPEATER') targetRows = [r-1, r, r+1].filter(row => row >= 0 && row < ROWS);
                                else if (plant.type === 'STARFRUIT') targetRows = [r]; 
                                let rangeLimit = 1.1; 
                                if (ability.range) rangeLimit = (c / COLS) + (ability.range / COLS);
                                const zombieInSight = zombies.some(z => targetRows.includes(z.position.row) && !z.isDying && (z.position.x || 0) > (c / COLS) && (z.position.x || 0) < rangeLimit);
                                if (zombieInSight || plant.type === 'STARFRUIT') {
                                        const fire = (row: number, delay: number = 0, vector?: {x:number, y:number}, overrideVisuals?: any) => {
                                            setTimeout(() => {
                                                let targetX = 1.0;
                                                let targetRow = row;
                                                if (ability.trajectory === TrajectoryType.PARABOLIC) {
                                                    const target = zombies.filter(z => z.position.row === row && !z.isDying && (z.position.x||0) > (c/COLS)).sort((a,b) => (a.position.x||0) - (b.position.x||0))[0]; 
                                                    if (target) { targetX = target.position.x || 1.0; targetRow = target.position.row; }
                                                }
                                                stateRef.current.projectiles.push({ 
                                                    id: uuidv4(), 
                                                    position: { row: row, col: c, x: (c / COLS) + 0.05 }, 
                                                    damage: ability.damage || 20, 
                                                    speed: PROJECTILE_SPEED, 
                                                    row: row, 
                                                    type: ability.projectileType || ProjectileType.NORMAL,
                                                    vector: vector,
                                                    homing: ability.projectileHoming,
                                                    visuals: overrideVisuals,
                                                    trajectory: ability.trajectory || TrajectoryType.STRAIGHT,
                                                    startX: (c / COLS) + 0.05,
                                                    startRow: row,
                                                    destX: targetX,
                                                    destRow: targetRow,
                                                    flightDuration: ability.flightDuration || 1000,
                                                    arcHeight: ability.arcHeight || 100
                                                });
                                            }, delay / appSettings.gameSpeed);
                                        };
                                        if (ability.projectileDirection) {
                                            const dirVec = DIRECTION_VECTORS[ability.projectileDirection] || { x:1, y:0 };
                                            fire(r, 0, dirVec, ability.projectileVisuals);
                                        } else if (plant.type === 'STARFRUIT') {
                                            fire(r, 0, {x: 1, y: 0}, ability.projectileVisuals); 
                                            fire(r, 0, {x: -1, y: 0}, ability.projectileVisuals); 
                                            fire(r, 0, {x: 0, y: -1}, ability.projectileVisuals); 
                                            fire(r, 0, {x: 0, y: 1}, ability.projectileVisuals); 
                                            fire(r, 0, {x: 0.7, y: 0.7}, ability.projectileVisuals); 
                                        } else if (plant.type === 'THREEPEATER') {
                                            targetRows.forEach(tr => fire(tr, 0, undefined, ability.projectileVisuals));
                                        } else {
                                            fire(r, 0, undefined, ability.projectileVisuals);
                                            if (ability.shotsPerTrigger && ability.shotsPerTrigger > 1) {
                                                for(let i=1; i<ability.shotsPerTrigger; i++) {
                                                    fire(r, (ability.multiShotDelay || 150) * i, undefined, ability.projectileVisuals);
                                                }
                                            }
                                        }
                                        plant.lastActionTime = time;
                                }
                          }
                      }
                  }
                  if (ability.type === 'SQUASH') {
                      const range = ability.triggerRange !== undefined ? ability.triggerRange : 0.2;
                      const target = zombies.find(z => !z.isDying && z.position.row === r && Math.abs((z.position.x || 0) - (c / COLS)) < range); 
                      if (target) {
                         if (!plant.state || plant.state === 'IDLE') { plant.state = 'ATTACK'; plant.lastActionTime = time; } 
                         else if (plant.state === 'ATTACK' && time - plant.lastActionTime > 800) {
                             zombies.forEach(z => { if (!z.isDying && z.position.row === r && Math.abs((z.position.x || 0) - (c / COLS)) < range + 0.1) z.health -= (ability.damage || 9999); });
                             currentState.effects.push({ id: uuidv4(), type: 'EXPLOSION', row: r, col: c, createdAt: Date.now(), duration: 500 });
                             if (plant.type !== 'SPIKEWEED') {
                                gridData[r][c] = null; 
                                gridDirty = true;
                             } else { plant.state = 'IDLE'; }
                         }
                      }
                  }
                  if (ability.type === 'EXPLODE') {
                      const range = ability.triggerRange || 1.5;
                      const isMine = plant.type === 'POTATO_MINE';
                      if (!isMine) {
                          if (time - plant.createdAt > (ability.cooldown || 1000)) {
                               const type = plant.type === 'DOOM_SHROOM' ? 'DOOM_EXPLOSION' : 'EXPLOSION';
                               currentState.effects.push({ id: uuidv4(), type: type as any, row: r, col: c, createdAt: Date.now(), duration: 1000 });
                               zombies.forEach(z => {
                                   const zCol = (z.position.x || 0) * COLS;
                                   const dist = Math.sqrt(Math.pow(z.position.row - r, 2) + Math.pow(zCol - c, 2));
                                   if (dist < range) z.health -= (ability.damage || 9999);
                               });
                               gridData[r][c] = null; 
                               gridDirty = true;
                          }
                      }
                  }
                  if (ability.type === 'BURN_ROW') {
                      if (time - plant.createdAt > (ability.cooldown || 1000)) {
                           currentState.effects.push({ id: uuidv4(), type: 'FIRE_ROW', row: r, col: c, createdAt: Date.now(), duration: EFFECT_DURATIONS.FIRE_ROW });
                           zombies.forEach(z => {
                               if (!z.isDying && z.position.row === r) {
                                   z.health -= (ability.damage || 9999);
                               }
                           });
                           gridData[r][c] = null; 
                           gridDirty = true;
                      }
                  }
              });
          }
        }
      }
    }

    // --- ZOMBIE LOOP ---
    const aliveZombies: Zombie[] = [];
    currentState.zombies.forEach(zombie => {
       // CRITICAL FIX: Health check to kill zombies
       if (!zombie.isDying && zombie.health <= 0) {
           zombie.isDying = true;
           zombie.dyingSince = time;
           zombie.isEating = false;
       }

       if (zombie.isDying) { if (time - zombie.dyingSince < 800) aliveZombies.push(zombie); return; }
       
       let isEating = false; 
       const zombieX = zombie.position.x || 0;
       if (zombie.freezeEffect > 0) zombie.freezeEffect -= deltaTime; else zombie.freezeEffect = 0;
       if (zombie.stunEffect > 0) zombie.stunEffect -= deltaTime; else zombie.stunEffect = 0;
       let currentSpeed = zombie.speed;
       if (zombie.type === 'NEWSPAPER' && zombie.health < (zombie.maxHealth / 2)) currentSpeed *= 3.0;
       if (zombie.freezeEffect > 0) currentSpeed *= 0.5;
       const zombieStats = ZOMBIE_STATS[zombie.type];
       if (zombieStats?.abilities) {
           zombieStats.abilities.forEach(ability => {
               const lastUsed = zombie.abilityCooldowns[ability.type] || 0;
               if (ability.initialCooldown && (time - (zombie['createdAt'] || 0) < ability.initialCooldown)) return; 
               if (time - lastUsed > (ability.cooldown || 5000)) {
                   if (ability.type === 'SUMMON' && ability.summonType) {
                       zombie.abilityCooldowns[ability.type] = time;
                       zombie.activeAbility = 'SUMMON';
                       zombie.activeAbilityTimer = time;
                       const offsets = [ {r:-1, c:0}, {r:1, c:0}, {r:0, c:-1}, {r:0, c:1} ];
                       const count = ability.summonCount || 4;
                       for(let i=0; i<count; i++) {
                           const off = offsets[i % offsets.length];
                           const nr = zombie.position.row + off.r;
                           const nc = zombieX + (off.c / COLS);
                           if (nr >= 0 && nr < ROWS && nc > 0 && nc < 1.0) {
                                aliveZombies.push({
                                    id: uuidv4(),
                                    type: ability.summonType as ZombieType,
                                    position: { row: nr, col: -1, x: nc },
                                    health: ZOMBIE_STATS[ability.summonType].health,
                                    maxHealth: ZOMBIE_STATS[ability.summonType].health,
                                    speed: ZOMBIE_STATS[ability.summonType].speed,
                                    isEating: false, attackDamage: 1, freezeEffect: 0, stunEffect: 0, isDying: false, dyingSince: 0, abilityCooldowns: {}
                                });
                           }
                       }
                       setTimeout(() => { if (zombie && zombie.activeAbility === 'SUMMON') zombie.activeAbility = null; }, 1000);
                   }
                   if (ability.type === 'ICE_TRAIL') {
                       zombie.abilityCooldowns[ability.type] = time;
                       const currentCol = Math.round(zombieX * COLS);
                       if (currentCol >= 0 && currentCol < COLS) {
                           currentState.effects.push({
                               id: uuidv4(), type: 'ICE_TRAIL', row: zombie.position.row, col: currentCol, createdAt: Date.now(), duration: ability.trailDuration || 5000
                           });
                       }
                   }
               }
           });
       }
       if (zombie.activeAbility === 'VAULT' && zombie.activeAbilityTimer) {
           const vaultDuration = zombieStats.abilities?.find(a => a.type === 'VAULT')?.duration || 600;
           if (time - zombie.activeAbilityTimer > vaultDuration) {
               zombie.activeAbility = null;
               zombie.activeAbilityTimer = undefined;
               zombie.position.x = (zombie.position.x || 0) - (1.5 / COLS);
               zombie.hasVaulted = true; 
           }
       }
       const colIndex = Math.floor(zombieX * COLS);
       if (colIndex >= 0 && colIndex < COLS && zombie.stunEffect <= 0) {
           const plant = gridData[zombie.position.row][colIndex];
           if (plant && Math.abs(zombieX - ((colIndex + 0.5) / COLS)) < 0.1) {
               
               // --- ZOMBIE EATING LOGIC WITH PLACEHOLDERS ---
               let targetPlant = plant;
               let targetPos = { r: zombie.position.row, c: colIndex };

               if (plant.type === BasePlantType.PLACEHOLDER && plant.parentId) {
                   // Find the parent plant
                   // Typically parent is at col-1 for Cob Cannon, but let's search row
                   let parentFound = false;
                   for(let c=0; c<COLS; c++) {
                        const p = gridData[zombie.position.row][c];
                        if (p && p.id === plant.parentId) {
                            targetPlant = p;
                            targetPos = { r: zombie.position.row, c: c };
                            parentFound = true;
                            break;
                        }
                   }
                   if (!parentFound) {
                       // Orphan placeholder, kill it
                       gridData[zombie.position.row][colIndex] = null;
                       gridDirty = true;
                       targetPlant = null; // invalid
                   }
               }

               if (targetPlant) {
                   let handledByAbility = false;
                   if (zombieStats.abilities) {
                       const vaultAbility = zombieStats.abilities.find(a => a.type === 'VAULT');
                       if (vaultAbility && !zombie.hasVaulted && !zombie.activeAbility && targetPlant.type !== 'TALLNUT') {
                           zombie.activeAbility = 'VAULT';
                           zombie.activeAbilityTimer = time;
                           handledByAbility = true;
                       }
                       const crushAbility = zombieStats.abilities.find(a => a.type === 'CRUSH_PLANTS');
                       if (crushAbility) {
                           if (targetPlant.type !== 'SPIKEWEED') {
                               targetPlant.health = -999;
                               gridData[targetPos.r][targetPos.c] = null;
                               // If we crushed a main plant, ensure placeholder is also cleared in next frame logic or now
                               // If we crushed a placeholder, the parent dies above.
                               // If this was parent, we need to clear placeholder.
                               // Simple fix: Iterate whole row to clear any placeholders pointing to this ID
                               if (targetPlant.type !== BasePlantType.PLACEHOLDER) {
                                   for(let c=0; c<COLS; c++) {
                                       const p = gridData[targetPos.r][c];
                                       if (p && p.type === BasePlantType.PLACEHOLDER && p.parentId === targetPlant.id) {
                                           gridData[targetPos.r][c] = null;
                                       }
                                   }
                               }
                               
                               gridDirty = true;
                               handledByAbility = true;
                           } else {
                               zombie.health -= 20 * (deltaTime / 16); 
                           }
                       }
                   }
                   if (!handledByAbility) {
                       if (targetPlant.type === 'POTATO_MINE' && targetPlant.isReady) { 
                           currentState.effects.push({ id: uuidv4(), type: 'EXPLOSION', row: zombie.position.row, col: colIndex, createdAt: Date.now(), duration: EFFECT_DURATIONS.EXPLOSION });
                           zombie.health = -999; 
                           gridData[targetPos.r][targetPos.c] = null; 
                           gridDirty = true;
                       } else if (targetPlant.type === 'CHOMPER' && targetPlant.isReady) {
                            if (zombie.type !== BaseZombieType.GARGANTUAR && zombie.type !== BaseZombieType.MECH_BOSS && zombie.type !== BaseZombieType.ZOMBONI) {
                                zombie.health = -999; targetPlant.isReady = false; setTimeout(() => { if(targetPlant) targetPlant.isReady = true; }, 30000 / appSettings.gameSpeed);
                            } else {
                                isEating = true; targetPlant.health -= zombie.attackDamage * (deltaTime/16);
                            }
                       } else if (targetPlant.type !== 'SPIKEWEED') {
                            if (zombie.activeAbility !== 'VAULT') {
                                 isEating = true; 
                                 targetPlant.health -= zombie.attackDamage * (deltaTime / 16);
                                 if (targetPlant.health <= 0) { 
                                     gridData[targetPos.r][targetPos.c] = null; 
                                     // Cleanup Placeholders
                                     for(let c=0; c<COLS; c++) {
                                        const p = gridData[targetPos.r][c];
                                        if (p && p.type === BasePlantType.PLACEHOLDER && p.parentId === targetPlant.id) {
                                            gridData[targetPos.r][c] = null;
                                        }
                                     }
                                     isEating = false; 
                                     gridDirty = true; 
                                 }
                            }
                       } else { zombie.health -= 0.5; }
                   }
               }
           }
       }
       if (!isEating && !zombie.isDying) {
            zombie.position.x = (zombie.position.x || 0) - (currentSpeed * (deltaTime / 1000));
       }
       
       if ((zombie.position.x || 0) > -0.4) { 
           aliveZombies.push(zombie);
       } else {
           currentState.gameOver = true;
           setUiState(prev => ({ ...prev, gameOver: true }));
       }
    });
    currentState.zombies = aliveZombies;

    if (gridDirty) setGrid(gridData.map(r => [...r]));
    if (uiDirty || currentState.sun !== uiState.sun) { 
        setUiState(prev => ({ 
            ...prev, 
            sun: currentState.sun, 
            score: currentState.score, 
            wave: currentState.wave,
            gameOver: currentState.gameOver,
            victory: currentState.victory
        }));
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [appSettings.gameSpeed, currentLevel, gamePhase, isPaused, unlockedPlants, endlessState.active]);

  useEffect(() => {
    if (gamePhase === GamePhase.PLAYING) {
      console.log("Game Loop Started");
      lastTimeRef.current = 0; 
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gamePhase, gameLoop]);

  // --- Render Helpers ---

  const handleCollectSun = useCallback((id: string) => {
    const sunIndex = stateRef.current.suns.findIndex(s => s.id === id);
    if (sunIndex !== -1) {
      const sun = stateRef.current.suns[sunIndex];
      if (!sun.isCollected) {
        stateRef.current.sun += sun.value;
        stateRef.current.suns.splice(sunIndex, 1);
        setUiState(prev => ({ ...prev, sun: stateRef.current.sun }));
      }
    }
  }, []);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (isPaused || uiState.gameOver) return;

    // Handle Targeting (Cob Cannon)
    if (stateRef.current.targetingPlantId) {
        // If clicking self or any plant, we still target
        // Find the plant object
        let plant: Plant | null = null;
        for(let row=0; row<ROWS; row++) {
            for(let col=0; col<COLS; col++) {
                if(stateRef.current.grid[row][col]?.id === stateRef.current.targetingPlantId) {
                    plant = stateRef.current.grid[row][col];
                    break;
                }
            }
        }

        if (plant && plant.type === BasePlantType.COB_CANNON && plant.isReady) {
            // Fire!
            plant.state = 'ATTACK';
            plant.isReady = false;
            plant.lastActionTime = stateRef.current.time;
            
            const ability = PLANT_STATS[plant.type].abilities?.find(a => a.type === 'SHOOT');

            stateRef.current.projectiles.push({
                id: uuidv4(),
                type: ProjectileType.COB,
                damage: COB_DAMAGE,
                speed: 0, // Lobbed doesn't use speed vector usually
                row: plant.position.row,
                position: { row: plant.position.row, col: plant.position.col, x: (plant.position.col + 0.5) / COLS },
                destRow: r,
                destX: (c + 0.5) / COLS,
                startRow: plant.position.row,
                startX: (plant.position.col + 0.5) / COLS,
                trajectory: TrajectoryType.LOBBED,
                flightDuration: ability?.flightDuration || 2000,
                arcHeight: ability?.arcHeight || 250,
                visuals: ability?.projectileVisuals
            });
            
            stateRef.current.targetingPlantId = null;
        } else {
            // Cancel targeting if invalid
            stateRef.current.targetingPlantId = null;
        }
        return;
    }

    // Handle Shovel
    if (isShovelActive) {
      const target = stateRef.current.grid[r][c];
      if (target) {
        if (target.type === BasePlantType.PLACEHOLDER && target.parentId) {
             // Remove Parent
             for(let i=0; i<COLS; i++) {
                 if(stateRef.current.grid[r][i]?.id === target.parentId) {
                     stateRef.current.grid[r][i] = null;
                 }
             }
             // Remove Self
             stateRef.current.grid[r][c] = null;
        } else if (target.type === BasePlantType.COB_CANNON) {
             // Remove Self
             stateRef.current.grid[r][c] = null;
             // Remove Child Placeholders
             for(let i=0; i<COLS; i++) {
                 const p = stateRef.current.grid[r][i];
                 if(p && p.type === BasePlantType.PLACEHOLDER && p.parentId === target.id) {
                     stateRef.current.grid[r][i] = null;
                 }
             }
        } else {
             // Standard Removal
             stateRef.current.grid[r][c] = null;
        }
        
        setGrid([...stateRef.current.grid]);
        setShovelActive(false);
      }
      return;
    }

    // Handle Planting
    if (selectedPlant) {
      const plantConfig = PLANT_STATS[selectedPlant];
      if (stateRef.current.sun >= plantConfig.cost) {
        const currentPlant = stateRef.current.grid[r][c];
        
        // --- COB CANNON DEPLOYMENT (2 TILES) ---
        if (selectedPlant === BasePlantType.COB_CANNON) {
            // Must have 2 consecutive empty tiles: [r][c] and [r][c+1]
            if (!currentPlant && c < COLS - 1 && !stateRef.current.grid[r][c+1]) {
                stateRef.current.sun -= plantConfig.cost;
                setUiState(prev => ({ ...prev, sun: stateRef.current.sun }));
                
                const mainId = uuidv4();
                
                // Head (Main Plant)
                const newPlant: Plant = {
                    id: mainId,
                    type: selectedPlant,
                    position: { row: r, col: c },
                    health: plantConfig.health,
                    maxHealth: plantConfig.health,
                    lastActionTime: stateRef.current.time,
                    isReady: false, // Needs to load
                    createdAt: stateRef.current.time,
                    state: 'IDLE',
                    abilityCooldowns: {}
                };
                
                // Tail (Placeholder)
                const placeholder: Plant = {
                    id: uuidv4(),
                    type: BasePlantType.PLACEHOLDER,
                    position: { row: r, col: c + 1 },
                    health: 1, // Doesn't matter, defers to parent
                    maxHealth: 1,
                    lastActionTime: 0,
                    isReady: false,
                    createdAt: stateRef.current.time,
                    parentId: mainId,
                    abilityCooldowns: {}
                };

                stateRef.current.grid[r][c] = newPlant;
                stateRef.current.grid[r][c+1] = placeholder;
                
                setGrid([...stateRef.current.grid]);
                setSelectedPlant(null);
                return;
            }
            // If condition fails, do nothing
            return; 
        }

        // Standard Planting
        if (!currentPlant) {
          stateRef.current.sun -= plantConfig.cost;
          setUiState(prev => ({ ...prev, sun: stateRef.current.sun }));
          
          const newPlant: Plant = {
            id: uuidv4(),
            type: selectedPlant,
            position: { row: r, col: c },
            health: plantConfig.health,
            maxHealth: plantConfig.health,
            lastActionTime: stateRef.current.time,
            isReady: selectedPlant !== BasePlantType.POTATO_MINE, // Mine needs arming
            createdAt: stateRef.current.time,
            state: 'IDLE',
            abilityCooldowns: {}
          };
          
          stateRef.current.grid[r][c] = newPlant;
          setGrid([...stateRef.current.grid]);
          setSelectedPlant(null);
        }
      }
    } else {
        // Clicked on a plant without tool (Manual Fire Logic)
        const clicked = stateRef.current.grid[r][c];
        if (clicked) {
            let target = clicked;
            // Redirect placeholder click to parent
            if (clicked.type === BasePlantType.PLACEHOLDER && clicked.parentId) {
                for(let i=0; i<COLS; i++) {
                    if(stateRef.current.grid[r][i]?.id === clicked.parentId) {
                        target = stateRef.current.grid[r][i]!;
                        break;
                    }
                }
            }

            if (target && target.type === BasePlantType.COB_CANNON && target.isReady) {
                stateRef.current.targetingPlantId = target.id;
            }
        }
    }
  }, [isPaused, uiState.gameOver, selectedPlant, isShovelActive]);

  // Helper for drag highlight
  const isCellHighlight = (r: number, c: number) => {
      if (!dragOverCell) return false;
      
      // Direct hover
      if (dragOverCell.row === r && dragOverCell.col === c) return true;
      
      // Cob Cannon Multitile Highlight
      // If we are dragging Cob Cannon, highlight [r][c] and [r][c+1] when hovering [r][c]
      // So if I am at (r, c), check if dragOver is (r, c-1) (meaning this is the tail)
      if (selectedPlant === BasePlantType.COB_CANNON) {
          if (dragOverCell.row === r && dragOverCell.col === c - 1) return true;
      }
      return false;
  };

  return (
    <div ref={containerRef} className="w-full h-screen bg-black flex items-center justify-center overflow-hidden font-pixel text-white select-none">
       {/* MAIN GAME STAGE */}
       <div 
          className="relative bg-slate-900 shadow-2xl overflow-hidden"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
       >
           {/* === BACKGROUND === */}
           <div className={`absolute inset-0 z-0 transition-colors duration-1000 ${currentLevel.scene === LevelScene.LAWN_NIGHT ? 'bg-indigo-950' : currentLevel.scene === LevelScene.GRAVEYARD ? 'bg-slate-950' : currentLevel.scene === LevelScene.FACTORY ? 'bg-slate-800' : 'bg-green-800'}`}>
               {/* Pattern */}
               <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDQwaDQwVjBIMHY0MHptMjAgMjBoMjBWMjBIMjB2MjB6TTAgMjBoMjBWMEgwdjIweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L2c+PC9zdmc+')]"></div>
           </div>

           {/* === GAME CONTENT === */}
           {gamePhase === GamePhase.PLAYING && (
              <>
                {/* GAME AREA (OFFSET FOR HUD) */}
                <div className="absolute top-[80px] left-[20px] right-[20px] bottom-[20px] z-10">
                    {/* GRID */}
                    <div 
                        className="absolute left-[120px] top-[20px] w-[720px] h-[540px] z-10"
                        onMouseLeave={() => setDragOverCell(null)}
                    >
                        <div className={`grid grid-rows-${ROWS} grid-cols-9 w-full h-full border-4 border-black/20 rounded-lg overflow-hidden bg-black/10 shadow-inner`} style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
                            {grid.map((row, r) => (
                                row.map((plant, c) => (
                                    <div 
                                        key={`${r}-${c}`} 
                                        onClick={() => handleCellClick(r, c)}
                                        onMouseEnter={() => setDragOverCell({row: r, col: c})}
                                        className="w-full h-full"
                                    >
                                        <GridCell 
                                            row={r} col={c} plant={plant} 
                                            isDragOver={isCellHighlight(r, c)} 
                                            scene={currentLevel.scene}
                                            isTargeting={!!stateRef.current.targetingPlantId}
                                        />
                                    </div>
                                ))
                            ))}
                        </div>
                        {/* ENTITIES (Zombies, Projectiles, Suns, Effects) */}
                        <div className="absolute inset-0 pointer-events-none z-30">
                            <EntitiesLayer gameStateRef={stateRef} onCollectSun={handleCollectSun} />
                        </div>
                    </div>
                </div>

                {/* HUD BAR - WOODEN PLANK STYLE */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[1000] flex justify-center w-full pointer-events-none">
                    <div className="pointer-events-auto bg-[#8d6e63] border-x-4 border-b-4 border-[#3e2723] rounded-b-xl px-4 py-2 shadow-2xl flex items-start gap-3 min-w-[700px] justify-center relative">
                        
                        {/* Sun Counter (Recessed) */}
                        <div className="relative w-20 h-20 bg-[#3e2723] rounded-md border border-[#5d4037] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col items-center justify-end pb-2 mr-2">
                             <div className="absolute -top-4 text-5xl drop-shadow-md filter brightness-110 z-10 animate-spin-slow">☀️</div>
                             <div className="bg-[#fff3e0] border border-[#5d4037] px-1 py-0.5 rounded w-[80%] text-center z-10 shadow-sm">
                                 <span className="text-black font-mono font-bold text-sm">{Math.floor(uiState.sun)}</span>
                             </div>
                        </div>

                        {/* Seed Slots Container */}
                        <div className="flex gap-1 overflow-x-visible">
                             {deck.map(type => {
                                 const config = PLANT_STATS[type];
                                 const canAfford = uiState.sun >= config.cost;
                                 
                                 // Check for pixel art visuals
                                 const idleAnim = (config.visuals?.['idle'] || config.visuals?.['walk']) as AnimationState | undefined;
                                 const pixelFrame = idleAnim?.frames?.[0];
                                 
                                 return (
                                     <div 
                                        key={type}
                                        onClick={() => { if(canAfford) { setSelectedPlant(type); setShovelActive(false); stateRef.current.targetingPlantId = null; } }}
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
                             {Array.from({ length: Math.max(0, (currentLevel.seedSlots || MAX_DECK_SIZE) - deck.length) }).map((_, i) => (
                                  <div key={`empty-${i}`} className="w-14 h-20 bg-[#5d4037]/30 rounded-sm border border-[#5d4037]/50 shadow-inner" />
                             ))}
                        </div>
                        
                        {/* Shovel Slot */}
                        <div 
                           onClick={() => { setShovelActive(!isShovelActive); setSelectedPlant(null); stateRef.current.targetingPlantId = null; }}
                           className={`
                               w-16 h-16 ml-2 bg-[#3e2723] rounded border-2 border-[#5d4037] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer transition-all group
                               ${isShovelActive ? '-translate-y-2 ring-2 ring-yellow-400' : 'hover:bg-[#4e342e]'}
                           `}
                           title="Shovel"
                        >
                            <span className={`text-4xl filter drop-shadow-md transition-transform ${isShovelActive ? '-rotate-45 scale-110' : 'group-hover:-rotate-12'}`}>🥄</span>
                        </div>

                        {/* Menu Button - Absolute Top Right of Screen, outside plank */}
                        <button 
                            onClick={() => setPaused(true)} 
                            className="absolute top-2 right-[-140px] bg-[#7b1fa2] border-[3px] border-[#4a148c] text-white font-pixel text-xs px-4 py-2 rounded-lg shadow-[0_4px_0_#4a148c] hover:bg-[#8e24aa] hover:-translate-y-0.5 active:shadow-none active:translate-y-1 transition-all pointer-events-auto"
                        >
                            {t('MENU_BTN', lang)}
                        </button>
                    </div>
                </div>

                {/* TEXT OVERLAYS */}
                {showHugeWave && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <h1 className="text-6xl text-red-600 font-pixel drop-shadow-[4px_4px_0_black] animate-pulse scale-150">A HUGE WAVE OF ZOMBIES IS APPROACHING!</h1>
                    </div>
                )}
                {stateRef.current.activeTextOverlay && (
                    <div className="absolute top-[20%] w-full text-center z-[100] pointer-events-none">
                         <h2 className={`text-4xl font-pixel drop-shadow-md ${stateRef.current.activeTextOverlay.style === 'WARNING' ? 'text-red-500' : stateRef.current.activeTextOverlay.style === 'SPOOKY' ? 'text-purple-400' : 'text-blue-400'}`}>
                             {stateRef.current.activeTextOverlay.content}
                         </h2>
                    </div>
                )}
              </>
           )}

           {/* === MENUS === */}
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
                   onSelectLevel={(l) => { 
                       resetGame(l);
                       setGamePhase(GamePhase.SELECTION); 
                   }} 
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
                      const plants = dlc.plants || [];
                      plants.forEach(p => PLANT_STATS[p.type] = p);
                      if (dlc.zombies) Object.assign(ZOMBIE_STATS, dlc.zombies);
                      if (dlc.levels) LEVELS.push(...dlc.levels);
                      setUnlockedPlants(prev => [...prev, ...plants.map(p => p.type)]);
                      resetGame(lvl); 
                      setGamePhase(GamePhase.SELECTION); 
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
                   onStartGame={() => { 
                       setGamePhase(GamePhase.PLAYING); 
                   }}
                   onBack={() => {
                       if(endlessState.active) { saveEndlessProgress(); setGamePhase(GamePhase.MENU); }
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
                  onStartGame={(save) => handleStartEndless(save)}
                  language={lang}
               />
           )}

           {gamePhase === GamePhase.ENDLESS_SHOP && (
               <EndlessShop 
                  floor={endlessState.floor}
                  score={stateRef.current.score}
                  inventory={endlessState.inventory}
                  onBuy={(type, cost) => {
                       if (stateRef.current.score >= cost) {
                           stateRef.current.score -= cost;
                           setEndlessState(prev => ({ ...prev, inventory: { ...prev.inventory, [type]: (prev.inventory[type] || 0) + 1 } }));
                           setUiState(prev => ({ ...prev, score: stateRef.current.score })); 
                       }
                  }}
                  onContinue={() => {
                      const level = generateEndlessLevel(endlessState.floor);
                      resetGame(level, { keepProgress: true });
                      setGamePhase(GamePhase.SELECTION);
                  }}
                  language={lang}
               />
           )}

           {/* PAUSE MENU */}
           {isPaused && gamePhase === GamePhase.PLAYING && (
               <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                   <h2 className="text-4xl text-white font-pixel mb-8">{t('PAUSED', lang)}</h2>
                   <div className="flex flex-col gap-4">
                       <button onClick={() => setPaused(false)} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg">{t('RESUME', lang)}</button>
                       <button onClick={() => setShowSettings(true)} className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded shadow-lg">{t('SETTINGS_TITLE', lang)}</button>
                       <button onClick={() => { setPaused(false); setGamePhase(GamePhase.MENU); restoreGameState(); }} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-lg">{t('EXIT_TO_MENU', lang)}</button>
                   </div>
               </div>
           )}

           {/* GAME OVER */}
           {uiState.gameOver && (
               <div className="absolute inset-0 z-[1000] bg-red-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                   <h2 className="text-6xl text-white font-pixel drop-shadow-[4px_4px_0_black] mb-2">{t('GAME_OVER', lang)}</h2>
                   <div className="text-2xl text-red-200 font-pixel mb-8">THE ZOMBIES ATE YOUR BRAINS!</div>
                   <div className="flex gap-4">
                       <button onClick={() => { if(endlessState.active) { setGamePhase(GamePhase.MENU); restoreGameState(); } else resetGame(currentLevel); }} className="px-8 py-4 bg-white text-red-900 font-bold font-pixel rounded shadow-xl hover:scale-105 transition-transform">{t('TRY_AGAIN', lang)}</button>
                       <button onClick={() => { setGamePhase(GamePhase.MENU); restoreGameState(); }} className="px-8 py-4 bg-black text-white font-bold font-pixel rounded shadow-xl hover:scale-105 transition-transform">{t('MAIN_MENU', lang)}</button>
                   </div>
               </div>
           )}

           {/* VICTORY */}
           {uiState.victory && (
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
                           }
                        }} className="px-8 py-4 bg-green-500 text-white font-bold font-pixel rounded shadow-xl hover:scale-105 transition-transform border-b-4 border-green-800 active:border-b-0 active:translate-y-1">
                           {endlessState.active ? t('NEXT_FLOOR', lang) : t('CONTINUE', lang)}
                       </button>
                   </div>
               </div>
           )}

           {/* MODALS */}
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
                   onSave={(ids) => {
                       setEnabledDLCs(ids);
                       reloadDLCs(ids);
                       setShowDLCManager(false);
                   }}
                   language={lang}
               />
           )}
       </div>
    </div>
  );
};

export default App;
