import React, { useState } from 'react';
import { LevelConfig, ZombieType, BaseZombieType, PlantConfig, ZombieStatConfig, DLCManifest, LevelScene, WaveDefinition, ScriptedEvent, EntityVisuals, BasePlantType, AnimationState, AttackDirection } from '../types';
import { ZOMBIE_STATS, PLANT_STATS } from '../constants';
import { PixelEditor } from './PixelEditor';
import { AVAILABLE_DLCS } from '../dlc';

interface LevelEditorProps {
  onPlay: (level: LevelConfig, tempDLC: DLCManifest) => void;
  onBack: () => void;
}

// Main Tabs
type MainTab = 'DLC_INFO' | 'LEVELS' | 'PLANTS' | 'ZOMBIES' | 'EXPORT';
// Sub Tabs for Level Editor
type LevelSubTab = 'SETTINGS' | 'WAVES' | 'EVENTS';

export const LevelEditor: React.FC<LevelEditorProps> = ({ onPlay, onBack }) => {
  const [activeTab, setActiveTab] = useState<MainTab>('LEVELS');
  const [levelSubTab, setLevelSubTab] = useState<LevelSubTab>('SETTINGS');
  
  // --- Pixel Editor State ---
  const [showPixelEditor, setShowPixelEditor] = useState(false);
  const [editingTarget, setEditingTarget] = useState<'PLANT' | 'ZOMBIE' | null>(null);

  // --- DLC Global State ---
  const [dlcData, setDlcData] = useState<DLCManifest>({
      id: 'my_custom_dlc',
      name: 'My Custom DLC',
      version: '1.0.0',
      plants: [],
      zombies: {},
      levels: []
  });

  // --- Level Editor State ---
  const [levelConfig, setLevelConfig] = useState<LevelConfig>({
    id: 1001,
    name: "New Custom Level",
    mode: 'SCRIPTED',
    scene: LevelScene.LAWN_DAY,
    totalWaves: 5,
    startingSun: 150,
    enabledZombies: [BaseZombieType.NORMAL],
    spawnIntervalMultiplier: 1.0,
    waves: [],
    events: [],
    seedSlots: 6,
    difficulty: 1
  });

  // --- Plant Creator State ---
  const [newPlant, setNewPlant] = useState<PlantConfig>({
      type: 'NEW_PLANT',
      name: 'New Plant',
      cost: 100,
      cooldown: 5000,
      health: 300,
      icon: '❓',
      description: 'A custom plant.',
      visuals: undefined,
      visualScale: 1.0
  });

  // --- Zombie Creator State ---
  const [newZombie, setNewZombie] = useState<{id: string, stats: ZombieStatConfig}>({
      id: 'NEW_ZOMBIE',
      stats: { health: 500, speed: 0.05, damage: 1, icon: '👾', visuals: undefined, visualScale: 1.0 }
  });

  // --- Wave Editor State ---
  const [currentWave, setCurrentWave] = useState<WaveDefinition>({
      waveNumber: 1,
      zombies: [],
      startDelay: 5000,
      isFlagWave: false
  });

  // --- Event Editor State ---
  const [newEvent, setNewEvent] = useState<ScriptedEvent>({
      time: 2000,
      type: 'TEXT',
      content: "THE ZOMBIES ARE COMING!",
      style: 'WARNING',
      duration: 3000
  });

  // --- Helpers ---
  const handleAddPlant = () => {
      if (!newPlant.type) return;
      const plantType = newPlant.type.toUpperCase();
      setDlcData(prev => ({ ...prev, plants: [...(prev.plants || []), { ...newPlant, type: plantType }] }));
      alert(`Added Plant: ${newPlant.name}`);
      // Reset visuals for next
      setNewPlant(p => ({ ...p, visuals: undefined }));
  };

  const handleAddZombie = () => {
      if (!newZombie.id) return;
      const id = newZombie.id.toUpperCase();
      setDlcData(prev => ({ ...prev, zombies: { ...prev.zombies, [id]: newZombie.stats } }));
      alert(`Added Zombie: ${id}`);
      // Reset visuals
      setNewZombie(z => ({ ...z, stats: { ...z.stats, visuals: undefined, visualScale: 1.0 } }));
  };

  const toggleZombieInLevel = (type: string) => {
      const current = levelConfig.enabledZombies;
      const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
      if (next.length === 0) return; // Prevent empty list
      setLevelConfig({ ...levelConfig, enabledZombies: next });
  };

  const handleAddWave = () => {
      const nextWaveNum = (levelConfig.waves?.length || 0) + 1;
      setLevelConfig(prev => ({
          ...prev,
          waves: [...(prev.waves || []), { ...currentWave, waveNumber: nextWaveNum }]
      }));
      // Reset for next wave
      setCurrentWave({ waveNumber: nextWaveNum + 1, zombies: [], startDelay: 10000, isFlagWave: false });
  };

  const addZombieToWave = (type: string) => {
      // Check if zombie is already in the wave, if so increment count, else add
      const existingIndex = currentWave.zombies.findIndex(z => z.type === type);
      if (existingIndex > -1) {
          const newZombies = [...currentWave.zombies];
          newZombies[existingIndex].count += 1;
          setCurrentWave(prev => ({ ...prev, zombies: newZombies }));
      } else {
          setCurrentWave(prev => ({
              ...prev,
              zombies: [...prev.zombies, { type: type, count: 1 }]
          }));
      }
  };

  const handleAddEvent = () => {
      setLevelConfig(prev => ({
          ...prev,
          events: [...(prev.events || []), newEvent].sort((a,b) => a.time - b.time)
      }));
  };

  const handleSaveVisuals = (visuals: EntityVisuals) => {
      if (editingTarget === 'PLANT') {
          setNewPlant(prev => ({ ...prev, visuals }));
      } else if (editingTarget === 'ZOMBIE') {
          setNewZombie(prev => ({ ...prev, stats: { ...prev.stats, visuals }}));
      }
      setShowPixelEditor(false);
  };

  const loadBasePlant = (baseType: string) => {
      const base = PLANT_STATS[baseType];
      if (!base) return;
      setNewPlant({
          ...base,
          type: baseType, // Keep same ID to override, or user can change it
          visuals: base.visuals ? JSON.parse(JSON.stringify(base.visuals)) : undefined
      });
  };

  const loadDlcPlant = (value: string) => {
      if (!value) return;
      const [dlcId, plantType] = value.split(':');
      const dlc = AVAILABLE_DLCS.find(d => d.id === dlcId);
      const plant = dlc?.plants?.find(p => p.type === plantType);
      
      if (plant) {
          // Deep Clone to avoid reference
          const clone: PlantConfig = JSON.parse(JSON.stringify(plant));
          setNewPlant({
              ...clone,
              type: clone.type + '_COPY' // Suggest a new ID
          });
      }
  };

  const loadBaseZombie = (baseType: string) => {
      const base = ZOMBIE_STATS[baseType];
      if (!base) return;
      setNewZombie({
          id: baseType,
          stats: {
              ...base,
              visuals: base.visuals ? JSON.parse(JSON.stringify(base.visuals)) : undefined
          }
      });
  };

  const loadDlcZombie = (value: string) => {
      if (!value) return;
      const [dlcId, zombieId] = value.split(':');
      const dlc = AVAILABLE_DLCS.find(d => d.id === dlcId);
      const stats = dlc?.zombies?.[zombieId];
      
      if (stats) {
          // Deep Clone
          const clone: ZombieStatConfig = JSON.parse(JSON.stringify(stats));
          setNewZombie({
              id: zombieId + '_COPY',
              stats: clone
          });
      }
  };

  const generateExportCode = () => {
      const exportData = { ...dlcData, levels: [levelConfig, ...(dlcData.levels || [])] };
      const varName = dlcData.id.replace(/[^a-zA-Z0-9]/g, '') + 'DLC';
      return `import { DLCContent } from '../types';\n\nconst ${varName}: DLCContent = ${JSON.stringify(exportData, null, 2)};\n\nexport default ${varName};`;
  };

  const availableZombies = Array.from(new Set([...Object.keys(ZOMBIE_STATS), ...(dlcData.zombies ? Object.keys(dlcData.zombies) : [])]));

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
       
       {showPixelEditor && (
           <PixelEditor 
               onClose={() => setShowPixelEditor(false)}
               onSave={handleSaveVisuals}
               entityName={editingTarget === 'PLANT' ? newPlant.name : newZombie.id}
               initialVisuals={editingTarget === 'PLANT' ? newPlant.visuals : newZombie.stats.visuals}
           />
       )}

       <div className="w-[95%] max-w-[1200px] h-[90%] bg-slate-800 rounded-xl border-4 border-slate-600 p-6 shadow-2xl flex flex-col">
          
          {/* Top Navigation */}
          <div className="flex justify-between items-center mb-4 border-b border-slate-600 pb-2">
             <h2 className="text-2xl text-blue-400 font-pixel drop-shadow-md mr-8">DLC CREATOR</h2>
             <div className="flex gap-1 flex-1">
                 {(['DLC_INFO', 'LEVELS', 'PLANTS', 'ZOMBIES', 'EXPORT'] as MainTab[]).map(tab => (
                     <button key={tab} onClick={() => setActiveTab(tab)} 
                        className={`px-6 py-3 font-pixel text-xs rounded-t-lg transition-colors 
                        ${activeTab === tab ? 'bg-slate-600 text-white border-t-4 border-blue-500' : 'bg-slate-700 text-slate-400 hover:bg-slate-650'}`}>
                         {tab.replace('_', ' ')}
                     </button>
                 ))}
             </div>
             <button onClick={onBack} className="text-slate-400 hover:text-white font-bold text-xl px-4">✕</button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col relative">
             
             {/* === TAB: DLC INFO === */}
             {activeTab === 'DLC_INFO' && (
                 <div className="p-8 max-w-2xl mx-auto w-full bg-slate-900/50 rounded border border-slate-700">
                     <h3 className="text-blue-400 font-pixel mb-6">DLC METADATA</h3>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-slate-400 text-xs font-pixel mb-1">DLC ID (Unique Variable Name)</label>
                             <input type="text" value={dlcData.id} onChange={e => setDlcData({...dlcData, id: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono"/>
                         </div>
                         <div>
                             <label className="block text-slate-400 text-xs font-pixel mb-1">DISPLAY NAME</label>
                             <input type="text" value={dlcData.name} onChange={e => setDlcData({...dlcData, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"/>
                         </div>
                         <div>
                             <label className="block text-slate-400 text-xs font-pixel mb-1">VERSION</label>
                             <input type="text" value={dlcData.version} onChange={e => setDlcData({...dlcData, version: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"/>
                         </div>
                     </div>
                 </div>
             )}

             {/* === TAB: LEVELS (Nested) === */}
             {activeTab === 'LEVELS' && (
                 <div className="flex flex-col h-full">
                     {/* Sub-Tabs */}
                     <div className="flex gap-2 mb-4 border-b border-slate-700">
                         {(['SETTINGS', 'WAVES', 'EVENTS'] as LevelSubTab[]).map(subTab => (
                             <button key={subTab} onClick={() => setLevelSubTab(subTab)}
                                className={`px-4 py-2 text-xs font-bold transition-colors ${levelSubTab === subTab ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                 {subTab}
                             </button>
                         ))}
                         <div className="flex-1" />
                         <button onClick={() => onPlay(levelConfig, dlcData)} className="px-4 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-pixel rounded mb-1">TEST PLAY</button>
                     </div>

                     <div className="flex-1 overflow-hidden">
                         {/* SUB-TAB: SETTINGS */}
                         {levelSubTab === 'SETTINGS' && (
                             <div className="flex gap-6 h-full">
                                <div className="flex-1 bg-slate-900/50 p-6 rounded-lg border border-slate-700 overflow-y-auto">
                                    <div className="space-y-4">
                                        <input type="text" value={levelConfig.name} onChange={e => setLevelConfig({...levelConfig, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-bold text-lg" placeholder="Level Name"/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-400 text-xs font-pixel mb-1">SCENE</label>
                                                <select value={levelConfig.scene} onChange={e => setLevelConfig({...levelConfig, scene: e.target.value as LevelScene})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white">
                                                    {Object.values(LevelScene).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 text-xs font-pixel mb-1">START SUN</label>
                                                <input type="number" value={levelConfig.startingSun} onChange={e => setLevelConfig({...levelConfig, startingSun: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                             <div>
                                                <label className="block text-slate-400 text-xs font-pixel mb-1">SEED SLOTS (Max Plants)</label>
                                                <input type="number" value={levelConfig.seedSlots || 6} onChange={e => setLevelConfig({...levelConfig, seedSlots: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                             </div>
                                             <div>
                                                <label className="block text-slate-400 text-xs font-pixel mb-1">DIFFICULTY (Stars)</label>
                                                <input type="number" min="1" max="10" value={levelConfig.difficulty || 1} onChange={e => setLevelConfig({...levelConfig, difficulty: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                                             </div>
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs font-pixel mb-1">GAME MODE</label>
                                            <select value={levelConfig.mode} onChange={e => setLevelConfig({...levelConfig, mode: e.target.value as any})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white">
                                                <option value="CLASSIC">CLASSIC (Random Spawn)</option>
                                                <option value="SCRIPTED">SCRIPTED (Waves)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-slate-400 text-xs font-pixel">ALLOWED ZOMBIES (Cache)</label>
                                                <button 
                                                    onClick={() => setLevelConfig({...levelConfig, enabledZombies: availableZombies})}
                                                    className="text-[10px] bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-500 font-bold"
                                                >
                                                    SELECT ALL
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-2 bg-slate-950/50 rounded border border-slate-700">
                                                {availableZombies.map(type => {
                                                    const stats = ZOMBIE_STATS[type] || dlcData.zombies?.[type];
                                                    const idleAnim = stats?.visuals?.['idle'] as AnimationState | undefined;
                                                    const visualFrame = idleAnim?.frames?.[0];
                                                    const icon = visualFrame ? <img src={visualFrame} className="w-8 h-8 image-pixelated object-contain" /> : stats?.icon || '🧟';
                                                    return (
                                                        <button key={type} onClick={() => toggleZombieInLevel(type)}
                                                            className={`p-1 rounded border text-center flex flex-col items-center ${levelConfig.enabledZombies.includes(type) ? 'bg-green-900/40 border-green-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                                                            <span className="text-xl">{icon}</span>
                                                            <span className="text-[8px]">{type.slice(0,6)}..</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                         )}

                         {/* SUB-TAB: WAVES */}
                         {levelSubTab === 'WAVES' && (
                             <div className="flex gap-6 h-full">
                                 <div className="flex-1 bg-slate-900/50 p-6 rounded-lg border border-slate-700 overflow-y-auto">
                                     <h3 className="text-yellow-400 font-pixel mb-4 text-sm">EDIT WAVE #{currentWave.waveNumber}</h3>
                                     <div className="mb-4 flex gap-4 items-center">
                                         <label className="text-slate-300 text-xs">Start Delay (ms):</label>
                                         <input type="number" value={currentWave.startDelay} onChange={e => setCurrentWave({...currentWave, startDelay: parseInt(e.target.value)})} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white w-20 text-sm"/>
                                         <label className="flex items-center gap-2 text-red-400 font-bold cursor-pointer text-xs">
                                             <input type="checkbox" checked={currentWave.isFlagWave} onChange={e => setCurrentWave({...currentWave, isFlagWave: e.target.checked})} /> HUGE WAVE
                                         </label>
                                     </div>
                                     <div className="mb-2 text-xs text-slate-400">Add Zombies to Wave:</div>
                                     <div className="grid grid-cols-6 gap-2 mb-4">
                                         {availableZombies.map(z => {
                                             const stats = ZOMBIE_STATS[z] || dlcData.zombies?.[z];
                                             const idleAnim = stats?.visuals?.['idle'] as AnimationState | undefined;
                                             const visualFrame = idleAnim?.frames?.[0];
                                             const icon = visualFrame ? <img src={visualFrame} className="w-8 h-8 image-pixelated object-contain" /> : stats?.icon || '🧟';
                                             return (
                                                <button key={z} onClick={() => addZombieToWave(z)} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded p-1 text-[10px] flex flex-col items-center">
                                                    <span className="text-lg">{icon}</span>
                                                    <span className="truncate w-full text-center">{z}</span>
                                                </button>
                                             );
                                         })}
                                     </div>
                                     <div className="space-y-1 bg-black/30 p-2 rounded min-h-[100px] max-h-[200px] overflow-y-auto">
                                         {currentWave.zombies.map((z, i) => (
                                             <div key={i} className="flex justify-between items-center bg-slate-700 p-1 px-2 rounded text-xs">
                                                 <span className="text-white">{z.type}</span>
                                                 <div className="flex items-center gap-2">
                                                     <span className="text-slate-400">Count:</span>
                                                     <input type="number" value={z.count} onChange={e => {
                                                         const newZ = [...currentWave.zombies];
                                                         newZ[i].count = parseInt(e.target.value);
                                                         setCurrentWave({...currentWave, zombies: newZ});
                                                     }} className="w-12 bg-slate-900 text-white px-1 rounded text-right" />
                                                 </div>
                                             </div>
                                         ))}
                                         {currentWave.zombies.length === 0 && <div className="text-slate-600 text-center text-xs py-4">Empty Wave</div>}
                                     </div>
                                     <button onClick={handleAddWave} className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-sm shadow-lg">SAVE & NEXT WAVE</button>
                                 </div>
                                 <div className="w-1/3 bg-slate-900/50 rounded border border-slate-700 p-4 overflow-y-auto">
                                     <h4 className="text-green-400 font-pixel mb-2 text-xs">WAVE TIMELINE</h4>
                                     {levelConfig.waves?.map((w, i) => (
                                         <div key={i} className={`p-2 mb-2 rounded border ${w.isFlagWave ? 'bg-red-900/20 border-red-800' : 'bg-slate-800 border-slate-600'}`}>
                                             <div className="flex justify-between text-xs text-white font-bold">
                                                 <span>Wave {w.waveNumber} {w.isFlagWave && '🚩'}</span>
                                                 <span className="text-yellow-500">+{w.startDelay}ms</span>
                                             </div>
                                             <div className="text-[10px] text-slate-400 mt-1">
                                                 Zombies: {w.zombies.reduce((a,b) => a+b.count, 0)}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}

                         {/* SUB-TAB: EVENTS */}
                         {levelSubTab === 'EVENTS' && (
                             <div className="flex gap-6 h-full">
                                 <div className="flex-1 bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                                     <h3 className="text-yellow-400 font-pixel mb-4 text-sm">ADD TEXT EVENT</h3>
                                     <div className="space-y-4">
                                         <div>
                                             <label className="block text-slate-400 text-xs mb-1">Trigger Time (ms)</label>
                                             <input type="number" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 text-white px-2 py-1 rounded"/>
                                         </div>
                                         <div>
                                             <label className="block text-slate-400 text-xs mb-1">Text Content</label>
                                             <input type="text" value={newEvent.content} onChange={e => setNewEvent({...newEvent, content: e.target.value})} className="w-full bg-slate-800 border border-slate-600 text-white px-2 py-1 rounded"/>
                                         </div>
                                         <div>
                                             <label className="block text-slate-400 text-xs mb-1">Style</label>
                                             <select value={newEvent.style} onChange={e => setNewEvent({...newEvent, style: e.target.value as any})} className="w-full bg-slate-800 border border-slate-600 text-white px-2 py-1 rounded">
                                                 <option value="WARNING">RED WARNING</option>
                                                 <option value="INFO">YELLOW INFO</option>
                                                 <option value="SPOOKY">SPOOKY PURPLE</option>
                                             </select>
                                         </div>
                                         <button onClick={handleAddEvent} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-sm">ADD EVENT</button>
                                     </div>
                                 </div>
                                 <div className="w-1/2 bg-slate-900/50 rounded border border-slate-700 p-4 overflow-y-auto">
                                     <h4 className="text-purple-400 font-pixel mb-2 text-xs">EVENT TIMELINE</h4>
                                     {levelConfig.events?.map((ev, i) => (
                                         <div key={i} className="flex justify-between items-center bg-slate-800 p-2 mb-2 rounded border border-slate-600">
                                             <span className="font-mono text-yellow-500 text-xs">{ev.time}ms</span>
                                             <span className="text-white text-xs truncate mx-2 flex-1">{ev.content}</span>
                                             <span className="text-[9px] bg-black/40 px-1 rounded text-slate-300">{ev.style}</span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
             )}

             {/* === TAB: PLANTS === */}
             {activeTab === 'PLANTS' && (
                 <div className="flex gap-6 h-full">
                     <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                         {/* COPY PRESET */}
                         <div className="flex gap-4">
                             <div className="flex-1 bg-slate-700/30 p-2 rounded border border-slate-600 mb-4">
                                 <label className="block text-slate-400 text-[10px] font-pixel mb-1">COPY FROM BASE</label>
                                 <select onChange={(e) => loadBasePlant(e.target.value)} className="w-full bg-slate-900 text-xs p-1 rounded border border-slate-700 text-white">
                                     <option value="">-- Select Base Plant --</option>
                                     {Object.values(PLANT_STATS).map(p => (
                                         <option key={p.type} value={p.type}>{p.name}</option>
                                     ))}
                                 </select>
                             </div>
                             <div className="flex-1 bg-slate-700/30 p-2 rounded border border-slate-600 mb-4">
                                 <label className="block text-slate-400 text-[10px] font-pixel mb-1">COPY FROM INSTALLED DLC</label>
                                 <select onChange={(e) => loadDlcPlant(e.target.value)} className="w-full bg-slate-900 text-xs p-1 rounded border border-slate-700 text-white">
                                     <option value="">-- Select DLC Plant --</option>
                                     {AVAILABLE_DLCS.map(dlc => (
                                         dlc.plants && dlc.plants.length > 0 && (
                                             <optgroup key={dlc.id} label={dlc.name}>
                                                 {dlc.plants.map(p => (
                                                     <option key={p.type} value={`${dlc.id}:${p.type}`}>{p.name}</option>
                                                 ))}
                                             </optgroup>
                                         )
                                     ))}
                                 </select>
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-400 text-xs font-pixel mb-1">ID (UNIQUE)</label>
                                <input type="text" value={newPlant.type} onChange={e => setNewPlant({...newPlant, type: e.target.value.toUpperCase()})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono" placeholder="MY_PLANT" />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs font-pixel mb-1">NAME</label>
                                <input type="text" value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                            </div>
                         </div>
                         <div className="grid grid-cols-3 gap-4">
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">ICON (EMOJI)</label>
                                 <input type="text" value={newPlant.icon} onChange={e => setNewPlant({...newPlant, icon: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-center text-2xl" />
                             </div>
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">COST</label>
                                 <input type="number" value={newPlant.cost} onChange={e => setNewPlant({...newPlant, cost: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                             </div>
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">HEALTH</label>
                                 <input type="number" value={newPlant.health} onChange={e => setNewPlant({...newPlant, health: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                             </div>
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">VISUAL SCALE (1.0 - 5.0)</label>
                                 <input type="number" step="0.1" value={newPlant.visualScale || 1.0} onChange={e => setNewPlant({...newPlant, visualScale: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                             </div>
                         </div>
                         <div>
                             <label className="block text-slate-400 text-xs font-pixel mb-1">DESCRIPTION</label>
                             <input type="text" value={newPlant.description} onChange={e => setNewPlant({...newPlant, description: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                         </div>
                         
                         {/* VISUALS BUTTON */}
                         <div>
                            <label className="block text-slate-400 text-xs font-pixel mb-1">CUSTOM SPRITE</label>
                            <div className="flex gap-4 items-center">
                                <button onClick={() => { setEditingTarget('PLANT'); setShowPixelEditor(true); }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded shadow">
                                    {newPlant.visuals ? 'EDIT PIXEL ART' : 'CREATE PIXEL ART'}
                                </button>
                                {newPlant.visuals && <span className="text-green-400 text-xs">✓ Custom Sprites Loaded</span>}
                            </div>
                         </div>

                         <button onClick={handleAddPlant} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-pixel rounded border-b-4 border-green-800 active:border-b-0 active:translate-y-1 shadow-lg">ADD TO DLC</button>
                     </div>
                     
                     {/* Preview List */}
                     <div className="w-1/3 bg-slate-900/50 rounded border border-slate-700 p-4">
                         <h4 className="text-green-400 font-pixel mb-4 text-sm">ADDED PLANTS ({dlcData.plants?.length || 0})</h4>
                         <div className="space-y-2">
                             {dlcData.plants?.map((p, i) => {
                                 const idleAnim = p.visuals?.['idle'] as AnimationState | undefined;
                                 return (
                                     <div key={i} className="flex items-center gap-3 bg-slate-800 p-2 rounded border border-slate-600">
                                         <span className="text-2xl flex items-center justify-center w-10 h-10 bg-black/20 rounded">
                                             {idleAnim?.frames?.[0] ? <img src={idleAnim.frames[0]} className="w-full h-full image-pixelated object-contain" /> : p.icon}
                                         </span>
                                         <div>
                                             <div className="text-xs font-bold text-white">{p.name}</div>
                                             <div className="text-[10px] text-slate-400">{p.cost} ☀️ | Scl: {p.visualScale || 1.0}</div>
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                     </div>
                 </div>
             )}

             {/* === TAB: ZOMBIES === */}
             {activeTab === 'ZOMBIES' && (
                 <div className="flex gap-6 h-full">
                     <div className="flex-1 space-y-4">
                          {/* COPY PRESET */}
                         <div className="flex gap-4">
                             <div className="flex-1 bg-slate-700/30 p-2 rounded border border-slate-600 mb-4">
                                 <label className="block text-slate-400 text-[10px] font-pixel mb-1">COPY FROM BASE</label>
                                 <select onChange={(e) => loadBaseZombie(e.target.value)} className="w-full bg-slate-900 text-xs p-1 rounded border border-slate-700 text-white">
                                     <option value="">-- Select Base Zombie --</option>
                                     {Object.keys(ZOMBIE_STATS).map(id => (
                                         <option key={id} value={id}>{id}</option>
                                     ))}
                                 </select>
                             </div>
                             <div className="flex-1 bg-slate-700/30 p-2 rounded border border-slate-600 mb-4">
                                 <label className="block text-slate-400 text-[10px] font-pixel mb-1">COPY FROM INSTALLED DLC</label>
                                 <select onChange={(e) => loadDlcZombie(e.target.value)} className="w-full bg-slate-900 text-xs p-1 rounded border border-slate-700 text-white">
                                     <option value="">-- Select DLC Zombie --</option>
                                     {AVAILABLE_DLCS.map(dlc => (
                                         dlc.zombies && Object.keys(dlc.zombies).length > 0 && (
                                             <optgroup key={dlc.id} label={dlc.name}>
                                                 {Object.keys(dlc.zombies).map(zId => (
                                                     <option key={zId} value={`${dlc.id}:${zId}`}>{zId}</option>
                                                 ))}
                                             </optgroup>
                                         )
                                     ))}
                                 </select>
                             </div>
                         </div>

                         <div>
                            <label className="block text-slate-400 text-xs font-pixel mb-1">ID (UNIQUE)</label>
                            <input type="text" value={newZombie.id} onChange={e => setNewZombie({...newZombie, id: e.target.value.toUpperCase()})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono" placeholder="MY_ZOMBIE" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">ICON (EMOJI)</label>
                                 <input type="text" value={newZombie.stats.icon} onChange={e => setNewZombie({...newZombie, stats: {...newZombie.stats, icon: e.target.value}})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-center text-2xl" />
                             </div>
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">SPEED (0.02 - 0.2)</label>
                                 <input type="number" step="0.1" value={newZombie.stats.speed} onChange={e => setNewZombie({...newZombie, stats: {...newZombie.stats, speed: parseFloat(e.target.value)}})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                             </div>
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">HEALTH (HP)</label>
                                 <input type="number" value={newZombie.stats.health} onChange={e => setNewZombie({...newZombie, stats: {...newZombie.stats, health: parseInt(e.target.value)}})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                             </div>
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">DAMAGE (DPS)</label>
                                 <input type="number" value={newZombie.stats.damage} onChange={e => setNewZombie({...newZombie, stats: {...newZombie.stats, damage: parseInt(e.target.value)}})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                             </div>
                             <div>
                                 <label className="block text-slate-400 text-xs font-pixel mb-1">VISUAL SCALE (1.0 - 5.0)</label>
                                 <input type="number" step="0.1" value={newZombie.stats.visualScale} onChange={e => setNewZombie({...newZombie, stats: {...newZombie.stats, visualScale: parseFloat(e.target.value)}})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                             </div>
                         </div>
                         
                         {/* VISUALS BUTTON */}
                         <div>
                            <label className="block text-slate-400 text-xs font-pixel mb-1">CUSTOM SPRITE</label>
                            <div className="flex gap-4 items-center">
                                <button onClick={() => { setEditingTarget('ZOMBIE'); setShowPixelEditor(true); }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded shadow">
                                    {newZombie.stats.visuals ? 'EDIT PIXEL ART' : 'CREATE PIXEL ART'}
                                </button>
                                {newZombie.stats.visuals && <span className="text-green-400 text-xs">✓ Custom Sprites Loaded ({newZombie.stats.visuals.gridSize || 16}px)</span>}
                            </div>
                         </div>

                         <button onClick={handleAddZombie} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-pixel rounded border-b-4 border-red-800 active:border-b-0 active:translate-y-1 shadow-lg">ADD TO DLC</button>
                     </div>

                     <div className="w-1/3 bg-slate-900/50 rounded border border-slate-700 p-4">
                         <h4 className="text-red-400 font-pixel mb-4 text-sm">ADDED ZOMBIES ({Object.keys(dlcData.zombies || {}).length})</h4>
                         <div className="space-y-2">
                             {dlcData.zombies && Object.entries(dlcData.zombies).map(([id, s]) => {
                                 const stats = s as ZombieStatConfig;
                                 const idleAnim = stats.visuals?.['idle'] as AnimationState | undefined;
                                 const visualFrame = idleAnim?.frames?.[0];
                                 const icon = visualFrame ? <img src={visualFrame} className="w-full h-full image-pixelated object-contain" /> : stats.icon;
                                 return (
                                     <div key={id} className="flex items-center gap-3 bg-slate-800 p-2 rounded border border-slate-600">
                                         <span className="text-2xl flex items-center justify-center w-10 h-10 bg-black/20 rounded">
                                             {icon}
                                         </span>
                                         <div>
                                             <div className="text-xs font-bold text-white">{id}</div>
                                             <div className="text-[10px] text-slate-400">HP: {stats.health} | Scl: {stats.visualScale || 1}</div>
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                     </div>
                 </div>
             )}

             {/* === TAB: EXPORT === */}
             {activeTab === 'EXPORT' && (
                 <div className="h-full flex flex-col">
                     <div className="bg-yellow-900/20 border border-yellow-600/50 p-4 rounded mb-4">
                         <p className="text-yellow-100 text-xs mb-2 font-bold">HOW TO USE:</p>
                         <ol className="text-slate-300 text-xs list-decimal list-inside space-y-1">
                             <li>Copy the code below.</li>
                             <li>Create a new folder in <code className="bg-black/30 px-1 rounded">dlc/</code> (e.g., <code className="bg-black/30 px-1 rounded">dlc/my_mod/</code>).</li>
                             <li>Paste the code into <code className="bg-black/30 px-1 rounded">index.ts</code> inside that folder.</li>
                             <li>Register your new DLC in <code className="bg-black/30 px-1 rounded">dlc/index.ts</code>.</li>
                         </ol>
                     </div>
                     <textarea 
                        readOnly
                        value={generateExportCode()}
                        className="flex-1 bg-slate-950 text-green-400 font-mono text-xs p-4 rounded border border-slate-700 outline-none resize-none shadow-inner"
                     />
                 </div>
             )}

          </div>
       </div>
    </div>
  );
};