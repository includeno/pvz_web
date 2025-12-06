
import React, { useState } from 'react';
import { AVAILABLE_DLCS, addCustomDLC, removeCustomDLC } from '../dlc';
import { DLCContent } from '../dlc/types';
import { ZombieStatConfig } from '../types';
import { t, Lang } from '../i18n';

interface DLCManagerProps {
  enabledDLCs: string[];
  onSave: (newEnabledIds: string[]) => void;
  onClose: () => void;
  language: Lang;
}

type Tab = 'INSTALLED' | 'IMPORT';

// Helper to check filename validity: Name_vVersion.json
const isValidFilename = (filename: string, name: string, version: string) => {
    const safeName = name.trim().replace(/\s+/g, '_');
    const expected = `${safeName}_v${version || '1.0'}.json`;
    // We do a loose check: the filename should ideally be exactly this, but case-insensitivity might be nice?
    // Let's stick to exact match as requested, but maybe case-insensitive for extension.
    return filename === expected;
};

export const DLCManager: React.FC<DLCManagerProps> = ({ enabledDLCs, onSave, onClose, language }) => {
  const [activeTab, setActiveTab] = useState<Tab>('INSTALLED');
  const [selection, setSelection] = useState<string[]>([...enabledDLCs]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDlcId, setViewingDlcId] = useState<string | null>(null);

  // Import State
  const [stagedDLCs, setStagedDLCs] = useState<{content: DLCContent | null, file: string, status: 'VALID' | 'NAME_MISMATCH' | 'INVALID', error?: string, expectedName?: string}[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Force re-render when list updates
  const [, setTick] = useState(0);

  const toggleDLC = (id: string) => {
    if (selection.includes(id)) {
      setSelection(selection.filter(sid => sid !== id));
    } else {
      setSelection([...selection, id]);
    }
  };

  // --- BATCH IMPORT LOGIC ---
  const handleFiles = async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      
      const newStaged: any[] = [];
      
      for(let i=0; i<files.length; i++) {
          const file = files[i];
          // Skip non-json files (e.g. system files in folder)
          if(!file.name.toLowerCase().endsWith('.json')) continue;
          
          try {
              const text = await file.text();
              const json = JSON.parse(text);
              if(json.id && json.name) {
                  const safeName = json.name.trim().replace(/\s+/g, '_');
                  const version = json.version || '1.0';
                  const expected = `${safeName}_v${version}.json`;
                  
                  const status = file.name === expected ? 'VALID' : 'NAME_MISMATCH';
                  newStaged.push({ content: json, file: file.name, status, expectedName: expected });
              } else {
                  newStaged.push({ content: null, file: file.name, status: 'INVALID', error: 'Missing ID/Name' });
              }
          } catch(e) {
              newStaged.push({ content: null, file: file.name, status: 'INVALID', error: 'JSON Parse Error' });
          }
      }
      setStagedDLCs(newStaged);
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
          setDragActive(true);
      } else if (e.type === "dragleave") {
          setDragActive(false);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
      }
  };

  const installAllValid = () => {
      let count = 0;
      stagedDLCs.forEach(item => {
          if (item.content && (item.status === 'VALID' || item.status === 'NAME_MISMATCH')) {
              try {
                  addCustomDLC(item.content);
                  if (!selection.includes(item.content.id)) {
                      setSelection(prev => [...prev, item.content!.id]);
                  }
                  count++;
              } catch (e) {
                  console.error(`Failed to install ${item.file}`, e);
              }
          }
      });
      alert(`Successfully installed ${count} DLCs!`);
      setStagedDLCs([]);
      setActiveTab('INSTALLED');
      setTick(t => t+1);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to remove this custom DLC?")) {
          removeCustomDLC(id);
          setSelection(prev => prev.filter(sid => sid !== id));
          setTick(t => t + 1);
      }
  };

  const filteredDLCs = AVAILABLE_DLCS.filter(dlc => 
      dlc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (dlc.description && dlc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const viewingDlc = viewingDlcId ? AVAILABLE_DLCS.find(d => d.id === viewingDlcId) : null;

  return (
    <div className="absolute inset-0 z-[2100] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-slate-800 border-4 border-slate-600 rounded-xl w-[700px] max-h-[90%] shadow-2xl flex flex-col overflow-hidden">
        
        {/* VIEWING DETAILS MODE */}
        {viewingDlc ? (
            <>
                <div className="p-6 border-b border-slate-700 bg-slate-800 rounded-t-lg shrink-0 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl text-yellow-400 font-pixel drop-shadow-md">{viewingDlc.name.toUpperCase()}</h2>
                        <div className="text-slate-500 text-xs font-mono">{t('VERSION', language)} {viewingDlc.version || '1.0'}</div>
                    </div>
                    <button onClick={() => setViewingDlcId(null)} className="text-slate-400 hover:text-white font-bold px-3 py-1 bg-slate-700 rounded border border-slate-600">
                        &lt; {t('BACK', language)}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-900/50">
                    {/* PLANTS SECTION */}
                    <div>
                        <h3 className="text-green-400 font-pixel text-sm mb-3 border-b border-slate-700 pb-1">{t('NEW_PLANTS', language)} ({viewingDlc.plants?.length || 0})</h3>
                        {(!viewingDlc.plants || viewingDlc.plants.length === 0) ? (
                            <div className="text-slate-600 text-xs italic">No new plants.</div>
                        ) : (
                            <div className="grid grid-cols-4 gap-4">
                                {viewingDlc.plants.map((p, i) => (
                                    <div key={i} className="bg-slate-800 border border-slate-700 p-2 rounded flex flex-col items-center">
                                        <div className="text-3xl mb-1">{p.icon}</div>
                                        <div className="text-xs text-white font-bold text-center leading-tight">{p.name}</div>
                                        <div className="text-[10px] text-yellow-500 font-mono mt-1">{p.cost} ☀️</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ZOMBIES SECTION */}
                    <div>
                        <h3 className="text-red-400 font-pixel text-sm mb-3 border-b border-slate-700 pb-1">{t('NEW_ZOMBIES', language)} ({Object.keys(viewingDlc.zombies || {}).length})</h3>
                        {(!viewingDlc.zombies || Object.keys(viewingDlc.zombies).length === 0) ? (
                            <div className="text-slate-600 text-xs italic">No new zombies.</div>
                        ) : (
                            <div className="grid grid-cols-4 gap-4">
                                {Object.entries(viewingDlc.zombies).map(([id, s], i) => {
                                    const stats = s as ZombieStatConfig;
                                    return (
                                        <div key={i} className="bg-slate-800 border border-slate-700 p-2 rounded flex flex-col items-center">
                                            <div className="text-3xl mb-1">{stats.icon}</div>
                                            <div className="text-[10px] text-white font-bold text-center truncate w-full" title={id}>{id}</div>
                                            <div className="text-[10px] text-red-400 font-mono mt-1">HP: {stats.health}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* LEVELS SECTION */}
                    <div>
                        <h3 className="text-blue-400 font-pixel text-sm mb-3 border-b border-slate-700 pb-1">{t('CAMPAIGN_LEVELS', language)} ({viewingDlc.levels?.length || 0})</h3>
                        {(!viewingDlc.levels || viewingDlc.levels.length === 0) ? (
                            <div className="text-slate-600 text-xs italic">No levels included.</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {viewingDlc.levels.map((l, i) => (
                                    <div key={i} className="bg-slate-800 border border-slate-700 px-3 py-2 rounded flex justify-between items-center">
                                        <span className="text-xs text-slate-300">{l.name}</span>
                                        <span className="text-[10px] bg-black/30 px-1 rounded text-slate-500">{l.totalWaves || l.waves?.length || 0} {t('WAVES', language)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </>
        ) : (
            <>
                {/* LIST MODE HEADER */}
                <div className="p-6 border-b border-slate-700 bg-slate-800 rounded-t-lg shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-3xl text-blue-400 font-pixel drop-shadow-md">{t('EXPANSION_PACKS', language)}</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <button onClick={() => setActiveTab('INSTALLED')} className={`px-4 py-2 font-pixel text-xs rounded transition-colors ${activeTab === 'INSTALLED' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                            INSTALLED
                        </button>
                        <button onClick={() => setActiveTab('IMPORT')} className={`px-4 py-2 font-pixel text-xs rounded transition-colors ${activeTab === 'IMPORT' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                            IMPORT (FOLDER)
                        </button>
                    </div>
                    
                    {/* Search Input (Only for list) */}
                    {activeTab === 'INSTALLED' && (
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input 
                                type="text" 
                                placeholder={t('SEARCH_DLC', language)} 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    )}
                </div>

                {/* SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-slate-800/50">
                    
                    {activeTab === 'INSTALLED' && (
                        <>
                            {filteredDLCs.length === 0 && (
                                <div className="text-slate-500 text-center py-8 font-pixel opacity-70 flex flex-col items-center">
                                    <span className="text-4xl mb-2">📦</span>
                                    <span>{t('NO_DLCS_FOUND', language)}</span>
                                </div>
                            )}

                            {filteredDLCs.map((dlc) => {
                                const isEnabled = selection.includes(dlc.id);
                                return (
                                    <div 
                                        key={dlc.id} 
                                        onClick={() => toggleDLC(dlc.id)}
                                        className={`
                                            relative p-4 rounded-lg border-2 cursor-pointer transition-all
                                            flex items-start gap-4 group
                                            ${isEnabled ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-400'}
                                        `}
                                    >
                                        <div className={`
                                            w-6 h-6 mt-1 rounded border flex items-center justify-center transition-colors shrink-0
                                            ${isEnabled ? 'bg-blue-500 border-blue-300' : 'bg-slate-900 border-slate-500'}
                                        `}>
                                            {isEnabled && <span className="text-white font-bold text-sm">✓</span>}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-pixel text-lg truncate ${isEnabled ? 'text-white' : 'text-slate-300'}`}>{dlc.name}</h3>
                                                    <span className="bg-slate-900 text-slate-500 text-[9px] px-1 rounded font-mono border border-slate-700 shrink-0">
                                                        v{dlc.version || '1.0'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setViewingDlcId(dlc.id); }}
                                                        className="text-[10px] bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded font-bold border border-slate-500 shadow-sm"
                                                    >
                                                        {t('DETAILS', language)}
                                                    </button>
                                                    {/* Show delete button only for custom DLCs (naive check: if removable) */}
                                                    <button 
                                                        onClick={(e) => handleDelete(e, dlc.id)}
                                                        className="text-[10px] bg-red-900/50 hover:bg-red-600 text-white px-2 py-1 rounded font-bold border border-red-800 shadow-sm"
                                                        title="Uninstall Custom DLC"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-slate-400 text-xs mt-1 line-clamp-2 pr-16">{dlc.description || 'No description provided.'}</p>
                                            
                                            <div className="flex gap-4 mt-2 text-[10px] text-slate-500 font-mono">
                                                <span>{t('PLANTS', language)}: {dlc.plants?.length || 0}</span>
                                                <span>{t('ZOMBIES', language)}: {Object.keys(dlc.zombies || {}).length}</span>
                                                <span>{t('LEVELS', language)}: {dlc.levels?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {activeTab === 'IMPORT' && (
                        <div className="space-y-4 h-full flex flex-col">
                            {/* Drag & Drop Area */}
                            <div 
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`
                                    border-4 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center shrink-0
                                    ${dragActive ? 'bg-blue-900/50 border-blue-400 scale-105' : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'}
                                `}
                            >
                                <div className="text-4xl mb-2 text-slate-400">📂</div>
                                <div className="text-white font-pixel text-sm mb-1">BATCH IMPORT FROM FOLDER</div>
                                <div className="text-slate-500 text-xs mb-4 max-w-xs">
                                    Drag and drop a folder containing JSON files here.
                                    <br />
                                    Files must be named: <span className="text-yellow-500 font-mono">Name_vVersion.json</span>
                                </div>
                                <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded shadow-lg transition-transform active:scale-95 text-xs font-pixel">
                                    SELECT FOLDER
                                    <input 
                                        type="file" 
                                        {...({ webkitdirectory: "", directory: "", multiple: true } as any)} 
                                        onChange={handleFolderInput} 
                                        className="hidden" 
                                    />
                                </label>
                            </div>

                            {/* Staged List */}
                            <div className="flex-1 min-h-0 bg-slate-900/50 rounded-lg border border-slate-700 p-2 overflow-y-auto">
                                {stagedDLCs.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
                                        No files staged.
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {stagedDLCs.map((item, idx) => (
                                            <div key={idx} className={`p-2 rounded border flex justify-between items-center text-xs ${item.status === 'VALID' ? 'bg-green-900/20 border-green-800' : item.status === 'NAME_MISMATCH' ? 'bg-yellow-900/20 border-yellow-800' : 'bg-red-900/20 border-red-800'}`}>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-mono truncate ${item.status === 'INVALID' ? 'text-red-400' : 'text-slate-300'}`}>{item.file}</div>
                                                    {item.status === 'NAME_MISMATCH' && (
                                                        <div className="text-[10px] text-yellow-500">
                                                            Warning: Filename mismatch. Expected: {item.expectedName}
                                                        </div>
                                                    )}
                                                    {item.error && <div className="text-[10px] text-red-500">{item.error}</div>}
                                                </div>
                                                <div className="ml-2 font-bold">
                                                    {item.status === 'VALID' && <span className="text-green-500">✔ OK</span>}
                                                    {item.status === 'NAME_MISMATCH' && <span className="text-yellow-500">⚠ WARN</span>}
                                                    {item.status === 'INVALID' && <span className="text-red-500">✖ ERR</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {stagedDLCs.length > 0 && (
                                <button 
                                    onClick={installAllValid}
                                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-pixel rounded shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1 shrink-0"
                                >
                                    INSTALL ALL VALID DLCS ({stagedDLCs.filter(i => i.status !== 'INVALID').length})
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* FIXED FOOTER */}
                <div className="p-6 border-t border-slate-700 bg-slate-800 rounded-b-lg shrink-0 flex justify-end gap-4">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 text-slate-400 hover:text-white font-pixel text-sm hover:underline"
                    >
                        {t('CANCEL', language)}
                    </button>
                    {activeTab === 'INSTALLED' && (
                        <button 
                            onClick={() => onSave(selection)}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-pixel rounded shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            {t('APPLY_CHANGES', language)} ({selection.length})
                        </button>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};
