
import React, { useState } from 'react';
import { PlantConfig, ZombieStatConfig, EntityVisuals, AnimationState, AttackDirection, PlantAbilityType, ProjectileType } from '../types';
import { PLANT_STATS, ZOMBIE_STATS, INITIAL_PLANT_STATS, INITIAL_ZOMBIE_STATS, DIRECTION_VECTORS } from '../constants';
import { PixelEditor } from './PixelEditor';
import { t, Lang, tEntity, getLocalizedName, TRANSLATIONS } from '../i18n';

interface BaseEditorProps {
  onBack: () => void;
  language: Lang;
}

type Tab = 'PLANTS' | 'ZOMBIES';

export const BaseEditor: React.FC<BaseEditorProps> = ({ onBack, language }) => {
  const [activeTab, setActiveTab] = useState<Tab>('PLANTS');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPixelEditor, setShowPixelEditor] = useState(false);
  
  // Local edit state
  const [editPlant, setEditPlant] = useState<PlantConfig | null>(null);
  const [editZombie, setEditZombie] = useState<ZombieStatConfig | null>(null);
  const [editingAbilityIndex, setEditingAbilityIndex] = useState<number | null>(null);
  const [editingBullet, setEditingBullet] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  // Lists - Filtered to only include BASE content (found in INITIAL_STATS)
  // This excludes any DLC loaded content.
  const basePlantKeys = Object.keys(INITIAL_PLANT_STATS);
  const baseZombieKeys = Object.keys(INITIAL_ZOMBIE_STATS);

  const handleSelectPlant = (key: string) => {
      setSelectedId(key);
      // Deep copy to local state to allow editing
      setEditPlant(JSON.parse(JSON.stringify(PLANT_STATS[key])));
      setEditZombie(null);
      setShowTranslations(false);
  };

  const handleSelectZombie = (key: string) => {
      setSelectedId(key);
      setEditZombie(JSON.parse(JSON.stringify(ZOMBIE_STATS[key])));
      setEditPlant(null);
      setShowTranslations(false);
  };

  const handleSave = () => {
      if (activeTab === 'PLANTS' && editPlant && selectedId) {
          // Mutate the global constant
          Object.assign(PLANT_STATS[selectedId], editPlant);
          alert(`${t('SAVED_CHANGES', language)} ${getLocalizedName(editPlant, language)}!`);
      } else if (activeTab === 'ZOMBIES' && editZombie && selectedId) {
          Object.assign(ZOMBIE_STATS[selectedId], editZombie);
          alert(`${t('SAVED_CHANGES', language)} ${selectedId}!`);
      }
  };

  const handleReset = () => {
      if (!selectedId) return;
      if (confirm(t('CONFIRM_RESET', language))) {
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
      if (editingBullet && activeTab === 'PLANTS' && editPlant && editingAbilityIndex !== null) {
          const n = [...(editPlant.abilities || [])];
          n[editingAbilityIndex] = { ...n[editingAbilityIndex], projectileVisuals: visuals };
          setEditPlant({ ...editPlant, abilities: n });
      } else if (activeTab === 'PLANTS' && editPlant) {
          setEditPlant({ ...editPlant, visuals });
      } else if (activeTab === 'ZOMBIES' && editZombie) {
          setEditZombie({ ...editZombie, visuals });
      }
      setShowPixelEditor(false);
      setEditingBullet(false);
      setEditingAbilityIndex(null);
  };

  const handleAddAbility = (type: PlantAbilityType) => {
      if (!editPlant) return;
      // Check if ability already exists
      if (editPlant.abilities?.some(a => a.type === type)) return;

      const ability = { type, cooldown: 0 };
      setEditPlant(prev => ({
          ...prev!,
          abilities: [...(prev!.abilities || []), ability]
      }));
  };

  const handleRemoveAbility = (index: number) => {
      if (!editPlant) return;
      setEditPlant(prev => ({
          ...prev!,
          abilities: prev!.abilities?.filter((_, i) => i !== index)
      }));
  };

  // Helper to get initial visuals with fallback to parent logic
  const getInitialVisualsForEditor = () => {
      if (editingBullet) {
          if (editingAbilityIndex !== null && editPlant?.abilities?.[editingAbilityIndex]?.projectileVisuals) {
              return editPlant.abilities[editingAbilityIndex].projectileVisuals;
          }
          // Do NOT fallback to Plant visuals. Projectiles should be distinct.
          return undefined;
      }
      // Standard Editing
      return activeTab === 'PLANTS' ? editPlant?.visuals : editZombie?.visuals;
  };

  const updateTranslation = (langKey: string, field: 'name' | 'description', value: string) => {
      const target = activeTab === 'PLANTS' ? editPlant : editZombie;
      if (!target) return;
      
      const newTranslations = { ...(target.translations || {}) };
      if (!newTranslations[langKey]) newTranslations[langKey] = {};
      newTranslations[langKey] = { ...newTranslations[langKey], [field]: value };
      
      if (activeTab === 'PLANTS') setEditPlant({ ...editPlant!, translations: newTranslations });
      else setEditZombie({ ...editZombie!, translations: newTranslations });
  };

  const getStaticTranslation = (id: string, lang: Lang) => {
      // @ts-ignore
      let val = TRANSLATIONS[lang]?.[id];
      if (!val && !id.startsWith('ZOMBIE_')) {
          // @ts-ignore
          val = TRANSLATIONS[lang]?.[`ZOMBIE_${id}`];
      }
      return val || '';
  };

  const handleToggleTranslations = () => {
      if (!showTranslations && selectedId) {
          // About to show: Populate defaults if missing
          const target = activeTab === 'PLANTS' ? editPlant : editZombie;
          if (target) {
              const currentTrans = target.translations || {};
              const newTrans = JSON.parse(JSON.stringify(currentTrans)); // Deep clone simple object

              // Ensure structure
              if (!newTrans.en) newTrans.en = {};
              if (!newTrans.zh) newTrans.zh = {};

              // Populate EN Name
              if (!newTrans.en.name) {
                  const staticEn = getStaticTranslation(selectedId, 'en');
                  // For plants, fallback to current edited name if static not found
                  // For zombies, static is the only source besides ID itself
                  newTrans.en.name = staticEn || (activeTab === 'PLANTS' ? (target as any).name : selectedId);
              }

              // Populate ZH Name
              if (!newTrans.zh.name) {
                  const staticZh = getStaticTranslation(selectedId, 'zh');
                  if (staticZh) newTrans.zh.name = staticZh;
              }

              // Apply back to state
              if (activeTab === 'PLANTS') setEditPlant({ ...editPlant!, translations: newTrans });
              else setEditZombie({ ...editZombie!, translations: newTrans });
          }
      }
      setShowTranslations(!showTranslations);
  };

  const getProjectileIcon = (type: ProjectileType) => {
      switch(type) {
          case 'FROZEN': return '🔵';
          case 'FIRE': return '🔥';
          case 'MELON': return '🍉';
          case 'KERNEL': return '🌽';
          case 'BUTTER': return '🧈';
          case 'COB': return '🌽';
          case 'STAR': return '⭐';
          case 'NORMAL':
          default: return '🟢';
      }
  };

  return (
    <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col items-center justify-center p-4">
       
       {showPixelEditor && (
           <PixelEditor 
               onClose={() => setShowPixelEditor(false)}
               onSave={handleVisualsSave}
               entityName={editingBullet ? 'Bullet' : (activeTab === 'PLANTS' ? editPlant?.name || 'Plant' : selectedId || 'Zombie')}
               initialVisuals={getInitialVisualsForEditor()}
               hideActionMenu={editingBullet || activeTab === 'PLANTS'}
               language={language}
           />
       )}

       <div className="w-[95%] max-w-[1100px] h-[90%] bg-slate-800 rounded-xl border-4 border-slate-600 p-6 shadow-2xl flex flex-col">
          
          <div className="flex justify-between items-center mb-6 border-b border-slate-600 pb-4">
             <div className="flex items-center gap-4">
                 <h2 className="text-3xl text-amber-500 font-pixel drop-shadow-md">{t('BASE_EDITOR_TITLE', language)}</h2>
                 <span className="text-slate-500 text-xs font-mono bg-black/30 px-2 py-1 rounded">{t('CORE_CONTENT', language)}</span>
             </div>
             <button onClick={onBack} className="text-slate-400 hover:text-white font-bold text-xl px-4">✕</button>
          </div>

          <div className="flex flex-1 overflow-hidden gap-6">
             
             {/* LEFT SIDEBAR: LIST */}
             <div className="w-64 bg-slate-900/50 rounded border border-slate-700 flex flex-col">
                 <div className="flex">
                     <button onClick={() => { setActiveTab('PLANTS'); setSelectedId(null); }} className={`flex-1 py-3 font-pixel text-xs ${activeTab === 'PLANTS' ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{t('PLANTS', language)}</button>
                     <button onClick={() => { setActiveTab('ZOMBIES'); setSelectedId(null); }} className={`flex-1 py-3 font-pixel text-xs ${activeTab === 'ZOMBIES' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{t('ZOMBIES', language)}</button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-2 space-y-1">
                     {activeTab === 'PLANTS' ? (
                         basePlantKeys.map(key => {
                             const p = PLANT_STATS[key];
                             const isActive = selectedId === key;
                             // Use getLocalizedName to show translated names in sidebar if available
                             // Since we are iterating KEYS of the global object, we can pass the object itself
                             // However, getLocalizedName expects a config object.
                             const displayName = getLocalizedName({...p, type: key}, language);
                             return (
                                 <button key={key} onClick={() => handleSelectPlant(key)} className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${isActive ? 'bg-green-900/40 border border-green-500' : 'hover:bg-slate-800 border border-transparent'}`}>
                                     <span className="text-xl w-8 text-center">{p.icon}</span>
                                     <span className={`text-xs font-bold truncate ${isActive ? 'text-green-300' : 'text-slate-400'}`}>{displayName}</span>
                                 </button>
                             );
                         })
                     ) : (
                         baseZombieKeys.map(key => {
                             const z = ZOMBIE_STATS[key];
                             const isActive = selectedId === key;
                             // Zombies in BaseEditor don't have 'name' property usually, just ID. 
                             // But tEntity handles ID lookup.
                             const displayName = tEntity(key, key, language);
                             return (
                                 <button key={key} onClick={() => handleSelectZombie(key)} className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${isActive ? 'bg-red-900/40 border border-red-500' : 'hover:bg-slate-800 border border-transparent'}`}>
                                     <span className="text-xl w-8 text-center">{z.icon}</span>
                                     <span className={`text-xs font-bold truncate ${isActive ? 'text-red-300' : 'text-slate-400'}`}>{displayName}</span>
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
                         <div>{t('SELECT_ENTITY', language)}</div>
                     </div>
                 ) : (
                     <div className="h-full flex flex-col">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl text-white font-bold font-pixel mb-1">
                                    {activeTab === 'PLANTS' && editPlant ? getLocalizedName(editPlant, language) : tEntity(selectedId, selectedId, language)}
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
                                <button onClick={() => { setEditingBullet(false); setShowPixelEditor(true); }} className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded font-bold shadow">
                                    {t('EDIT_SPRITE', language)}
                                </button>
                            </div>
                         </div>

                         {/* FORM */}
                         <div className="flex-1 space-y-6">
                             {activeTab === 'PLANTS' && editPlant && (
                                 <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        
                                        {/* NAME FIELD WITH TRANSLATION SUPPORT */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-slate-400 text-xs font-pixel">{t('NAME', language)}</label>
                                                <button onClick={handleToggleTranslations} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                                    <span>🌐</span> {t('TRANSLATIONS', language)}
                                                </button>
                                            </div>
                                            <input type="text" value={editPlant.name} onChange={e => setEditPlant({...editPlant, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                            
                                            {showTranslations && (
                                                <div className="mt-2 bg-slate-900/80 p-3 rounded border border-slate-700 space-y-2">
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Localizations</div>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-xs text-slate-400 w-6">EN</span>
                                                        <input 
                                                            type="text" 
                                                            placeholder="English Name" 
                                                            value={editPlant.translations?.en?.name || ''} 
                                                            onChange={e => updateTranslation('en', 'name', e.target.value)} 
                                                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" 
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-xs text-slate-400 w-6">ZH</span>
                                                        <input 
                                                            type="text" 
                                                            placeholder="中文名称" 
                                                            value={editPlant.translations?.zh?.name || ''} 
                                                            onChange={e => updateTranslation('zh', 'name', e.target.value)} 
                                                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" 
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-slate-400 text-xs font-pixel mb-1">{t('ICON', language)} ({t('EMOJI', language)})</label>
                                            <input type="text" value={editPlant.icon} onChange={e => setEditPlant({...editPlant, icon: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-center" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs font-pixel mb-1">{t('COST', language)}</label>
                                            <input type="number" value={editPlant.cost} onChange={e => setEditPlant({...editPlant, cost: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs font-pixel mb-1">{t('HEALTH', language)}</label>
                                            <input type="number" value={editPlant.health} onChange={e => setEditPlant({...editPlant, health: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs font-pixel mb-1">{t('COOLDOWN', language)} (ms)</label>
                                            <input type="number" value={editPlant.cooldown} onChange={e => setEditPlant({...editPlant, cooldown: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs font-pixel mb-1">{t('SCALE', language)} (Default 1.0)</label>
                                            <input type="number" step="0.1" value={editPlant.visualScale || 1.0} onChange={e => setEditPlant({...editPlant, visualScale: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                        </div>
                                    </div>
                                    
                                    {/* SPECIAL ABILITIES EDITOR */}
                                    <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                                         <div className="flex justify-between items-center mb-4">
                                             <h4 className="text-yellow-400 text-xs font-pixel">{t('SPECIAL_ABILITIES', language)}</h4>
                                             <div className="flex gap-1 flex-wrap">
                                                 {['PRODUCE_SUN', 'SHOOT', 'EXPLODE', 'SQUASH', 'FREEZE_ALL', 'WALL', 'BLOCK_VAULT', 'BURN_ROW'].map(type => {
                                                     const exists = editPlant.abilities?.some(a => a.type === type);
                                                     return (
                                                         <button 
                                                            key={type} 
                                                            onClick={() => handleAddAbility(type as PlantAbilityType)} 
                                                            disabled={exists}
                                                            className={`px-2 py-1 rounded border border-slate-600 text-[9px] ${exists ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                                                         >
                                                             + {type}
                                                         </button>
                                                     );
                                                 })}
                                             </div>
                                         </div>
                                         
                                         <div className="space-y-3">
                                             {editPlant.abilities?.map((ability, idx) => (
                                                 <div key={idx} className="bg-slate-900 p-4 rounded border border-slate-600">
                                                     <div className="flex justify-between items-center mb-4">
                                                         <span className="text-green-400 font-bold text-sm">{ability.type}</span>
                                                         <button onClick={() => handleRemoveAbility(idx)} className="text-red-500 hover:text-red-300 text-xs">✕</button>
                                                     </div>
                                                     <div className="grid grid-cols-3 gap-4 text-xs text-slate-400">
                                                         {ability.type === 'PRODUCE_SUN' && (
                                                             <>
                                                                <div>
                                                                    <label className="block mb-1">{t('INTERVAL', language)}</label>
                                                                    <input type="number" value={ability.interval} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].interval = parseInt(e.target.value); setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                                                </div>
                                                                <div>
                                                                    <label className="block mb-1">{t('SUN_VALUE', language)}</label>
                                                                    <input type="number" value={ability.sunValue} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].sunValue = parseInt(e.target.value); setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                                                </div>
                                                             </>
                                                         )}
                                                         {ability.type === 'SHOOT' && (
                                                             <>
                                                                <div>
                                                                    <label className="block mb-1">{t('INTERVAL', language)}</label>
                                                                    <input type="number" value={ability.interval} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].interval = parseInt(e.target.value); setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                                                </div>
                                                                <div>
                                                                    <label className="block mb-1">{t('DAMAGE', language)}</label>
                                                                    <input type="number" value={ability.damage} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].damage = parseInt(e.target.value); setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                                                </div>
                                                                <div>
                                                                    <label className="block mb-1">{t('RANGE', language)}</label>
                                                                    <input type="number" value={ability.range} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].range = parseInt(e.target.value); setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <label className="block mb-1">{t('PROJECTILE', language)}</label> 
                                                                    <select value={ability.projectileType || 'NORMAL'} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].projectileType = e.target.value as ProjectileType; setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white">
                                                                        {Object.values(ProjectileType).map(t => <option key={t} value={t}>{t}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="col-span-3">
                                                                     <label className="block mb-1">{t('DIRECTION', language)}</label>
                                                                     <select value={ability.projectileDirection || 'RIGHT'} onChange={e => { const n=[...(editPlant.abilities||[])]; n[idx].projectileDirection=e.target.value as AttackDirection; setEditPlant({...editPlant, abilities:n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white">
                                                                         {Object.keys(DIRECTION_VECTORS).map(d => <option key={d} value={d}>{d}</option>)}
                                                                     </select>
                                                                </div>
                                                                <div className="col-span-3 flex items-center gap-2 mt-2">
                                                                     <input type="checkbox" checked={!!ability.projectileHoming} onChange={e => { const n=[...(editPlant.abilities||[])]; n[idx].projectileHoming=e.target.checked; setEditPlant({...editPlant, abilities:n}); }} className="w-5 h-5 bg-slate-800 border border-slate-600 rounded" />
                                                                     <span className="text-sm">{t('HOMING', language)}</span>
                                                                </div>
                                                                
                                                                <div className="col-span-3 flex items-end gap-2 mt-2">
                                                                     {/* Projectile Preview */}
                                                                     <div className="w-10 h-10 bg-slate-950 border border-slate-700 rounded flex items-center justify-center overflow-hidden shrink-0 relative">
                                                                         {ability.projectileVisuals?.['idle']?.frames?.[0] ? (
                                                                             <img 
                                                                                src={ability.projectileVisuals['idle'].frames[0]} 
                                                                                className="w-full h-full object-contain image-pixelated" 
                                                                             />
                                                                         ) : (
                                                                             <span className="text-xl">{getProjectileIcon(ability.projectileType || 'NORMAL' as ProjectileType)}</span>
                                                                         )}
                                                                     </div>

                                                                     <button 
                                                                        onClick={() => { setEditingBullet(true); setEditingAbilityIndex(idx); setShowPixelEditor(true); }}
                                                                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs border-b-2 border-purple-800 active:border-b-0 active:translate-y-[2px]"
                                                                     >
                                                                         {ability.projectileVisuals ? t('EDIT_PROJECTILE_SPRITE', language) : t('CREATE_PROJECTILE_SPRITE', language)}
                                                                     </button>
                                                                </div>
                                                             </>
                                                         )}
                                                         {(ability.type === 'EXPLODE' || ability.type === 'SQUASH' || ability.type === 'BURN_ROW') && (
                                                             <>
                                                                 <div>
                                                                     <label className="block mb-1">{t('TRIGGER_RANGE', language)}</label>
                                                                     <input type="number" step="0.1" value={ability.triggerRange} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].triggerRange = parseFloat(e.target.value); setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                                                 </div>
                                                                 <div>
                                                                     <label className="block mb-1">{t('DAMAGE', language)}</label>
                                                                     <input type="number" value={ability.damage} onChange={e => { const n = [...(editPlant.abilities||[])]; n[idx].damage = parseInt(e.target.value); setEditPlant({...editPlant, abilities: n}); }} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                                                 </div>
                                                             </>
                                                         )}
                                                     </div>
                                                 </div>
                                             ))}
                                             {!editPlant.abilities?.length && <div className="text-slate-600 text-xs italic p-2 text-center">{t('NO_ABILITIES', language)}</div>}
                                         </div>
                                    </div>

                                 </div>
                             )}

                             {activeTab === 'ZOMBIES' && editZombie && (
                                 <div className="grid grid-cols-2 gap-6">
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">{t('ICON', language)} ({t('EMOJI', language)})</label>
                                         <input type="text" value={editZombie.icon} onChange={e => setEditZombie({...editZombie, icon: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-center" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">{t('SPEED', language)} (0.02 - 0.2)</label>
                                         <input type="number" step="0.01" value={editZombie.speed} onChange={e => setEditZombie({...editZombie, speed: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">{t('HEALTH', language)} (HP)</label>
                                         <input type="number" value={editZombie.health} onChange={e => setEditZombie({...editZombie, health: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">{t('DAMAGE', language)} (DPS)</label>
                                         <input type="number" value={editZombie.damage} onChange={e => setEditZombie({...editZombie, damage: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                     <div>
                                         <label className="block text-slate-400 text-xs font-pixel mb-1">{t('SCALE', language)} (1.0 - 5.0)</label>
                                         <input type="number" step="0.1" value={editZombie.visualScale || 1.0} onChange={e => setEditZombie({...editZombie, visualScale: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* ACTION BUTTONS */}
                         <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between">
                             <button onClick={handleReset} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-red-300 text-xs font-bold rounded border border-slate-600">
                                 {t('RESET_TO_DEFAULT', language)}
                             </button>
                             <button onClick={handleSave} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-pixel rounded shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
                                 {t('APPLY_CHANGES', language)}
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
