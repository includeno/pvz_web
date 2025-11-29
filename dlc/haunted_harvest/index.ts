
import { DLCContent } from '../types';
import { BaseZombieType, LevelScene } from '../../types';

const HauntedHarvestDLC: DLCContent = {
  id: 'haunted_harvest',
  name: 'Haunted Harvest',
  version: '0.6.6',
  description: 'Spooky plants for spooky times. Trick or treat!',
  
  plants: [
    {
      type: 'GHOST_PEPPER',
      name: 'Ghost Pepper',
      cost: 150,
      cooldown: 15000,
      health: 500,
      icon: '👻',
      description: 'Haunts zombies then explodes.',
    },
    {
        type: 'PUMPKIN_KING',
        name: 'Pumpkin King',
        cost: 125,
        cooldown: 10000,
        health: 2500,
        icon: '🎃',
        description: 'A sturdy shell for your plants.',
    }
  ],
  
  zombies: {
    'SKELETON_HORDE': {
      health: 80,
      speed: 0.2, // Very fast
      damage: 1,
      icon: '💀',
      visualScale: 0.8
    },
    'WITCH_ZOMBIE': {
        health: 600,
        speed: 0.05,
        damage: 2,
        icon: '🧙‍♀️',
        visualScale: 1.1
    }
  },

  levels: [
    {
      id: 4001,
      name: "Graveyard Shift",
      mode: 'CLASSIC',
      scene: LevelScene.GRAVEYARD,
      totalWaves: 15,
      startingSun: 200,
      enabledZombies: [BaseZombieType.NEWSPAPER, 'SKELETON_HORDE'],
      spawnIntervalMultiplier: 0.6,
      difficulty: 8,
      backgroundDecorations: [
          { id: 'moon', position: { row: 0, col: 0, x: 9, y: 10 }, icon: '🌕', scale: 6, opacity: 0.7 },
          { id: 'bat1', position: { row: 0, col: 0, x: 2, y: 30 }, icon: '🦇', scale: 1, opacity: 0.6 }
      ]
    },
    {
        id: 4002,
        name: "Witch's Brew",
        mode: 'CLASSIC',
        scene: LevelScene.GRAVEYARD,
        totalWaves: 10,
        startingSun: 1000,
        enabledZombies: ['WITCH_ZOMBIE', 'SKELETON_HORDE', BaseZombieType.SCREEN_DOOR],
        spawnIntervalMultiplier: 0.8,
        difficulty: 5
    }
  ]
};

export default HauntedHarvestDLC;
