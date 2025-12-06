
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
  language: 'en' | 'zh';
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
  STARFRUIT = 'STARFRUIT',
  // Technical
  PLACEHOLDER = 'PLACEHOLDER'
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
  MECH_BOSS = 'MECH_BOSS',
  // New Special Zombies
  POLE_VAULTING = 'POLE_VAULTING',
  DANCING = 'DANCING',
  BACKUP_DANCER = 'BACKUP_DANCER',
  ZOMBONI = 'ZOMBONI'
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

export enum TrajectoryType {
  STRAIGHT = 'STRAIGHT',
  PARABOLIC = 'PARABOLIC', // Melon-pult style
  LOBBED = 'LOBBED'       // Cob Cannon style (High arc)
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
  type: 'EXPLOSION' | 'FIRE_ROW' | 'FREEZE' | 'BUTTER_SPLAT' | 'DOOM_EXPLOSION' | 'ICE_TRAIL';
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
  state?: 'IDLE' | 'ATTACK' | 'CHARGING'; // Added state for animation control
  abilityCooldowns: Record<string, number>; // New: Track individual ability CDs (e.g. sun production)
  parentId?: string; // For multi-tile plants (Placeholders point to main)
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
  
  // Ability State System
  abilityCooldowns: Record<string, number>; // key: abilityType, value: lastUsedTime
  activeAbility?: string | null; // Currently executing ability (e.g., 'VAULT')
  activeAbilityTimer?: number; // When the current ability started
  
  // Legacy/Specific flags (to be phased out or kept for simple logic)
  hasVaulted?: boolean;
}

export interface Projectile extends Entity {
  type: ProjectileType;
  damage: number;
  speed: number;
  row: number;
  
  // Trajectory System
  trajectory: TrajectoryType;
  startX?: number; // X Coordinate 0.0 - 9.0
  startRow?: number;
  destX?: number; // Target X
  destRow?: number; // Target Row
  
  startTime?: number;
  flightDuration?: number; // ms to reach target
  arcHeight?: number; // Visual offset max height (percentage of row height or pixels)
  
  verticalOffset?: number; // Current calculated visual offset (negative Y)
  
  // For straight directional projectiles
  vector?: { x: number, y: number };
  
  // Customization
  homing?: boolean;
  visuals?: EntityVisuals;
}

export interface SunResource extends Entity {
  value: number;
  targetY: number;
  createdAt: number;
  isCollected: boolean;
  sourcePlantId?: string; // ID of the plant that produced this sun (if any)
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

// --- PLANT ABILITY SYSTEM ---
export type PlantAbilityType = 'PRODUCE_SUN' | 'SHOOT' | 'EXPLODE' | 'SQUASH' | 'FREEZE_ALL' | 'WALL' | 'BLOCK_VAULT' | 'BURN_ROW';

export interface PlantAbilityConfig {
    type: PlantAbilityType;
    // Common params
    interval?: number; // ms between actions (e.g. shooting rate, sun production)
    cooldown?: number; // ms initial delay or specific ability cooldown
    // Sun params
    sunValue?: number;
    // Shoot params
    damage?: number;
    range?: number; // tiles
    projectileType?: ProjectileType;
    projectileDirection?: AttackDirection; // Optional direction override
    projectileHoming?: boolean; // Does it track targets?
    projectileVisuals?: EntityVisuals; // Custom visuals for the bullet
    multiShotDelay?: number; // For repeaters (e.g. 150ms)
    shotsPerTrigger?: number; // How many shots (e.g. 2 for repeater)
    
    // Trajectory Params
    trajectory?: TrajectoryType;
    arcHeight?: number; // Height of arc in % of cell height approx (e.g., 200 = 2 cells high)
    flightDuration?: number; // Fixed flight time in ms (for lobbed shots)

    // Explode/Squash params
    triggerRange?: number;
}

export interface EntityTranslations {
    [lang: string]: {
        name?: string;
        description?: string;
    }
}

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
  abilities?: PlantAbilityConfig[]; // Dynamic abilities
  translations?: EntityTranslations;
}

// --- ZOMBIE ABILITY SYSTEM ---
export type ZombieAbilityType = 'SUMMON' | 'VAULT' | 'ICE_TRAIL' | 'CRUSH_PLANTS';

export interface AbilityConfig {
  type: ZombieAbilityType;
  cooldown?: number; // ms
  initialCooldown?: number; // ms
  duration?: number; // How long the state lasts (e.g. Vaulting air time)
  
  // Summon Params
  summonType?: string;
  summonCount?: number;
  summonRadius?: number; // 1 = adjacent
  
  // Vault Params
  vaultDistance?: number; // tiles to jump
  
  // Ice Trail
  trailDuration?: number;
}

export interface ZombieStatConfig {
  health: number;
  speed: number;
  damage: number;
  icon: string;
  visuals?: EntityVisuals; 
  visualScale?: number;
  abilities?: AbilityConfig[]; // Dynamic abilities
  translations?: EntityTranslations;
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
