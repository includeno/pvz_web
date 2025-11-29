
export enum GamePhase {
  MENU = 'MENU',
  LEVEL_SELECTION = 'LEVEL_SELECTION',
  LEVEL_EDITOR = 'LEVEL_EDITOR',
  BASE_EDITOR = 'BASE_EDITOR',
  EDITOR_MENU = 'EDITOR_MENU',
  SELECTION = 'SELECTION',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  // New Endless Phases
  ENDLESS_SELECTION = 'ENDLESS_SELECTION',
  ENDLESS_SHOP = 'ENDLESS_SHOP'
}

export interface AppSettings {
  musicVolume: number;
  sfxVolume: number;
  gameSpeed: number;
}

// Allow string expansion for Modded Plants
export type PlantTypeString = string;
export enum BasePlantType {
  SUNFLOWER = 'SUNFLOWER',
  PEASHOOTER = 'PEASHOOTER',
  WALLNUT = 'WALLNUT',
  CHERRY_BOMB = 'CHERRY_BOMB',
  POTATO_MINE = 'POTATO_MINE',
  SNOW_PEA = 'SNOW_PEA',
  CHOMPER = 'CHOMPER',
  REPEATER = 'REPEATER',
  PUFF_SHROOM = 'PUFF_SHROOM',
  SUN_SHROOM = 'SUN_SHROOM',
  FUME_SHROOM = 'FUME_SHROOM',
  GRAVE_BUSTER = 'GRAVE_BUSTER',
  HYPNO_SHROOM = 'HYPNO_SHROOM',
  SCAREDY_SHROOM = 'SCAREDY_SHROOM',
  ICE_SHROOM = 'ICE_SHROOM',
  DOOM_SHROOM = 'DOOM_SHROOM',
  SQUASH = 'SQUASH',
  JALAPENO = 'JALAPENO',
  SPIKEWEED = 'SPIKEWEED',
  MELON_PULT = 'MELON_PULT',
  KERNEL_PULT = 'KERNEL_PULT',
  TWIN_SUNFLOWER = 'TWIN_SUNFLOWER',
  THREEPEATER = 'THREEPEATER',
  GATLING_PEA = 'GATLING_PEA',
  TORCHWOOD = 'TORCHWOOD',
  TALLNUT = 'TALLNUT',
  // New Large Plant
  COB_CANNON = 'COB_CANNON',
  // New Multi-Direction Plant
  STARFRUIT = 'STARFRUIT'
}
export type PlantType = BasePlantType | PlantTypeString;

// Allow string expansion for Modded Zombies
export type ZombieTypeString = string;
export enum BaseZombieType {
  NORMAL = 'NORMAL',
  CONEHEAD = 'CONEHEAD',
  BUCKETHEAD = 'BUCKETHEAD',
  FOOTBALL = 'FOOTBALL',
  NEWSPAPER = 'NEWSPAPER',
  SCREEN_DOOR = 'SCREEN_DOOR',
  // New Large Zombies
  GARGANTUAR = 'GARGANTUAR',
  IMP = 'IMP',
  MECH_BOSS = 'MECH_BOSS'
}
export type ZombieType = BaseZombieType | ZombieTypeString;

export enum ProjectileType {
  NORMAL = 'NORMAL',
  FROZEN = 'FROZEN',
  FIRE = 'FIRE',
  MELON = 'MELON',
  KERNEL = 'KERNEL',
  BUTTER = 'BUTTER',
  COB = 'COB', // New Cob Cannon Projectile
  STAR = 'STAR' // Starfruit projectile
}

export interface Position {
  row: number;
  col: number;
  x?: number;
  y?: number;
}

export interface Entity {
  id: string;
  position: Position;
}

export interface Effect {
  id: string;
  type: 'EXPLOSION' | 'FIRE_ROW' | 'FREEZE' | 'BUTTER_SPLAT' | 'DOOM_EXPLOSION';
  row?: number;
  col?: number;
  createdAt: number;
  duration: number;
}

export interface LawnCleaner extends Entity {
  row: number;
  active: boolean;
}

export interface Plant extends Entity {
  type: PlantType;
  health: number;
  maxHealth: number;
  lastActionTime: number;
  isReady: boolean;
  createdAt: number;
}

export interface Zombie extends Entity {
  type: ZombieType;
  health: number;
  maxHealth: number;
  speed: number;
  isEating: boolean;
  attackDamage: number;
  freezeEffect: number;
  stunEffect: number; // 0 = not stunned
  isDying: boolean;
  dyingSince: number;
}

export interface Projectile extends Entity {
  type: ProjectileType;
  damage: number;
  speed: number;
  row: number;
  // For targeted projectiles (Cob Cannon)
  targetRow?: number;
  targetCol?: number;
  initialY?: number;
  elapsedTime?: number;
  // For directional projectiles
  vector?: { x: number, y: number };
}

export interface SunResource extends Entity {
  value: number;
  targetY: number;
  createdAt: number;
  isCollected: boolean;
}

export interface Decoration extends Entity {
  icon: string;
  scale: number;
  opacity: number;
}

export interface GameState {
  sun: number;
  grid: (Plant | null)[][];
  zombies: Zombie[];
  projectiles: Projectile[];
  suns: SunResource[];
  lawnCleaners: LawnCleaner[];
  effects: Effect[];
  decorations: Decoration[]; 
  gameOver: boolean;
  victory: boolean;
  wave: number;
  score: number;
  time: number;
  activeTextOverlay?: {
      content: string;
      style: 'WARNING' | 'INFO' | 'SPOOKY';
      endTime: number;
  };
  targetingPlantId?: string | null; // ID of the plant currently targeting (Cob Cannon)
}

export interface AnimationState {
  frames: string[]; // Array of Base64 strings
  fps: number;      // Frames per second
}

export interface EntityVisuals extends Record<string, AnimationState | number | undefined> {
    gridSize?: number; 
}

export type AttackDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'UP_RIGHT' | 'DOWN_RIGHT' | 'UP_LEFT' | 'DOWN_LEFT';

export interface PlantConfig {
  type: PlantType;
  name: string;
  cost: number;
  cooldown: number;
  health: number;
  icon: string;
  description: string;
  visuals?: EntityVisuals; 
  visualScale?: number;
  attackDirections?: AttackDirection[]; // If present, plant shoots in these directions without aiming check
}

export interface ZombieStatConfig {
  health: number;
  speed: number;
  damage: number;
  icon: string;
  visuals?: EntityVisuals; 
  visualScale?: number; 
}

// --- NEW LEVEL SYSTEM ---

export enum LevelScene {
  LAWN_DAY = 'LAWN_DAY',
  LAWN_NIGHT = 'LAWN_NIGHT',
  BALCONY = 'BALCONY',
  FACTORY = 'FACTORY',
  GRAVEYARD = 'GRAVEYARD'
}

export interface WaveDefinition {
  waveNumber: number;
  zombies: {
      type: ZombieType;
      count: number;
  }[];
  startDelay?: number; // Delay before this wave starts (ms)
  isFlagWave?: boolean; // Huge Wave?
}

export interface ScriptedEvent {
  time: number; // Time in ms from start of level
  type: 'TEXT';
  content: string;
  style: 'WARNING' | 'INFO' | 'SPOOKY';
  duration: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  startingSun: number;
  enabledZombies: ZombieType[]; // Still needed for loading assets/cache
  
  // Config Mode
  mode: 'CLASSIC' | 'SCRIPTED';
  
  // Classic Mode Props
  totalWaves?: number;
  spawnIntervalMultiplier?: number; 

  // Scripted Mode Props
  waves?: WaveDefinition[];
  events?: ScriptedEvent[];

  // Visuals
  scene: LevelScene;
  backgroundDecorations?: Decoration[];

  // Unlock System
  unlocksPlant?: PlantType; // Plant unlocked upon victory
  seedSlots?: number;      // Max seeds allowed (default 6-9)
  difficulty?: number;     // 1-10 Stars
}

export interface DLCManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  plants?: PlantConfig[];
  zombies?: Record<string, ZombieStatConfig>;
  levels?: LevelConfig[];
}

// --- ENDLESS MODE TYPES ---

export enum ConsumableType {
  SUN_PACK = 'SUN_PACK',
  REPAIR_KIT = 'REPAIR_KIT',
  TACTICAL_NUKE = 'TACTICAL_NUKE',
  TIME_FREEZE = 'TIME_FREEZE'
}

export interface EndlessSaveSlot {
  id: number;
  floor: number;
  score: number;
  inventory: Record<string, number>; // ConsumableType -> count
  dlcIds: string[];
  timestamp: number;
  // Snapshot of data to decouple from currently loaded DLCs
  statsSnapshot: {
      plants: Record<string, PlantConfig>;
      zombies: Record<string, ZombieStatConfig>;
  };
  // Persistence Snapshots
  gridSnapshot?: (Plant | null)[][];
  sunSnapshot?: SunResource[];
}
