
import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  LevelConfig,
  Plant,
  Zombie,
  Projectile,
  ProjectileType,
  TrajectoryType,
  ZombieType,
  BasePlantType,
  BaseZombieType,
  AppSettings,
  GamePhase,
  PlantType,
  EndlessSaveSlot,
  LawnCleaner,
  ConsumableType
} from '../types';
import {
  ROWS,
  COLS,
  PLANT_STATS,
  ZOMBIE_STATS,
  PROJECTILE_SPEED,
  CLEANER_SPEED,
  PROJECTILE_DAMAGE,
  COB_DAMAGE,
  NATURAL_SUN_INTERVAL,
  WAVE_INTERVAL,
  EFFECT_DURATIONS,
  DIRECTION_VECTORS,
  RESTORE_CONSTANTS
} from '../constants';

const createGrid = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

interface UseGameLogicProps {
  gamePhase: GamePhase;
  currentLevel: LevelConfig;
  appSettings: AppSettings;
  isPaused: boolean;
  endlessState: { active: boolean; floor: number; inventory: Record<string, number> };
  unlockedPlants: PlantType[];
  setUnlockedPlants: React.Dispatch<React.SetStateAction<PlantType[]>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  onEndlessVictory: () => void;
}

export const useGameLogic = ({
  gamePhase,
  currentLevel,
  appSettings,
  isPaused,
  endlessState,
  unlockedPlants,
  setUnlockedPlants,
  setGamePhase,
  onEndlessVictory
}: UseGameLogicProps) => {
  
  // --- STATE ---
  const [grid, setGrid] = useState<(Plant | null)[][]>(createGrid());
  const [uiState, setUiState] = useState({
    sun: 150, score: 0, wave: 1, gameOver: false, victory: false,
  });
  const [showHugeWave, setShowHugeWave] = useState(false);
  const [dragOverCell, setDragOverCell] = useState<{row: number, col: number} | null>(null);

  // --- REFS ---
  const stateRef = useRef<GameState>({
    sun: 150, grid: createGrid(), zombies: [], projectiles: [], suns: [], lawnCleaners: [], effects: [], decorations: [],
    gameOver: false, victory: false, wave: 1, score: 0, time: 0, activeTextOverlay: undefined, targetingPlantId: null
  });

  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const nextSunSpawnRef = useRef<number>(0);
  const nextZombieSpawnRef = useRef<number>(0);
  const nextWaveRef = useRef<number>(0);
  
  const currentWaveIndexRef = useRef<number>(0);
  const waveStartTimeRef = useRef<number>(0);
  const zombiesSpawnedInWaveRef = useRef<number>(0);

  // --- INITIALIZATION ---
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

  // --- GAME LOOP ---
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

    // Physics Update: Sun
    suns.forEach(sun => {
        if (!sun.isCollected) {
            if (sun.position.y < sun.targetY) {
                sun.position.y += (0.03 * deltaTime);
            }
        }
    });

    // 2. Zombie Spawning Logic
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
            currentState.victory = true; 
            if (endlessState.active) onEndlessVictory(); 
            else { 
                if (currentLevel.unlocksPlant && !unlockedPlants.includes(currentLevel.unlocksPlant)) setUnlockedPlants(prev => [...prev, currentLevel.unlocksPlant!]); 
                setUiState(prev => ({ ...prev, victory: true })); 
            }
        }
    } else {
        // Classic Mode Spawning
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
            currentState.victory = true; 
            if (endlessState.active) onEndlessVictory(); 
            else { 
                if (currentLevel.unlocksPlant && !unlockedPlants.includes(currentLevel.unlocksPlant)) setUnlockedPlants(prev => [...prev, currentLevel.unlocksPlant!]); 
                setUiState(prev => ({ ...prev, victory: true })); 
            }
        }
    }

    // 3. Projectiles Logic
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
            // Straight/Homing Projectiles
            if (p.homing && !p.vector) {
                let nearest: Zombie | null = null;
                let minDist = 999;
                currentState.zombies.forEach(z => {
                    if (z.isDying) return;
                    const dx = (z.position.x || 0) - (p.position.x || 0);
                    const dy = z.position.row - p.row;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dx > 0 && dist < 4.0 && dist < minDist) { minDist = dist; nearest = z; }
                });
                if (nearest) {
                    const z = nearest as Zombie;
                    const dx = (z.position.x || 0) - (p.position.x || 0);
                    const dy = z.position.row - p.row;
                    const angle = Math.atan2(dy, dx);
                    p.vector = { x: Math.cos(angle), y: Math.sin(angle) };
                }
            } else if (p.homing && p.vector) {
                // Steer towards target
                let nearest: Zombie | null = null;
                let minDist = 999;
                currentState.zombies.forEach(z => {
                    if (z.isDying) return;
                    const dx = (z.position.x || 0) - (p.position.x || 0);
                    const dy = z.position.row - p.row;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 4.0 && dist < minDist) { minDist = dist; nearest = z; }
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

    // 4. Lawn Cleaners
    const nextCleaners: LawnCleaner[] = [];
    lawnCleaners.forEach(cleaner => {
        if (cleaner.active) {
            cleaner.position.x = (cleaner.position.x || 0) + (CLEANER_SPEED * (deltaTime / 1000));
            zombies.forEach(z => { if (z.position.row === cleaner.row && !z.isDying && Math.abs((cleaner.position.x||0) - (z.position.x||0)) < 0.1) z.health = -9999; });
        }
        if ((cleaner.position.x || 0) < 1.1) nextCleaners.push(cleaner);
    });
    currentState.lawnCleaners = nextCleaners;

    // 5. Plant Actions & Abilities
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const plant = gridData[r][c];
        if (plant) {
          const plantConfig = PLANT_STATS[plant.type];
          if (plant.state === 'ATTACK' && time - plant.lastActionTime > 1000) { plant.state = 'IDLE'; gridDirty = true; }
          if (plant.type === BasePlantType.COB_CANNON && !plant.isReady) { if (time - plant.lastActionTime > plantConfig.cooldown) { plant.isReady = true; gridDirty = true; } }
          if (plant.type === 'POTATO_MINE' && !plant.isReady && time - plant.createdAt > 15000) { plant.isReady = true; gridDirty = true; }
          
          if (plantConfig.abilities) {
              plantConfig.abilities.forEach(ability => {
                  if (ability.type === 'PRODUCE_SUN') {
                      if (!plant.abilityCooldowns) plant.abilityCooldowns = {};
                      const lastProd = plant.abilityCooldowns[ability.type] || plant.createdAt;
                      const hasActiveSun = suns.some(s => s.sourcePlantId === plant.id && !s.isCollected);
                      if (!hasActiveSun && time - lastProd > (ability.interval || 10000)) {
                          const rowHeight = 100 / ROWS;
                          suns.push({ id: uuidv4(), position: { row: r, col: c, x: (c + 0.5) / COLS, y: (r * rowHeight) + 2 }, targetY: (r * rowHeight) + 12, value: ability.sunValue || 25, createdAt: time, isCollected: false, sourcePlantId: plant.id });
                          plant.abilityCooldowns[ability.type] = time;
                          gridDirty = true; 
                      }
                  }
                  if (ability.type === 'SHOOT') {
                      const lastShot = plant.lastActionTime;
                      const interval = ability.interval || 1400;
                      if (time - lastShot > interval) {
                          if (plant.type === BasePlantType.COB_CANNON) {
                              // Cob Cannon manual fire logic handled in click handler, auto-aim not implemented for simplicity here unless needed
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
                                                let targetX = 1.0; let targetRow = row;
                                                if (ability.trajectory === TrajectoryType.PARABOLIC) {
                                                    const target = zombies.filter(z => z.position.row === row && !z.isDying && (z.position.x||0) > (c/COLS)).sort((a,b) => (a.position.x||0) - (b.position.x||0))[0]; 
                                                    if (target) { targetX = target.position.x || 1.0; targetRow = target.position.row; }
                                                }
                                                stateRef.current.projectiles.push({ 
                                                    id: uuidv4(), position: { row: row, col: c, x: (c / COLS) + 0.05 }, damage: ability.damage || 20, speed: PROJECTILE_SPEED, row: row, type: ability.projectileType || ProjectileType.NORMAL,
                                                    vector: vector, homing: ability.projectileHoming, visuals: overrideVisuals, trajectory: ability.trajectory || TrajectoryType.STRAIGHT,
                                                    startX: (c / COLS) + 0.05, startRow: row, destX: targetX, destRow: targetRow, flightDuration: ability.flightDuration || 1000, arcHeight: ability.arcHeight || 100
                                                });
                                            }, delay / appSettings.gameSpeed);
                                        };
                                        if (ability.projectileDirection) {
                                            const dirVec = DIRECTION_VECTORS[ability.projectileDirection] || { x:1, y:0 };
                                            fire(r, 0, dirVec, ability.projectileVisuals);
                                        } else if (plant.type === 'STARFRUIT') {
                                            fire(r, 0, {x: 1, y: 0}, ability.projectileVisuals); fire(r, 0, {x: -1, y: 0}, ability.projectileVisuals); fire(r, 0, {x: 0, y: -1}, ability.projectileVisuals); fire(r, 0, {x: 0, y: 1}, ability.projectileVisuals); fire(r, 0, {x: 0.7, y: 0.7}, ability.projectileVisuals); 
                                        } else if (plant.type === 'THREEPEATER') {
                                            targetRows.forEach(tr => fire(tr, 0, undefined, ability.projectileVisuals));
                                        } else {
                                            fire(r, 0, undefined, ability.projectileVisuals);
                                            if (ability.shotsPerTrigger && ability.shotsPerTrigger > 1) { for(let i=1; i<ability.shotsPerTrigger; i++) fire(r, (ability.multiShotDelay || 150) * i, undefined, ability.projectileVisuals); }
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
                             if (plant.type !== 'SPIKEWEED') { gridData[r][c] = null; gridDirty = true; } else { plant.state = 'IDLE'; }
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
                               zombies.forEach(z => { const zCol = (z.position.x || 0) * COLS; const dist = Math.sqrt(Math.pow(z.position.row - r, 2) + Math.pow(zCol - c, 2)); if (dist < range) z.health -= (ability.damage || 9999); });
                               gridData[r][c] = null; gridDirty = true;
                          }
                      }
                  }
                  if (ability.type === 'BURN_ROW') {
                      if (time - plant.createdAt > (ability.cooldown || 1000)) {
                           currentState.effects.push({ id: uuidv4(), type: 'FIRE_ROW', row: r, col: c, createdAt: Date.now(), duration: EFFECT_DURATIONS.FIRE_ROW });
                           zombies.forEach(z => { if (!z.isDying && z.position.row === r) z.health -= (ability.damage || 9999); });
                           gridData[r][c] = null; gridDirty = true;
                      }
                  }
              });
          }
        }
      }
    }

    // 6. Zombie Loop (Movement, Eating, Abilities)
    const aliveZombies: Zombie[] = [];
    currentState.zombies.forEach(zombie => {
       if (!zombie.isDying && zombie.health <= 0) {
           zombie.isDying = true; zombie.dyingSince = time; zombie.isEating = false;
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
                                    id: uuidv4(), type: ability.summonType as ZombieType, position: { row: nr, col: -1, x: nc },
                                    health: ZOMBIE_STATS[ability.summonType].health, maxHealth: ZOMBIE_STATS[ability.summonType].health, speed: ZOMBIE_STATS[ability.summonType].speed,
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
                           currentState.effects.push({ id: uuidv4(), type: 'ICE_TRAIL', row: zombie.position.row, col: currentCol, createdAt: Date.now(), duration: ability.trailDuration || 5000 });
                       }
                   }
               }
           });
       }
       if (zombie.activeAbility === 'VAULT' && zombie.activeAbilityTimer) {
           const vaultDuration = zombieStats.abilities?.find(a => a.type === 'VAULT')?.duration || 600;
           if (time - zombie.activeAbilityTimer > vaultDuration) {
               zombie.activeAbility = null; zombie.activeAbilityTimer = undefined; zombie.position.x = (zombie.position.x || 0) - (1.5 / COLS); zombie.hasVaulted = true; 
           }
       }
       const colIndex = Math.floor(zombieX * COLS);
       if (colIndex >= 0 && colIndex < COLS && zombie.stunEffect <= 0) {
           const plant = gridData[zombie.position.row][colIndex];
           if (plant && Math.abs(zombieX - ((colIndex + 0.5) / COLS)) < 0.1) {
               // Logic for placeholders/parent resolution
               let targetPlant = plant;
               let targetPos = { r: zombie.position.row, c: colIndex };
               if (plant.type === BasePlantType.PLACEHOLDER && plant.parentId) {
                   let parentFound = false;
                   for(let c=0; c<COLS; c++) { const p = gridData[zombie.position.row][c]; if (p && p.id === plant.parentId) { targetPlant = p; targetPos = { r: zombie.position.row, c: c }; parentFound = true; break; } }
                   if (!parentFound) { gridData[zombie.position.row][colIndex] = null; gridDirty = true; targetPlant = null; }
               }

               if (targetPlant) {
                   let handledByAbility = false;
                   if (zombieStats.abilities) {
                       const vaultAbility = zombieStats.abilities.find(a => a.type === 'VAULT');
                       if (vaultAbility && !zombie.hasVaulted && !zombie.activeAbility && targetPlant.type !== 'TALLNUT') {
                           zombie.activeAbility = 'VAULT'; zombie.activeAbilityTimer = time; handledByAbility = true;
                       }
                       const crushAbility = zombieStats.abilities.find(a => a.type === 'CRUSH_PLANTS');
                       if (crushAbility) {
                           if (targetPlant.type !== 'SPIKEWEED') {
                               targetPlant.health = -999; gridData[targetPos.r][targetPos.c] = null;
                               if (targetPlant.type !== BasePlantType.PLACEHOLDER) { for(let c=0; c<COLS; c++) { const p = gridData[targetPos.r][c]; if (p && p.type === BasePlantType.PLACEHOLDER && p.parentId === targetPlant.id) gridData[targetPos.r][c] = null; } }
                               gridDirty = true; handledByAbility = true;
                           } else { zombie.health -= 20 * (deltaTime / 16); }
                       }
                   }
                   if (!handledByAbility) {
                       if (targetPlant.type === 'POTATO_MINE' && targetPlant.isReady) { 
                           currentState.effects.push({ id: uuidv4(), type: 'EXPLOSION', row: zombie.position.row, col: colIndex, createdAt: Date.now(), duration: EFFECT_DURATIONS.EXPLOSION });
                           zombie.health = -999; gridData[targetPos.r][targetPos.c] = null; gridDirty = true;
                       } else if (targetPlant.type === 'CHOMPER' && targetPlant.isReady) {
                            if (zombie.type !== BaseZombieType.GARGANTUAR && zombie.type !== BaseZombieType.MECH_BOSS && zombie.type !== BaseZombieType.ZOMBONI) {
                                zombie.health = -999; targetPlant.isReady = false; setTimeout(() => { if(targetPlant) targetPlant.isReady = true; }, 30000 / appSettings.gameSpeed);
                            } else { isEating = true; targetPlant.health -= zombie.attackDamage * (deltaTime/16); }
                       } else if (targetPlant.type !== 'SPIKEWEED') {
                            if (zombie.activeAbility !== 'VAULT') {
                                 isEating = true; targetPlant.health -= zombie.attackDamage * (deltaTime / 16);
                                 if (targetPlant.health <= 0) { 
                                     gridData[targetPos.r][targetPos.c] = null; 
                                     for(let c=0; c<COLS; c++) { const p = gridData[targetPos.r][c]; if (p && p.type === BasePlantType.PLACEHOLDER && p.parentId === targetPlant.id) gridData[targetPos.r][c] = null; }
                                     isEating = false; gridDirty = true; 
                                 }
                            }
                       } else { zombie.health -= 0.5; }
                   }
               }
           }
       }
       if (!isEating && !zombie.isDying) { zombie.position.x = (zombie.position.x || 0) - (currentSpeed * (deltaTime / 1000)); }
       if ((zombie.position.x || 0) > -0.4) { aliveZombies.push(zombie); } 
       else { currentState.gameOver = true; setUiState(prev => ({ ...prev, gameOver: true })); }
    });
    currentState.zombies = aliveZombies;

    if (gridDirty) setGrid(gridData.map(r => [...r]));
    if (uiDirty || currentState.sun !== uiState.sun) { 
        setUiState(prev => ({ ...prev, sun: currentState.sun, score: currentState.score, wave: currentState.wave, gameOver: currentState.gameOver, victory: currentState.victory }));
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [appSettings.gameSpeed, currentLevel, isPaused, endlessState.active, unlockedPlants]);

  // --- CONTROLS ---

  useEffect(() => {
    if (gamePhase === GamePhase.PLAYING) {
      lastTimeRef.current = 0; 
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gamePhase, gameLoop]);

  const resetGame = useCallback((level: LevelConfig, options: { keepProgress?: boolean, fromSave?: EndlessSaveSlot } = {}) => {
     currentWaveIndexRef.current = 0;
     waveStartTimeRef.current = 0;
     zombiesSpawnedInWaveRef.current = 0;
     nextSunSpawnRef.current = 1000; 
     nextZombieSpawnRef.current = 0;
     nextWaveRef.current = 0;
     lastTimeRef.current = 0;

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
        lawnCleaners: Array.from({ length: ROWS }, (_, i) => ({ id: uuidv4(), row: i, position: { row: i, col: -1, x: -0.1 }, active: false })),
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
    setShowHugeWave(false);
  }, []);

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

  const handleInteractWithCell = useCallback((r: number, c: number, selectedPlant: PlantType | null, isShovelActive: boolean, setSelectedPlant: (p: PlantType|null)=>void, setShovelActive: (a: boolean)=>void) => {
    if (isPaused || uiState.gameOver) return;

    // 1. Targeting (Cob Cannon)
    if (stateRef.current.targetingPlantId) {
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
            plant.state = 'ATTACK';
            plant.isReady = false;
            plant.lastActionTime = stateRef.current.time;
            const ability = PLANT_STATS[plant.type].abilities?.find(a => a.type === 'SHOOT');

            stateRef.current.projectiles.push({
                id: uuidv4(),
                type: ProjectileType.COB,
                damage: COB_DAMAGE,
                speed: 0,
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
            stateRef.current.targetingPlantId = null;
        }
        return;
    }

    // 2. Shovel Logic
    if (isShovelActive) {
      const target = stateRef.current.grid[r][c];
      if (target) {
        if (target.type === BasePlantType.PLACEHOLDER && target.parentId) {
             for(let i=0; i<COLS; i++) { if(stateRef.current.grid[r][i]?.id === target.parentId) stateRef.current.grid[r][i] = null; }
             stateRef.current.grid[r][c] = null;
        } else if (target.type === BasePlantType.COB_CANNON) {
             stateRef.current.grid[r][c] = null;
             for(let i=0; i<COLS; i++) { const p = stateRef.current.grid[r][i]; if(p && p.type === BasePlantType.PLACEHOLDER && p.parentId === target.id) stateRef.current.grid[r][i] = null; }
        } else {
             stateRef.current.grid[r][c] = null;
        }
        setGrid([...stateRef.current.grid]);
        setShovelActive(false);
      }
      return;
    }

    // 3. Planting Logic
    if (selectedPlant) {
      const plantConfig = PLANT_STATS[selectedPlant];
      if (stateRef.current.sun >= plantConfig.cost) {
        const currentPlant = stateRef.current.grid[r][c];
        
        // Cob Cannon (2 tiles)
        if (selectedPlant === BasePlantType.COB_CANNON) {
            if (!currentPlant && c < COLS - 1 && !stateRef.current.grid[r][c+1]) {
                stateRef.current.sun -= plantConfig.cost;
                setUiState(prev => ({ ...prev, sun: stateRef.current.sun }));
                
                const mainId = uuidv4();
                const newPlant: Plant = {
                    id: mainId, type: selectedPlant, position: { row: r, col: c },
                    health: plantConfig.health, maxHealth: plantConfig.health, lastActionTime: stateRef.current.time,
                    isReady: false, createdAt: stateRef.current.time, state: 'IDLE', abilityCooldowns: {}
                };
                const placeholder: Plant = {
                    id: uuidv4(), type: BasePlantType.PLACEHOLDER, position: { row: r, col: c + 1 },
                    health: 1, maxHealth: 1, lastActionTime: 0, isReady: false, createdAt: stateRef.current.time,
                    parentId: mainId, abilityCooldowns: {}
                };
                stateRef.current.grid[r][c] = newPlant;
                stateRef.current.grid[r][c+1] = placeholder;
                setGrid([...stateRef.current.grid]);
                setSelectedPlant(null);
                return;
            }
            return; 
        }

        // Standard Planting
        if (!currentPlant) {
          stateRef.current.sun -= plantConfig.cost;
          setUiState(prev => ({ ...prev, sun: stateRef.current.sun }));
          
          const newPlant: Plant = {
            id: uuidv4(), type: selectedPlant, position: { row: r, col: c },
            health: plantConfig.health, maxHealth: plantConfig.health, lastActionTime: stateRef.current.time,
            isReady: selectedPlant !== BasePlantType.POTATO_MINE, createdAt: stateRef.current.time, state: 'IDLE', abilityCooldowns: {}
          };
          
          stateRef.current.grid[r][c] = newPlant;
          setGrid([...stateRef.current.grid]);
          setSelectedPlant(null);
        }
      }
    } else {
        // 4. Click without tool (Activate Cob Cannon)
        const clicked = stateRef.current.grid[r][c];
        if (clicked) {
            let target = clicked;
            if (clicked.type === BasePlantType.PLACEHOLDER && clicked.parentId) {
                for(let i=0; i<COLS; i++) { if(stateRef.current.grid[r][i]?.id === clicked.parentId) { target = stateRef.current.grid[r][i]!; break; } }
            }
            if (target && target.type === BasePlantType.COB_CANNON && target.isReady) {
                stateRef.current.targetingPlantId = target.id;
            }
        }
    }
  }, [isPaused, uiState.gameOver]);

  // Handle endless consumables
  const handleUseConsumable = useCallback((type: ConsumableType) => {
      // Endless logic is mostly managed in App, but effects happen here
      if (type === ConsumableType.SUN_PACK) { stateRef.current.sun += 500; setUiState(prev => ({ ...prev, sun: stateRef.current.sun })); } 
      else if (type === ConsumableType.REPAIR_KIT) { stateRef.current.grid.forEach(row => row.forEach(p => { if(p) p.health = p.maxHealth; })); setGrid([...stateRef.current.grid]); } 
      else if (type === ConsumableType.TACTICAL_NUKE) { stateRef.current.effects.push({ id: uuidv4(), type: 'DOOM_EXPLOSION', row: 2, col: 4, createdAt: Date.now(), duration: 2000 }); stateRef.current.zombies.forEach(z => z.health = -9999); } 
      else if (type === ConsumableType.TIME_FREEZE) { stateRef.current.effects.push({ id: uuidv4(), type: 'FREEZE', createdAt: Date.now(), duration: 10000 }); stateRef.current.zombies.forEach(z => z.freezeEffect = 10000); }
  }, []);

  const restoreState = () => {
      RESTORE_CONSTANTS();
  };

  return {
      grid,
      uiState,
      showHugeWave,
      dragOverCell,
      setDragOverCell,
      stateRef,
      resetGame,
      handleCollectSun,
      handleInteractWithCell,
      handleUseConsumable,
      restoreState,
      setUiState
  };
};
