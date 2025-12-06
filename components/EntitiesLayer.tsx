
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { GameState, ZombieType, ProjectileType, Zombie, AnimationState, BaseZombieType, Projectile } from '../types';
import { ZOMBIE_STATS, COLS, ROWS } from '../constants';

interface EntitiesLayerProps {
  gameStateRef: React.MutableRefObject<GameState>;
  onCollectSun: (id: string) => void;
}

const ZombieView: React.FC<{ zombie: Zombie; time: number }> = ({ zombie, time }) => {
    const [imgError, setImgError] = useState(false);
    
    const stats = ZOMBIE_STATS[zombie.type];
    const visualScale = stats?.visualScale || 1.0;
    
    const offset = zombie.type === 'BUCKETHEAD' ? -18 : -12; 
    const isFrozen = zombie.freezeEffect > 0;
    const isStunned = zombie.stunEffect > 0;
    const isDying = zombie.isDying;
    
    const icon = stats?.icon || '🧟';
    const visuals = stats?.visuals;

    let renderedVisual: React.ReactNode = (
        <span className={`filter drop-shadow-md transition-all duration-300 ${isFrozen ? 'hue-rotate-180 brightness-75 contrast-125 saturate-150' : ''}`}>
            {icon}
        </span>
    );

    if (!imgError && visuals) {
        let action = 'idle';
        if (zombie.activeAbility === 'VAULT') action = 'jump';
        else if (zombie.activeAbility === 'SUMMON') action = 'summon';
        else if (zombie.activeAbility === 'CHARGING') action = 'run';
        else if (isDying) action = 'die';
        else if (zombie.isEating) action = 'attack';
        else if (zombie.type === BaseZombieType.POLE_VAULTING && !zombie.activeAbility && !zombie.hasVaulted) action = 'run';
        else action = 'walk';
        
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
    
    const rowHeight = 100 / ROWS;
    const currentRow = zombie.position.row !== undefined ? zombie.position.row : 0;

    return (
      <div
        className={`absolute text-6xl flex flex-col items-center justify-center 
          ${zombie.isEating && (imgError || !visuals) ? 'animate-pulse' : ''}
          ${isDying ? 'transition-all duration-1000 ease-in-out' : ''}
          ${isVaulting ? 'duration-500 ease-out' : ''}
        `}
        style={{
          left: `${(zombie.position.x || 0) * 100}%`,
          top: `${(currentRow * rowHeight) + 1}%`, 
          transformOrigin: 'bottom center',
          transform: isDying 
             ? `translate(-50%, ${offset}%) scaleX(-1) rotate(90deg) scale(0.8)` 
             : `translate(-50%, ${offset}%) scaleX(-1) scale(${visualScale}) ${isVaulting ? 'translateY(-80px)' : ''}`, 
          zIndex: (currentRow * 100) + 50 + (isVaulting ? 200 : 0),
          opacity: isDying ? 0 : 1,
          filter: isDying ? 'grayscale(100%) brightness(50%)' : 'none'
        }}
      >
        {isStunned && !isDying && (
            <div className="absolute -top-6 z-50 text-4xl drop-shadow-sm animate-bounce" style={{transform: `scale(${1/visualScale})`}}>🧈</div>
        )}

        {renderedVisual}
        
        {isFrozen && !isDying && (
            <div className="absolute inset-0 bg-cyan-400/40 rounded-full blur-sm scale-110 pointer-events-none border border-white/30" />
        )}

        {zombie.health < zombie.maxHealth && !isDying && (
            <div className="w-12 h-1.5 bg-black/60 mt-1 rounded-full overflow-hidden border border-white/10 scale-x-[-1]" style={{transform: `scale(${1/visualScale}) scaleX(-1)`}}>
            <div 
                className="h-full bg-lime-500"
                style={{ width: `${Math.max(0, (zombie.health / zombie.maxHealth) * 100)}%`}}
            />
            </div>
        )}
      </div>
    );
};

const ProjectileView: React.FC<{ proj: Projectile; time: number }> = ({ proj, time }) => {
    const rowHeight = 100 / ROWS;

    if (proj.visuals) {
        const anim = proj.visuals['idle'] as AnimationState;
        if (anim && anim.frames && anim.frames.length > 0) {
             const fps = anim.fps || 10;
             const frameIndex = Math.floor(time / (1000/fps)) % anim.frames.length;
             let rotation = 0;
             
             if (proj.vector) {
                 rotation = Math.atan2(proj.vector.y, proj.vector.x) * (180/Math.PI);
             } else if (proj.verticalOffset) {
                 if (proj.type === ProjectileType.COB) {
                     rotation = (time / 10) % 360; 
                 }
             }
             
             return (
                 <div
                    className="absolute z-[200]"
                    style={{
                      left: `${(proj.position.x || 0) * 100}%`,
                      top: `${(proj.row * rowHeight) + (rowHeight/3)}%`,
                      transform: `translate(-50%, -50%) translateY(${proj.verticalOffset || 0}px) rotate(${rotation}deg)`,
                      width: '40px', height: '40px'
                    }}
                 >
                     <img src={anim.frames[frameIndex]} className="w-full h-full object-contain image-pixelated" alt="projectile" />
                 </div>
             )
        }
    }

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
          top: `${(proj.row * rowHeight) + (rowHeight/3)}%`,
          transform: `translate(-50%, -50%) translateY(${proj.verticalOffset || 0}px)`,
        }}
      >
        {content}
      </div>
    );
}

export const EntitiesLayer: React.FC<EntitiesLayerProps> = ({ gameStateRef, onCollectSun }) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const loop = () => {
      forceUpdate();
      frameRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const { zombies, projectiles, suns, lawnCleaners, effects, decorations, time } = gameStateRef.current;
  
  const rowHeight = 100 / ROWS;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      
      {decorations && decorations.map(dec => (
          <div 
            key={dec.id}
            className="absolute pointer-events-none z-0 transition-opacity"
            style={{
                left: `${dec.position.x! * 10}%`,
                top: `${dec.position.y}%`,
                fontSize: `${dec.scale}rem`,
                opacity: dec.opacity,
                transform: 'translate(-50%, -50%)'
            }}
          >
              {dec.icon}
          </div>
      ))}

      {effects && effects.map(effect => {
         if (effect.type === 'FIRE_ROW') {
             return (
                 <div key={effect.id} 
                      className="absolute left-0 w-full bg-gradient-to-r from-orange-500/80 via-red-600/80 to-yellow-500/80 z-30 animate-pulse border-y-4 border-orange-400/50"
                      style={{ top: `${(effect.row || 0) * rowHeight}%`, height: `${rowHeight}%` }}
                 >
                    <div className="w-full h-full flex items-center justify-around text-6xl filter drop-shadow-lg">
                        <span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span>
                    </div>
                 </div>
             )
         }
         
         const size = effect.type === 'DOOM_EXPLOSION' ? 'scale-[400%]' : 'scale-150';
         const visual = effect.type === 'FREEZE' ? '❄️' 
                      : effect.type === 'BUTTER_SPLAT' ? '🧈' 
                      : effect.type === 'ICE_TRAIL' ? '❄️'
                      : '💥';
         
         if (effect.type === 'ICE_TRAIL') {
             return (
                 <div key={effect.id} 
                      className="absolute bg-cyan-200/40 blur-sm z-10"
                      style={{
                          left: `${(effect.col || 0) * 11.1}%`,
                          top: `${(effect.row || 0) * rowHeight}%`,
                          width: '11.1%',
                          height: `${rowHeight}%`
                      }}
                 />
             );
         }

         return (
             <div 
                key={effect.id} 
                className={`absolute z-50 text-6xl drop-shadow-2xl animate-ping ${size}`}
                style={{
                    left: `${(effect.col || 0) * 11.1 + 5.5}%`,
                    top: `${(effect.row || 0) * rowHeight + (rowHeight/2)}%`,
                    transform: 'translate(-50%, -50%)'
                }}
             >
                 {visual}
             </div>
         );
      })}

      {lawnCleaners.map(cleaner => (
          <div 
            key={cleaner.id}
            className={`absolute z-20 transition-transform duration-100 ${cleaner.active ? 'animate-vibrate' : ''}`}
            style={{
                left: `${(cleaner.position.x || -0.1) * 100}%`,
                top: `${(cleaner.row * rowHeight) + 2}%`,
                transform: 'translate(-50%, 0)'
            }}
          >
              <img src="https://em-content.zobj.net/source/microsoft-teams/363/automobile_1f697.png" alt="Mower" className="w-16 h-12 object-contain filter hue-rotate-90 brightness-75 drop-shadow-lg" />
          </div>
      ))}

      {zombies.map(zombie => (
          <ZombieView key={zombie.id} zombie={zombie} time={time} />
      ))}

      {projectiles.map(proj => (
          <ProjectileView key={proj.id} proj={proj} time={time} />
      ))}

      {suns.map(sun => (
          <div
            key={sun.id}
            onClick={() => { if(!sun.isCollected) onCollectSun(sun.id); }}
            className={`
                absolute cursor-pointer pointer-events-auto z-[5000]
                ${sun.isCollected ? 'opacity-0 scale-150 transition-all duration-500' : 'hover:scale-110 active:scale-95'}
            `}
            style={{
                left: `${(sun.position.x || 0.5) * 100}%`,
                top: `${sun.position.y}%`, 
                transform: 'translate(-50%, -50%)',
                transitionProperty: 'top, left, transform, opacity, scale', 
                transitionDuration: '0.2s, 0.2s, 0.1s, 0.5s, 0.1s',
                transitionTimingFunction: 'linear, linear, ease-out, ease-out, ease-out'
            }}
          >
              <div className="relative group animate-spin-slow">
                  <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-60 animate-pulse"></div>
                  <span className="text-5xl relative z-10 filter drop-shadow-lg select-none">☀️</span>
              </div>
          </div>
      ))}

    </div>
  );
};
