

import React, { useState } from 'react';
import { PlantConfig, ZombieStatConfig, EntityVisuals, AnimationState, AttackDirection } from '../types';
import { PLANT_STATS, ZOMBIE_STATS, INITIAL_PLANT_STATS, INITIAL_ZOMBIE_STATS } from '../constants';
import { PixelEditor } from './PixelEditor';

interface BaseEditorProps {
  onBack: () => void;
}

type Tab = 'PLANTS' | 'ZOMBIES';

export const BaseEditor: React.FC<BaseEditorProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('PLANTS');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPixelEditor, setShowPixelEditor] = useState(false);
  
  // Local edit state
  const [editPlant, setEditPlant] = useState<PlantConfig | null>(null);
  const [editZombie, setEditZombie] = useState<ZombieStatConfig | null>(null);

  // Lists - Filtered to only include BASE content (found in INITIAL_STATS)
  // This excludes any DLC loaded content.
  const basePlantKeys = Object.keys(INITIAL_PLANT_STATS);
  const baseZombieKeys = Object.keys(INITIAL_ZOMBIE_STATS);

  const handleSelectPlant = (key: string) => {
      setSelectedId(key);
      // Deep copy to local state to allow editing
      setEditPlant(JSON.parse(JSON.stringify(PLANT_STATS[key])));
      setEditZombie(null);
  };

  const handleSelectZombie = (key: string) => {
      setSelectedId(key);
      setEditZombie(JSON.parse(JSON.stringify(ZOMBIE_STATS[key])));
      setEditPlant(null);
  };

  const handleSave = () => {
      if (activeTab === 'PLANTS' && editPlant && selectedId) {
          // Mutate the global constant
          Object.assign(PLANT_STATS[selectedId], editPlant);
          alert(`Saved changes to ${editPlant.name}!`);
      } else if (activeTab === 'ZOMBIES' && editZombie && selectedId) {
          Object.assign(ZOMBIE_STATS[selectedId], editZombie);
          alert(`Saved changes to ${selectedId}!`);
      }
  };

  const handleReset = () => {
      if (!selectedId) return;
      if (confirm("Are you sure you want to reset this unit to default stats and visuals?")) {
          if (activeTab === 'PLANTS') {
              const def = INITIAL_PLANT_STATS[selectedId];
              if (def) {
                   const clone = JSON.parse(JSON.stringify(def));
                   Object.assign(PLANT_STATS[selectedId], clone);
                   setEditPlant(clone);
              }
          } else {
              const def = INITIAL_ZOMBIE_STATS[selectedId];
              if (def) {
                   const clone = JSON.parse(JSON.stringify(def));
                   Object.assign(ZOMBIE_STATS[selectedId], clone);
                   setEditZombie(clone);
              }
          }
      }
  };

  const handleVisualsSave = (visuals: EntityVisuals) => {
      if (activeTab === 'PLANTS' && editPlant) {
          setEditPlant({ ...editPlant, visuals });
      } else if (activeTab === 'ZOMBIES' && editZombie) {
          setEditZombie({ ...editZombie, visuals });
      }
      setShowPixelEditor(false);
  };

  const toggleDirection = (dir: AttackDirection) => {
      if (!editPlant) return;
      const current = editPlant.attackDirections || [];
      const exists = current.includes(dir);
      let next = exists ? current.filter(d => d !== dir) : [...current, dir];
      setEditPlant({ ...editPlant, attackDirections: next });
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
       
       {showPixelEditor && (
           <PixelEditor 
               onClose={() => setShowPixelEditor(false)}
               onSave={handleVisualsSave}
               entityName={activeTab === 'PLANTS' ? editPlant?.name || 'Plant' : selectedId || 'Zombie'}
               initialVisuals={activeTab === 'PLANTS' ? editPlant?.visuals : editZombie?.visuals}
           />
       )}

       <div className="w-[95%] max-w-[1100px] h-[90%] bg-slate-800 rounded-xl border-4 border-slate-600 p-6 shadow-2xl flex flex-col">
          
          <div className="flex justify-between items-center mb-6 border-b border-slate-600 pb-4">
             <div className="flex items-center gap-4">
                 <h2 className="text-3xl text-amber-500 font-pixel drop-shadow-md">BASE EDITOR</h2>
                 <span className="text-slate-500 text-xs font-mono bg-black/30 px-2 py-1 rounded">CORE GAME CONTENT ONLY</span>
             </div>
             <button onClick={onBack} className="text-slate-400 hover:text-white font-bold text-xl px-4">✕</button>
          </div>

          <div className="flex flex-1 overflow-hidden gap-6">
             
             {/* LEFT SIDEBAR: LIST */}
             <div className="w-64 bg-slate-900/50 rounded border border-slate-700 flex flex-col">
                 <div className="flex">
                     <button onClick={() => { setActiveTab('PLANTS'); setSelectedId(null); }} className={`flex-1 py-3 font-pixel text-xs ${activeTab === 'PLANTS' ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>PLANTS</button>
                     <button onClick={() => { setActiveTab('ZOMBIES'); setSelectedId(null); }} className={`flex-1 py-3 font-pixel text-xs ${activeTab === 'ZOMBIES' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>ZOMBIES</button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-2 space-y-1">
                     {activeTab === 'PLANTS' ? (
                         basePlantKeys.map(key => {
                             const p = PLANT_STATS[key];
                             const isActive = selectedId === key;
                             return (
                                 <button key={key} onClick={() => handleSelectPlant(key)} className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${isActive ? 'bg-green-900/40 border border-green-500' : 'hover:bg-slate-800 border border-transparent'}`}>
                                     <span className="text-xl w-8 text-center">{p.icon}</span>
                                     <span className={`text-xs font-bold truncate ${isActive ? 'text-green-300' : 'text-slate-400'}`}>{p.name}</span>
                                 </button>
                             );
                         })
                     ) : (
                         baseZombieKeys.map(key => {
                             const z = ZOMBIE_STATS[key];
                             const isActive = selectedId === key;
                             return (
                                 <button key={key} onClick={() => handleSelectZombie(key)} className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${isActive ? 'bg-red-900/40 border border-red-500' : 'hover:bg-slate-800 border border-transparent'}`}>
                                     <span className="text-xl w-8 text-center">{z.icon}</span>
                                     <span className={`text-xs font-bold truncate ${isActive ? 'text-red-300' : 'text-slate-400'}`}>{key}</span>
                                 </button>
                             );
                         })
                     )}
                 </div>
             </div>

             {/* MAIN EDITOR */}
             <div className="flex-1 bg-slate-900/30 rounded border border-slate-700 p-6 overflow-y-auto">
                 {!selectedId ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-500 font-pixel">
                         <div className="text-6xl mb-4 opacity-20">⚙️</div>
                         <div>SELECT AN ENTITY TO EDIT</div>
                     </div>
                 ) : (
                     <div className="h-full flex flex-col">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl text-white font-bold font-pixel mb-1">
                                    {activeTab === 'PLANTS' ? editPlant?.name : selectedId}
                                </h3>
                                <div className="text-xs font-mono text-slate-400 bg-black/40 px-2 py-1 rounded inline-block">ID: {selectedId}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="w-16 h-16 bg-slate-800 rounded border border-slate-600 flex items-center justify-center relative overflow-hidden">
                                     {/* Preview */}
                                     {(() => {
                                         const visual = activeTab === 'PLANTS' ? editPlant?.visuals : editZombie?.visuals;
                                         const idleAnim = visual?.['idle'] as AnimationState | undefined;
                                         const firstFrame = idleAnim?.frames?.[0];
                                         return firstFrame ? (
                                             <img 
                                                src={firstFrame} 
                                                className="w-full h-full object-contain image-pixelated"
                                                style={{imageRendering: 'pixelated'}}
                                             />
                                         ) : (
                                             <span className="text-4xl">{activeTab === 'PLANTS' ? editPlant?.icon : editZombie?.icon}</span>
                                         );
                                     })()}
                                </div>
                                <button onClick={() => setShowPixelEditor(true)} className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded font-bold shadow">
                                    EDIT SPRITE
                                </button>
                            </div>
                         </div>

                         {/* FORM */}
                         <div className="flex-1 space-y-6">
                             {activeTab === 'PLANTS' && editPlant && (
                                 <div className="grid grid-cols-2 gap-6">
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">DISPLAY NAME</label>
                                         <input type="text" value={editPlant.name} onChange={e => setEditPlant({...editPlant, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">ICON (EMOJI)</label>
                                         <input type="text" value={editPlant.icon} onChange={e => setEditPlant({...editPlant, icon: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-center" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">SUN COST</label>
                                         <input type="number" value={editPlant.cost} onChange={e => setEditPlant({...editPlant, cost: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">HEALTH (HP)</label>
                                         <input type="number" value={editPlant.health} onChange={e => setEditPlant({...editPlant, health: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">COOLDOWN (ms)</label>
                                         <input type="number" value={editPlant.cooldown} onChange={e => setEditPlant({...editPlant, cooldown: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">VISUAL SCALE (Default 1.0)</label>
                                         <input type="number" step="0.1" value={editPlant.visualScale || 1.0} onChange={e => setEditPlant({...editPlant, visualScale: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div className="col-span-2">
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">DESCRIPTION</label>
                                         <textarea value={editPlant.description} onChange={e => setEditPlant({...editPlant, description: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white h-20 resize-none" />
                                     </div>
                                     <div className="col-span-2 bg-slate-800 p-4 rounded border border-slate-700">
                                         <label className="block text-yellow-400 text-xs font-pixel mb-2">ATTACK DIRECTIONS (Multi-Shot)</label>
                                         <div className="grid grid-cols-3 gap-2 w-32 mx-auto">
                                             {['UP_LEFT', 'UP', 'UP_RIGHT', 'LEFT', 'CENTER', 'RIGHT', 'DOWN_LEFT', 'DOWN', 'DOWN_RIGHT'].map((dir, i) => {
                                                 if (dir === 'CENTER') return <div key={i} className="w-8 h-8 flex items-center justify-center text-slate-600">🌱</div>;
                                                 const isActive = (editPlant.attackDirections || []).includes(dir as AttackDirection);
                                                 const arrows: Record<string, string> = { UP: '⬆️', DOWN: '⬇️', LEFT: '⬅️', RIGHT: '➡️', UP_LEFT: '↖️', UP_RIGHT: '↗️', DOWN_LEFT: '↙️', DOWN_RIGHT: '↘️' };
                                                 return (
                                                     <button 
                                                        key={dir} 
                                                        onClick={() => toggleDirection(dir as AttackDirection)}
                                                        className={`w-8 h-8 border rounded flex items-center justify-center transition-colors ${isActive ? 'bg-green-600 border-green-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
                                                     >
                                                         {arrows[dir]}
                                                     </button>
                                                 )
                                             })}
                                         </div>
                                         <div className="text-center mt-2 text-[10px] text-slate-500">Toggle directions to enable multi-shot</div>
                                     </div>
                                 </div>
                             )}

                             {activeTab === 'ZOMBIES' && editZombie && (
                                 <div className="grid grid-cols-2 gap-6">
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">ICON (EMOJI)</label>
                                         <input type="text" value={editZombie.icon} onChange={e => setEditZombie({...editZombie, icon: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-center" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">SPEED (0.02 - 0.2)</label>
                                         <input type="number" step="0.01" value={editZombie.speed} onChange={e => setEditZombie({...editZombie, speed: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">HEALTH (HP)</label>
                                         <input type="number" value={editZombie.health} onChange={e => setEditZombie({...editZombie, health: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">DAMAGE (DPS)</label>
                                         <input type="number" value={editZombie.damage} onChange={e => setEditZombie({...editZombie, damage: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">VISUAL SCALE (1.0 - 5.0)</label>
                                         <input type="number" step="0.1" value={editZombie.visualScale || 1.0} onChange={e => setEditZombie({...editZombie, visualScale: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* ACTION BUTTONS */}
                         <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between">
                             <button onClick={handleReset} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-red-300 text-xs font-bold rounded border border-slate-600">
                                 RESET TO DEFAULT
                             </button>
                             <button onClick={handleSave} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-pixel rounded shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
                                 APPLY CHANGES
                             </button>
                         </div>
                     </div>
                 )}
             </div>

          </div>
       </div>
    </div>
  );
};
