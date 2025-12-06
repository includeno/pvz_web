import { DLCContent } from '../types';
import { LevelScene } from '../../types';

const data: DLCContent = {
  "id": "neon_city_dlc",
  "name": "Neon City Expansion",
  "description": "Adds futuristic plants and zombies.",
  "plants": [
    {
      "type": "LASER_BEAN",
      "name": "Laser Bean",
      "cost": 200,
      "cooldown": 5000,
      "health": 300,
      "icon": "👾",
      "description": "Shoots lasers (Cosmetic for now)"
    },
    {
      "type": "CHROMATIC_FLOWER",
      "name": "Chromatic Flower",
      "cost": 75,
      "cooldown": 5000,
      "health": 200,
      "icon": "🌈",
      "description": "Pretty but useless"
    }
  ],
  "zombies": {
    "CYBORG_ZOMBIE": {
      "health": 800,
      "speed": 0.08,
      "damage": 2,
      "icon": "🤖"
    }
  },
  "levels": [
    {
      "id": 1001,
      "name": "Neon Level 1",
      "mode": "CLASSIC",
      "scene": LevelScene.FACTORY,
      "totalWaves": 5,
      "startingSun": 300,
      "enabledZombies": [
        "NORMAL",
        "CYBORG_ZOMBIE"
      ] as any,
      "spawnIntervalMultiplier": 0.8,
      "backgroundDecorations": [
        {
          "id": "d1",
          "position": {
            "row": 0,
            "col": 0,
            "x": 0.5,
            "y": 10
          },
          "icon": "🏙️",
          "scale": 4,
          "opacity": 0.2
        },
        {
          "id": "d2",
          "position": {
            "row": 0,
            "col": 0,
            "x": 8.5,
            "y": 80
          },
          "icon": "🛸",
          "scale": 2,
          "opacity": 0.5
        }
      ]
    }
  ]
};

export default data;