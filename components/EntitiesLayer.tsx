

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { GameState, ZombieType, ProjectileType, Zombie, AnimationState, BaseZombieType, Projectile } from '../types';
import { ZOMBIE_STATS, COLS } from '../constants';

interface EntitiesLayerProps {
  gameStateRef: React.MutableRefObject<GameState>;
  onCollectSun: (id: string) => void;
}

// Sub-component to handle individual zombie render state (error handling for images)
const ZombieView: React.FC<{ zombie: Zombie; time: number }> = ({ zombie, time }) => {
    const [imgError, setImgError] = useState(false);
    
    // Scale Logic
    const stats = ZOMBIE_STATS[zombie.type];
    const visualScale = stats?.visualScale || 1.0;
    
    // Offset logic remains similar but scale is handled via transform
    const offset = zombie.type === 'BUCKETHEAD' ? -18 : -12; 
    const isFrozen = zombie.freezeEffect > 0;
    const isStunned = zombie.stunEffect > 0;
    const isDying = zombie.isDying;
    
    const icon = stats?.icon || '🧟';
    const visuals = stats?.visuals;

    // Visual Logic
    let renderedVisual: React.ReactNode = (
        <span className={`filter drop-shadow-md transition-all duration-300 ${isFrozen ? 'hue-rotate-180 brightness-75 contrast-125 saturate-150' : ''}`}>
            {icon}
        </span>
    );

    if (!imgError && visuals) {
        // Determine current action state
        let action = 'idle';
        
        // --- ANIMATION STATE MACHINE ---
        
        if (zombie.activeAbility === 'VAULT') action = 'jump';
        else if (zombie.activeAbility === 'SUMMON') action = 'summon';
        else if (zombie.activeAbility === 'CHARGING') action = 'run';
        else if (isDying) action = 'die';
        else if (zombie.isEating) action = 'attack';
        else if (zombie.type === BaseZombieType.POLE_VAULTING && !zombie.activeAbility && !zombie.hasVaulted) action = 'run'; // Pole Vault run phase
        else action = 'walk'; // Default movement
        
        // Fallback Logic
        // @ts-ignore
        let animation: AnimationState = visuals[action];
        // @ts-ignore
        if (!animation && action === 'walk') animation = visuals['idle'];
        // @ts-ignore
        if (!animation && action === 'run') animation = visuals['idle'];
        // @ts-ignore
        if (!animation && action === 'jump') animation = visuals['idle'];
        // @ts-ignore
        if (!animation && action === 'summon') animation = visuals['idle'];
        // @ts-ignore
        if (!animation && action === 'attack') animation = visuals['idle'];
        // @ts-ignore
        if (!animation && action === 'die') animation = visuals['idle'];
        
        if (animation && animation.frames && animation.frames.length > 0) {
            const fps = animation.fps || 5;
            const frameDuration = 1000 / fps;
            const frameIndex = Math.floor(time / frameDuration) % animation.frames.length;
            const imgSrc = animation.frames[frameIndex];
            
            renderedVisual = (
                <img 
                    src={imgSrc} 
                    className={`
                        w-24 h-24 object-contain image-pixelated drop-shadow-sm
                        ${isFrozen ? 'brightness-50 hue-rotate-180' : ''}
                    `}
                    alt="Zombie"
                    onError={() => setImgError(true)}
                />
            );
        }
    }

    const isVaulting = zombie.activeAbility === 'VAULT';

    return (
      <div
        className={`absolute text-6xl flex flex-col items-center justify-center 
          ${zombie.isEating && (imgError || !visuals) ? 'animate-pulse' : ''}
          ${isDying ? 'transition-all duration-1000 ease-in-out' : ''}
          ${isVaulting ? 'duration-500 ease-out' : ''}
        `}
        style={{
          left: `${(zombie.position.x || 0) * 100}%`,
          // Align feet to the bottom of the row roughly
          top: `${(zombie.position.row * 20) + 1}%`,
          transformOrigin: 'bottom center',
          transform: isDying 
             ? `translate(-50%, ${offset}%) scaleX(-1) rotate(90deg) scale(0.8)` 
             : `translate(-50%, ${offset}%) scaleX(-1) scale(${visualScale}) ${isVaulting ? 'translateY(-80px)' : ''}`, 
          // Ensure correct layering
          zIndex: (zombie.position.row * 100) + 50 + (isVaulting ? 200 : 0),
          opacity: isDying ? 0 : 1,
          filter: isDying ? 'grayscale(100%) brightness(50%)' : 'none'
        }}
      >
        {/* Butter Stun Visual */}
        {isStunned && !isDying && (
            <div className="absolute -top-6 z-50 text-4xl drop-shadow-sm animate-bounce" style={{transform: `scale(${1/visualScale})`}}>🧈</div>
        )}

        {renderedVisual}
        
        {/* Frozen Ice Block Visual */}
        {isFrozen && !isDying && (
            <div className="absolute inset-0 bg-cyan-400/40 rounded-full blur-sm scale-110 pointer-events-none border border-white/30" />
        )}

        {/* Health Bar (Only if damaged and not dying) */}
        {zombie.health < zombie.maxHealth && !isDying && (
            <div className="w-12 h-1.5 bg-black/60 mt-1 rounded-full overflow-hidden border border-white/10 scale-x-[-1]" style={{transform: `scale(${1/visualScale}) scaleX(-1)`}}>
            <div 
                className="h-full bg-lime-500"
                style={{ width: `${(zombie.health / zombie.maxHealth) * 100}%`}}
            />
            </div>
        )}
      </div>
    );
};

// New Sub-component for Projectiles
const ProjectileView: React.FC<{ proj: Projectile; time: number }> = ({ proj, time }) => {
    // Custom Visuals Logic
    if (proj.visuals) {
        const anim = proj.visuals['idle'] as AnimationState; // Assume 'idle' for bullet default
        if (anim && anim.frames && anim.frames.length > 0) {
             const fps = anim.fps || 10;
             const frameIndex = Math.floor(time / (1000/fps)) % anim.frames.length;
             let rotation = 0;
             
             // Dynamic rotation for parabolic/vector movement
             if (proj.vector) {
                 rotation = Math.atan2(proj.vector.y, proj.vector.x) * (180/Math.PI);
             } else if (proj.verticalOffset) {
                 // Approximate rotation for parabolic arcs
                 // We don't have current velocity vector easily available without calculating it
                 // but we can fake it or just rotate based on progress?
                 // For now, let it spin or stay flat unless it's a specific art style
                 if (proj.type === ProjectileType.COB) {
                     // Cob rotates slowly in air
                     rotation = (time / 10) % 360; 
                 }
             }
             
             return (
                 <div
                    className="absolute z-[200]"
                    style={{
                      left: `${(proj.position.x || 0) * 100}%`,
                      top: `${(proj.row * 20) + 6}%`,
                      transform: `translate(-50%, -50%) translateY(${proj.verticalOffset || 0}px) rotate(${rotation}deg)`,
                      width: '40px', height: '40px'
                    }}
                 >
                     <img src={anim.frames[frameIndex]} className="w-full h-full object-contain image-pixelated" alt="projectile" />
                 </div>
             )
        }
    }

    // Default Fallback
    let content = '🟢';
    let styleClass = '';
    if (proj.type === ProjectileType.FROZEN) { content = '🔵'; styleClass = 'filter hue-rotate-180 brightness-150'; }
    else if (proj.type === ProjectileType.FIRE) { content = '🔥'; styleClass = 'scale-125 drop-shadow-[0_0_2px_rgba(239,68,68,0.8)]'; }
    else if (proj.type === ProjectileType.MELON) { content = '🍉'; styleClass = 'scale-150 drop-shadow-md animate-spin-slow'; }
    else if (proj.type === ProjectileType.KERNEL) { content = '🌽'; styleClass = 'scale-75 animate-spin-slow'; }
    else if (proj.type === ProjectileType.BUTTER) { content = '🧈'; styleClass = 'scale-110 drop-shadow-sm animate-spin-slow'; }
    else if (proj.type === ProjectileType.COB) { content = '🌽'; styleClass = 'scale-[2.5] drop-shadow-xl z-50 animate-spin-slow'; }
    else if (proj.type === ProjectileType.STAR) { content = '⭐'; styleClass = 'scale-100 drop-shadow-md animate-spin z-50'; }

    return (
      <div
        className={`absolute text-2xl drop-shadow-sm z-20 ${styleClass}`}
        style={{
          left: `${(proj.position.x || 0) * 100}%`,
          top: `${(proj.row * 20) + 6}%`,
          transform: `translate(-50%, -50%) translateY(${proj.verticalOffset || 0}px)`,
        }}
      >
        {content}
      </div>
    );
}

export const EntitiesLayer: React.FC<EntitiesLayerProps> = ({ gameStateRef, onCollectSun }) => {
  // Force update trigger
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const frameRef = useRef<number>(0);

  // Independent Render Loop for smooth 60FPS
  useEffect(() => {
    const loop = () => {
      forceUpdate();
      frameRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // Read directly from the mutable ref without triggering parent renders
  const { zombies, projectiles, suns, grid, lawnCleaners, effects, decorations, time } = gameStateRef.current;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      
      {/* Background Decorations (DLC Content) */}
      {decorations && decorations.map(dec => (
          <div 
            key={dec.id}
            className="absolute pointer-events-none z-0 transition-opacity"
            style={{
                left: `${dec.position.x! * 10}%`, // Scale x relative to grid roughly
                top: `${dec.position.y}%`,
                fontSize: `${dec.scale}rem`,
                opacity: dec.opacity,
                transform: 'translate(-50%, -50%)'
            }}
          >
              {dec.icon}
          </div>
      ))}

      {/* Visual Effects Layer */}
      {effects && effects.map(effect => {
         if (effect.type === 'FIRE_ROW') {
             return (
                 <div key={effect.id} 
                      className="absolute left-0 w-full h-[20%] bg-gradient-to-r from-orange-600 via-yellow-500 to-red-600 z-30 opacity-80 animate-pulse mix-blend-overlay"
                      style={{ top: `${(effect.row || 0) * 20}%` }}
                 >
                    <div className="w-full h-full flex items-center justify-around text-4xl filter blur-sm">
                        <span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span>
                    </div>
                 </div>
             )
         }
         if (effect.type === 'EXPLOSION' || effect.type === 'DOOM_EXPLOSION') {
             const size = effect.type === 'DOOM_EXPLOSION' ? 'scale-[400%]' : 'scale-[200%]';
             return (
                 <div key={effect.id}
                      className={`absolute z-50 text-6xl transition-opacity duration-500 ${size}`}
                      style={{ 
                          left: `${((effect.col || 0) + 0.5) * (100/9)}%`, 
                          top: `${((effect.row || 0) + 0.5) * 20}%`,
                          transform: 'translate(-50%, -50%)',
                          opacity: (Date.now() - effect.createdAt) > (effect.duration - 200) ? 0 : 1
                      }}
                 >
                     💥
                 </div>
             )
         }
         if (effect.type === 'FREEZE') {
             return (
                 <div key={effect.id} className="absolute inset-0 bg-blue-300/40 z-50 mix-blend-hard-light pointer-events-none animate-pulse" />
             )
         }
         if (effect.type === 'ICE_TRAIL') {
             // Calculate visual position
             const top = (effect.row || 0) * 20;
             const left = (effect.col || 0) * (100/9);
             return (
                <div key={effect.id}
                    className="absolute bg-white/70 backdrop-blur-sm z-10 border-t-2 border-white/50"
                    style={{
                        left: `${left}%`,
                        top: `${top + 10}%`, // Lower half of the cell
                        width: `${100/9}%`,
                        height: '10%', // Half cell height
                        opacity: Math.max(0, 0.8 * (1 - (Date.now() - effect.createdAt) / effect.duration)),
                        transform: 'skewX(-10deg) scale(1.1)'
                    }}
                >
                    <div className="w-full h-full bg-blue-100/30 animate-pulse"></div>
                </div>
             )
         }
         return null;
      })}

      {/* Plant Health Overlays & Status */}
      {grid.map((row, r) => 
         row.map((plant, c) => {
            if (!plant) return null;
            
            // Potato Mine Arming Visual
            if (plant.type === 'POTATO_MINE' && !plant.isReady) {
                 const left = c * (100 / 9);
                 const top = r * 20;
                 return (
                   <div key={`pm-arm-${plant.id}`} 
                        className="absolute z-20 text-[10px] font-bold text-red-100 bg-red-600/80 px-1 rounded animate-pulse shadow-sm"
                        style={{ left: `${left + 5}%`, top: `${top + 5}%` }}>
                      ARMING...
                   </div>
                 )
            }

            if (plant.health >= plant.maxHealth) return null;
            const healthRatio = plant.health / plant.maxHealth;
            
            const top = r * 20; // 100% / 5 rows
            const left = c * (100 / 9); // 100% / 9 cols
            
            return (
               <React.Fragment key={`hp-${plant.id}`}>
                  <div 
                    className="absolute h-1.5 bg-gray-900/50 rounded-full overflow-hidden z-20 border border-white/20"
                    style={{ 
                        left: `${left + 1.5}%`, 
                        top: `${top + 15}%`, 
                        width: `${(100 / 9) - 3}%`
                    }}
                  >
                      <div 
                         className="h-full bg-gradient-to-r from-red-500 to-yellow-500 transition-all duration-200" 
                         style={{ width: `${healthRatio * 100}%` }}
                      />
                  </div>
               </React.Fragment>
            );
         })
       )}

      {/* Lawn Cleaners (Brooms) */}
      {lawnCleaners.map((cleaner) => (
        <div
          key={cleaner.id}
          className={`absolute text-5xl transition-transform z-30 ${cleaner.active ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]' : 'drop-shadow-lg'}`}
          style={{
            left: `${(cleaner.position.x || 0) * 100}%`,
            top: `${(cleaner.position.row * 20) + 2}%`,
            transform: 'translateX(-50%)',
            filter: cleaner.active ? 'brightness(150%) sepia(50%)' : 'none'
          }}
        >
          🧹
          {cleaner.active && (
             <div className="absolute right-full top-1/2 w-24 h-12 bg-gradient-to-l from-white/60 to-transparent -translate-y-1/2 skew-x-12 blur-sm" />
          )}
        </div>
      ))}

      {/* Projectiles */}
      {projectiles.map((proj) => (
          <ProjectileView key={proj.id} proj={proj} time={time} />
      ))}

      {/* Zombies */}
      {zombies.map((zombie) => (
          <ZombieView key={zombie.id} zombie={zombie} time={time} />
      ))}

      {/* Suns */}
      {suns.map((sun) => (
        <div
          key={sun.id}
          onClick={(e) => { e.stopPropagation(); onCollectSun(sun.id); }}
          className={`
            absolute cursor-pointer pointer-events-auto z-50
            group flex items-center justify-center
          `}
          style={{
            left: `${(sun.position.x || 0) * 100}%`,
            top: `${sun.position.y}%`,
            width: '80px', // Larger hit area
            height: '80px',
            transform: 'translate(-50%, -50%)',
            transition: 'top 0.1s linear'
          }}
        >
            <div className="text-6xl animate-spin-slow drop-shadow-[0_0_15px_rgba(253,224,71,0.8)] hover:scale-125 active:scale-95 transition-transform duration-100">
                ☀️
            </div>
            {/* Click helper ring */}
            <div className="absolute inset-0 rounded-full bg-yellow-400/0 group-hover:bg-yellow-400/10 transition-colors" />
        </div>
      ))}
    </div>
  );
};
