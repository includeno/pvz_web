

import React, { useEffect, useState } from 'react';
import { Plant, LevelScene, AnimationState, BasePlantType } from '../types';
import { PLANT_STATS } from '../constants';

interface GridCellProps {
  row: number;
  col: number;
  plant: Plant | null;
  isDragOver: boolean;
  scene: LevelScene;
  isTargeting?: boolean; // New prop for visual feedback
}

// Memoized
export const GridCell: React.FC<GridCellProps> = React.memo(({ row, col, plant, isDragOver, scene, isTargeting }) => {
  const isOdd = (row + col) % 2 === 1;
  const isColOdd = col % 2 === 1;

  let bgClass = '';
  
  switch (scene) {
      case LevelScene.LAWN_NIGHT:
          bgClass = isColOdd ? 'bg-indigo-900' : 'bg-indigo-950';
          break;
      case LevelScene.BALCONY:
          bgClass = isColOdd ? 'bg-amber-800' : 'bg-amber-900'; // Wood look
          break;
      case LevelScene.FACTORY:
          bgClass = isColOdd ? 'bg-slate-600' : 'bg-slate-700'; // Concrete
          break;
      case LevelScene.GRAVEYARD:
          bgClass = isOdd ? 'bg-stone-800' : 'bg-stone-900'; // Checkerboard stone
          break;
      case LevelScene.LAWN_DAY:
      default:
          bgClass = isColOdd ? 'bg-green-700' : 'bg-green-600'; // Classic Stripes
          break;
  }

  // --- Animation Logic for Plants ---
  const [frameIndex, setFrameIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  
  // Safe access to config
  const plantConfig = plant ? PLANT_STATS[plant.type] : null;
  const visuals = plantConfig?.visuals;
  const visualScale = plantConfig?.visualScale || 1.0;
  
  // Default to 'idle' action for plants
  let animName = 'idle';
  
  // Cob Cannon Special State Logic
  if (plant?.type === BasePlantType.COB_CANNON) {
      if (!plant.isReady) animName = 'charging';
  }

  const idleAnim = visuals?.[animName] as AnimationState | undefined;
  const idleFrames = idleAnim?.frames || [];
  const fps = idleAnim?.fps || 5;

  // Reset error state when plant changes
  useEffect(() => {
      setImgError(false);
      setFrameIndex(0);
  }, [plant?.id, plant?.type, animName]);

  useEffect(() => {
      if (idleFrames.length > 1) {
          const intervalMs = 1000 / fps;
          const interval = setInterval(() => {
              setFrameIndex(prev => (prev + 1) % idleFrames.length);
          }, intervalMs);
          return () => clearInterval(interval);
      }
  }, [idleFrames.length, fps]); 

  // Safe frame access
  const currentFrameSrc = (idleFrames.length > 0 && !imgError) ? idleFrames[frameIndex % idleFrames.length] : null;

  // Determine Highlighting
  // If planting: highlight empty cells (or shovel targets). 
  // If targeting (Cob Cannon): highlight ANY cell.
  let highlightClass = '';
  if (isDragOver) {
      if (isTargeting) {
           highlightClass = 'brightness-125 saturate-150 ring-4 ring-red-500 ring-inset z-50 shadow-[inset_0_0_30px_rgba(239,68,68,0.5)] cursor-crosshair';
      } else if (!plant) {
           highlightClass = 'brightness-150 shadow-[inset_0_0_20px_rgba(255,255,255,0.6)]';
      } else if (plant.type === BasePlantType.COB_CANNON) {
          // Hovering over cannon to activate it
          highlightClass = 'ring-2 ring-yellow-400 cursor-pointer brightness-125';
      }
  }

  return (
    <div
      className={`
        relative w-full h-full border-white/5 border-r-[1px] border-b-[1px]
        flex items-center justify-center text-4xl select-none
        transition-all duration-100
        ${bgClass}
        ${highlightClass}
      `}
      style={{
          // Apply row-based z-index to ensure correct layering for 2.5D perspective
          zIndex: 10 + row
      }}
    >
      {/* Scene Overlay Textures */}
      {scene === LevelScene.BALCONY && (
          <div className="absolute inset-0 border-x-2 border-black/20 opacity-50 pointer-events-none" />
      )}
      {scene === LevelScene.FACTORY && (
          <div className="absolute inset-2 border-2 border-yellow-500/20 pointer-events-none" />
      )}
      
      {/* Targeting Reticle Overlay */}
      {isDragOver && isTargeting && (
          <div className="absolute inset-0 flex items-center justify-center text-red-600 text-6xl opacity-80 pointer-events-none animate-pulse z-[60]">
              ✛
          </div>
      )}

      {plant && (
        <div 
            className={`relative animate-bounce-subtle pointer-events-none w-full h-full flex items-center justify-center`}
            style={{
                transform: `scale(${visualScale})`,
                transformOrigin: 'bottom center', // Grow upwards/outwards from base
                zIndex: visualScale > 1.2 ? 50 : 10 // Boost Z if mega plant
            }}
        >
          {currentFrameSrc ? (
              <img 
                src={currentFrameSrc} 
                alt={plant.type} 
                className={`
                    w-[85%] h-[85%] object-contain drop-shadow-2xl filter image-pixelated
                    ${plant.type === BasePlantType.COB_CANNON && plant.isReady ? 'brightness-110' : ''}
                    ${plant.type === BasePlantType.COB_CANNON && !plant.isReady ? 'brightness-75 grayscale sepia' : 'brightness-110'}
                `}
                onError={() => setImgError(true)}
              />
          ) : (
             <span className="drop-shadow-2xl filter brightness-110">{plantConfig?.icon || '🌱'}</span>
          )}
          
          {/* Cob Cannon Reload Bar (optional, small text) */}
          {plant.type === BasePlantType.COB_CANNON && !plant.isReady && (
              <div className="absolute bottom-0 bg-black/50 text-white text-[8px] px-1 rounded font-mono">
                  RELOADING
              </div>
          )}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
    const prevPlant = prev.plant;
    const nextPlant = next.plant;
    
    // Check if plant changed ID, Type, or if config visuals changed or if plant ready state changed
    const plantChanged = (prevPlant?.id !== nextPlant?.id) || 
                         (prevPlant?.type !== nextPlant?.type) || 
                         (prevPlant?.isReady !== nextPlant?.isReady);
    
    const dragChanged = prev.isDragOver !== next.isDragOver;
    const sceneChanged = prev.scene !== next.scene;
    const targetingChanged = prev.isTargeting !== next.isTargeting;
    
    return !plantChanged && !dragChanged && !sceneChanged && !targetingChanged;
});