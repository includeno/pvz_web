
import { DLCContent } from '../types';
import { BaseZombieType, LevelScene } from '../../types';

const GalacticGardensDLC: DLCContent = {
  id: 'galactic_gardens',
  name: 'Galactic Gardens',
  version: '2.0.1',
  description: 'Defend your space station from alien invaders.',
  
  plants: [
    {
      type: 'PLASMA_PEA',
      name: 'Plasma Pea',
      cost: 250,
      cooldown: 3000,
      health: 400,
      icon: '💠',
      description: 'Shoots high-velocity plasma bolts.',
    },
    {
        type: 'FORCE_FIELD',
        name: 'Force Field',
        cost: 75,
        cooldown: 20000,
        health: 6000,
        icon: '🛡️',
        description: 'A futuristic barrier.',
    }
  ],
  
  zombies: {
    'ALIEN_COMMANDER': {
      health: 800,
      speed: 0.1,
      damage: 5,
      icon: '👽',
      visualScale: 1.0
    },
    'UFO_ZOMBIE': {
        health: 500,
        speed: 0.15,
        damage: 1,
        icon: '🛸',
        visualScale: 1.2
    }
  },

  levels: [
    {
      id: 3001,
      name: "Sector 7",
      mode: 'CLASSIC',
      scene: LevelScene.FACTORY,
      totalWaves: 10,
      startingSun: 500,
      enabledZombies: [BaseZombieType.BUCKETHEAD, 'ALIEN_COMMANDER'],
      spawnIntervalMultiplier: 0.7,
      difficulty: 6,
      backgroundDecorations: [
          { id: 'star1', position: { row: 0, col: 0, x: 1, y: 10 }, icon: '✨', scale: 1, opacity: 0.8 },
          { id: 'planet1', position: { row: 0, col: 0, x: 8, y: 20 }, icon: '🪐', scale: 5, opacity: 0.4 }
      ]
    },
    {
        id: 3002,
        name: "Mothership Defense",
        mode: 'CLASSIC',
        scene: LevelScene.FACTORY,
        totalWaves: 20,
        startingSun: 1000,
        enabledZombies: ['ALIEN_COMMANDER', 'UFO_ZOMBIE', BaseZombieType.GARGANTUAR],
        spawnIntervalMultiplier: 0.5,
        difficulty: 9
      }
  ]
};

export default GalacticGardensDLC;
