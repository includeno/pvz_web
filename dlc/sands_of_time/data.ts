import { DLCContent } from '../types';
import { LevelScene } from '../../types';

const data: DLCContent = {
  "id": "sands_of_time",
  "name": "Sands of Time",
  "version": "1.2.0",
  "description": "Journey to the ancient desert. Beware of the curse!",
  "plants": [
    {
      "type": "CACTUS_WARRIOR",
      "name": "Cactus Warrior",
      "cost": 175,
      "cooldown": 5000,
      "health": 800,
      "icon": "🌵⚔️",
      "description": "A thorny defender that deals damage back to attackers.",
      "visualScale": 1.1
    },
    {
      "type": "GOLDEN_SUN",
      "name": "Golden Sun",
      "cost": 125,
      "cooldown": 5000,
      "health": 300,
      "icon": "🔱",
      "description": "Produces sun worth 75."
    }
  ],
  "zombies": {
    "MUMMY_ZOMBIE": {
      "health": 1800,
      "speed": 0.03,
      "damage": 2,
      "icon": "🤕",
      "visualScale": 1.1
    },
    "PHARAOH_BOSS": {
      "health": 5000,
      "speed": 0.02,
      "damage": 50,
      "icon": "👑",
      "visualScale": 1.5
    }
  },
  "levels": [
    {
      "id": 2001,
      "name": "Desert Storm",
      "mode": "CLASSIC",
      "scene": LevelScene.BALCONY,
      "totalWaves": 8,
      "startingSun": 400,
      "enabledZombies": [
        "NORMAL",
        "CONEHEAD",
        "MUMMY_ZOMBIE"
      ] as any,
      "spawnIntervalMultiplier": 0.9,
      "difficulty": 4,
      "backgroundDecorations": [
        {
          "id": "pyr1",
          "position": {
            "row": 0,
            "col": 0,
            "x": 2,
            "y": 15
          },
          "icon": "🔺",
          "scale": 8,
          "opacity": 0.2
        },
        {
          "id": "palm1",
          "position": {
            "row": 0,
            "col": 0,
            "x": 8,
            "y": 20
          },
          "icon": "🌴",
          "scale": 3,
          "opacity": 0.6
        }
      ]
    },
    {
      "id": 2002,
      "name": "Tomb Raid",
      "mode": "CLASSIC",
      "scene": LevelScene.BALCONY,
      "totalWaves": 12,
      "startingSun": 600,
      "enabledZombies": [
        "MUMMY_ZOMBIE",
        "PHARAOH_BOSS"
      ] as any,
      "spawnIntervalMultiplier": 0.8,
      "difficulty": 7,
      "backgroundDecorations": [
        {
          "id": "pyr2",
          "position": {
            "row": 0,
            "col": 0,
            "x": 5,
            "y": 15
          },
          "icon": "🔺",
          "scale": 10,
          "opacity": 0.15
        }
      ]
    }
  ]
};

export default data;