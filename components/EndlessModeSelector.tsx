
import React, { useState, useEffect } from 'react';
import { EndlessSaveSlot, PlantConfig, ZombieStatConfig } from '../types';
import { AVAILABLE_DLCS } from '../dlc';
import { INITIAL_PLANT_STATS, INITIAL_ZOMBIE_STATS } from '../constants';

interface EndlessModeSelectorProps {
  onBack: () => void;
  onStartGame: (slot: EndlessSaveSlot) => void;
}

const STORAGE_KEY = 'pvz_endless_saves';

export const EndlessModeSelector: React.FC<EndlessModeSelectorProps> = ({ onBack, onStartGame }) => {
  const [saves, setSaves] = useState<EndlessSaveSlot[]>([]);
  const [isCreating, setIsCreating] = useState<number | null>(null);
  const [selectedDLCs, setSelectedDLCs] = useState<string[]>([]);

  useEffect(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
          try {
              setSaves(JSON.parse(stored));
          } catch (e) {
              console.error("Failed to load saves", e);
              setSaves([]);
          }
      }
  }, []);

  const buildSnapshot = (dlcIds: string[]) => {
      const plants: Record<string, PlantConfig> = { ...INITIAL_PLANT_STATS };
      const zombies: Record<string, ZombieStatConfig> = { ...INITIAL_ZOMBIE_STATS };
      
      dlcIds.forEach(id => {
          const dlc = AVAILABLE_DLCS.find(d => d.id === id);
          if (dlc) {
              dlc.plants?.forEach(p => { plants[p.type] = p; });
              if (dlc.zombies) Object.assign(zombies, dlc.zombies);
          }
      });
      return { plants, zombies };
  };

  const handleCreateSave = (slotId: number) => {
      const snapshot = buildSnapshot(selectedDLCs);
      const newSlot: EndlessSaveSlot = {
          id: slotId,
          floor: 1,
          score: 0,
          inventory: {},
          dlcIds: selectedDLCs,
          timestamp: Date.now(),
          statsSnapshot: snapshot,
          gridSnapshot: [],
          sunSnapshot: []
      };
      
      const newSaves = [...saves.filter(s => s.id !== slotId), newSlot];
      setSaves(newSaves);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSaves));
      setIsCreating(null);
      onStartGame(newSlot);
  };

  const handleDeleteSave = (slotId: number) => {
      if (confirm("Delete this save file?")) {
          const newSaves = saves.filter(s => s.id !== slotId);
          setSaves(newSaves);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSaves));
      }
  };

  const renderSlot = (slotId: number) => {
      const save = saves.find(s => s.id === slotId);

      if (isCreating === slotId) {
          return (
              <div key={slotId} className="bg-slate-800 border-4 border-blue-500 rounded-xl p-6 flex flex-col gap-4">
                  <h3 className="text-xl text-blue-300 font-pixel">NEW GAME CONFIG</h3>
                  <div className="text-xs text-slate-400">SELECT DLCs TO ENABLE:</div>
                  <div className="flex-1 overflow-y-auto bg-slate-900/50 p-2 rounded border border-slate-700 max-h-[200px]">
                      {AVAILABLE_DLCS.map(dlc => (
                          <label key={dlc.id} className="flex items-center gap-2 p-2 hover:bg-slate-800 cursor-pointer text-sm text-slate-300">
                              <input 
                                type="checkbox" 
                                checked={selectedDLCs.includes(dlc.id)}
                                onChange={(e) => {
                                    if(e.target.checked) setSelectedDLCs([...selectedDLCs, dlc.id]);
                                    else setSelectedDLCs(selectedDLCs.filter(id => id !== dlc.id));
                                }}
                              />
                              {dlc.name}
                          </label>
                      ))}
                  </div>
                  <div className="flex gap-2 mt-auto">
                      <button onClick={() => setIsCreating(null)} className="flex-1 py-2 bg-slate-700 text-slate-300 font-bold rounded">CANCEL</button>
                      <button onClick={() => handleCreateSave(slotId)} className="flex-1 py-2 bg-green-600 text-white font-bold rounded shadow-lg">START</button>
                  </div>
              </div>
          );
      }

      if (save) {
          return (
              <div key={slotId} className="bg-slate-800 border-4 border-slate-600 rounded-xl p-6 flex flex-col gap-2 relative group">
                  <div className="flex justify-between items-start">
                      <div>
                          <h3 className="text-2xl text-yellow-400 font-pixel">FLOOR {save.floor}</h3>
                          <div className="text-xs text-slate-400 font-mono">SCORE: {save.score.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{new Date(save.timestamp).toLocaleDateString()}</div>
                      </div>
                      <div className="text-4xl">💾</div>
                  </div>
                  
                  <div className="mt-4 flex-1">
                      <div className="text-[10px] text-slate-500 font-bold mb-1">LOADED CONTENT:</div>
                      <div className="flex flex-wrap gap-1">
                          <span className="bg-slate-700 text-slate-300 px-1 rounded text-[10px]">Base Game</span>
                          {save.dlcIds.map(id => {
                              const name = AVAILABLE_DLCS.find(d => d.id === id)?.name || id;
                              return <span key={id} className="bg-purple-900/50 text-purple-300 px-1 rounded text-[10px]">{name}</span>
                          })}
                      </div>
                  </div>

                  <button onClick={() => onStartGame(save)} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-pixel rounded shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1 mt-4">
                      CONTINUE
                  </button>
                  
                  <button onClick={() => handleDeleteSave(slotId)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 font-bold px-2">
                      ✕
                  </button>
              </div>
          );
      }

      return (
          <div key={slotId} className="bg-slate-800/50 border-4 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-slate-800/80 transition-colors">
              <div className="text-6xl text-slate-600">➕</div>
              <button 
                onClick={() => { setIsCreating(slotId); setSelectedDLCs([]); }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-pixel rounded shadow-lg"
              >
                  NEW GAME
              </button>
              <div className="text-xs text-slate-500">SLOT {slotId}</div>
          </div>
      );
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8">
        <h2 className="text-4xl text-purple-400 font-pixel mb-8 drop-shadow-[0_4px_0_#000]">ENDLESS MODE</h2>
        
        <div className="grid grid-cols-3 gap-6 w-full max-w-5xl h-[400px]">
            {[1, 2, 3].map(id => renderSlot(id))}
        </div>

        <button onClick={onBack} className="mt-12 px-8 py-3 text-slate-400 hover:text-white font-pixel text-xl hover:underline">
            &lt; BACK TO MENU
        </button>
    </div>
  );
};
