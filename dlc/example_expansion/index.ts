
import { DLCContent } from '../types';
import { BaseZombieType, LevelScene } from '../../types';

// Example: A "Neon Future" expansion pack
const NeonCityDLC: DLCContent = {
  id: 'neon_city_dlc',
  name: 'Neon City Expansion',
  description: 'Adds futuristic plants and zombies.',
  
  plants: [
    {
      type: 'LASER_BEAN', // Custom String ID
      name: 'Laser Bean',
      cost: 200,
      cooldown: 5000,
      health: 300,
      icon: '👾',
      description: 'Shoots lasers (Cosmetic for now)',
    },
    {
        type: 'CHROMATIC_FLOWER',
        name: 'Chromatic Flower',
        cost: 75,
        cooldown: 5000,
        health: 200,
        icon: '🌈',
        description: 'Pretty but useless',
    }
  ],
  
  zombies: {
    'CYBORG_ZOMBIE': {
      health: 800,
      speed: 0.08,
      damage: 2,
      icon: '🤖',
    }
  },

  levels: [
    {
      id: 1001, // Custom high ID
      name: "Neon Level 1",
      mode: 'CLASSIC', // Default to Classic mode
      scene: LevelScene.FACTORY, // Use Factory scene for neon theme
      totalWaves: 5,
      startingSun: 300,
      enabledZombies: [BaseZombieType.NORMAL, 'CYBORG_ZOMBIE'], // Mixing base and DLC types
      spawnIntervalMultiplier: 0.8,
      backgroundDecorations: [
          { id: 'd1', position: { row: 0, col: 0, x: 0.5, y: 10 }, icon: '🏙️', scale: 4, opacity: 0.2 },
          { id: 'd2', position: { row: 0, col: 0, x: 8.5, y: 80 }, icon: '🛸', scale: 2, opacity: 0.5 }
      ]
    }
  ]
};

export default NeonCityDLC;
