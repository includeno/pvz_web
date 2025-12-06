
import React, { useState } from 'react';
import { AVAILABLE_DLCS } from '../dlc';
import { AnimationState, ZombieStatConfig } from '../types';
import { t, Lang } from '../i18n';

interface DLCManagerProps {
  enabledDLCs: string[];
  onSave: (newEnabledIds: string[]) => void;
  onClose: () => void;
  language: Lang;
}

export const DLCManager: React.FC<DLCManagerProps> = ({ enabledDLCs, onSave, onClose, language }) => {
  const [selection, setSelection] = useState<string[]>([...enabledDLCs]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDlcId, setViewingDlcId] = useState<string | null>(null);

  const toggleDLC = (id: string) => {
    if (selection.includes(id)) {
      setSelection(selection.filter(sid => sid !== id));
    } else {
      setSelection([...selection, id]);
    }
  };

  const filteredDLCs = AVAILABLE_DLCS.filter(dlc => 
      dlc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (dlc.description && dlc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const viewingDlc = viewingDlcId ? AVAILABLE_DLCS.find(d => d.id === viewingDlcId) : null;

  return (
    <div className="absolute inset-0 z-[2100] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-slate-800 border-4 border-slate-600 rounded-xl w-[700px] max-h-[90vh] shadow-2xl flex flex-col">
        
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
                    
                    {/* Search Input */}
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
                </div>

                {/* SCROLLABLE LIST */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-slate-800/50">
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
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewingDlcId(dlc.id); }}
                                        className="text-[10px] bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded font-bold border border-slate-500 shadow-sm"
                                    >
                                        {t('DETAILS', language)}
                                    </button>
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
                </div>

                {/* FIXED FOOTER */}
                <div className="p-6 border-t border-slate-700 bg-slate-800 rounded-b-lg shrink-0 flex justify-end gap-4">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 text-slate-400 hover:text-white font-pixel text-sm hover:underline"
                    >
                        {t('CANCEL', language)}
                    </button>
                    <button 
                        onClick={() => onSave(selection)}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-pixel rounded shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        {t('APPLY_CHANGES', language)} ({selection.length})
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
