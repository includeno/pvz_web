import { PlantConfig, ZombieStatConfig, LevelConfig } from '../types';

export interface DLCContent {
  /** Unique ID for the DLC pack */
  id: string;
  /** Display Name */
  name: string;
  version?: string;
  description?: string;
  /** New Plants to add to the game */
  plants?: PlantConfig[];
  /** New Zombies to add to the game (key is the ID, value is stats) */
  zombies?: Record<string, ZombieStatConfig>;
  /** New Levels to add to the Adventure list */
  levels?: LevelConfig[];
}