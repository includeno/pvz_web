
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EntityVisuals } from '../types';
import { t, Lang } from '../i18n';

interface PixelEditorProps {
  initialVisuals?: EntityVisuals;
  onSave: (visuals: EntityVisuals) => void;
  onClose: () => void;
  entityName: string;
  hideActionMenu?: boolean;
  language: Lang;
}

const PREVIEW_SCALE = 4;

// Colors
const PALETTE = [
  'TRANSPARENT', '#000000', '#FFFFFF', '#6B7280', 
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#22C55E', '#10B981', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E',
  '#881337', '#7C2D12', '#78350F', '#365314',
  '#14532D', '#134E4A', '#164E63', '#1E3A8A'
];

// Standard Action Keys for Suggestions
const STANDARD_ACTIONS = [
    'idle', 'attack', 'walk', 'run', 'jump', 'die', 'summon', 'charging', 'eating'
];

type GridData = string[]; // Length gridSize*gridSize array of hex colors or 'TRANSPARENT'

// Helper: RGB to Hex
function componentToHex(c: number) {
  const hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export const PixelEditor: React.FC<PixelEditorProps> = ({ initialVisuals, onSave, onClose, entityName, hideActionMenu, language }) => {
  // --- STATE ---
  
  const [gridSize, setGridSize] = useState<number>(16);
  const [actions, setActions] = useState<Record<string, { frames: GridData[], fps: number }>>({});
  const [currentActionName, setCurrentActionName] = useState('idle');
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  
  // Editor State
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);

  // New Action input
  const [newActionName, setNewActionName] = useState('');

  // UI Scale depends on grid size to fit in screen
  const EDITOR_SCALE = gridSize > 32 ? 10 : 20;

  // Helper to convert an image src to a GridData array
  const imageToGrid = useCallback((src: string, size: number): Promise<GridData> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
              const cvs = document.createElement('canvas');
              cvs.width = size;
              cvs.height = size;
              const ctx = cvs.getContext('2d');
              if (!ctx) { resolve(Array(size*size).fill('TRANSPARENT')); return; }
              
              ctx.imageSmoothingEnabled = false;
              ctx.clearRect(0,0,size,size);
              ctx.drawImage(img, 0, 0, size, size);
              
              const imgData = ctx.getImageData(0,0,size,size).data;
              const grid: string[] = [];
              for(let i=0; i < imgData.length; i+=4) {
                  const r = imgData[i];
                  const g = imgData[i+1];
                  const b = imgData[i+2];
                  const a = imgData[i+3];
                  if (a < 128) grid.push('TRANSPARENT');
                  else grid.push(rgbToHex(r,g,b).toUpperCase());
              }
              resolve(grid);
          };
          img.onerror = () => resolve(Array(size*size).fill('TRANSPARENT'));
          img.src = src;
      });
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
        const size = initialVisuals?.gridSize || 16;
        setGridSize(size);
        
        const blank = Array(size * size).fill('TRANSPARENT');
        const loadedActions: Record<string, { frames: GridData[], fps: number }> = {};

        if (initialVisuals && Object.keys(initialVisuals).length > 0) {
            for (const [key, val] of Object.entries(initialVisuals)) {
                 if (key === 'gridSize') continue;
                 const anim = val as { frames: string[], fps: number };

                 if (anim && anim.frames && anim.frames.length > 0) {
                     const frames = await Promise.all(anim.frames.map(src => imageToGrid(src, size)));
                     loadedActions[key] = { frames, fps: anim.fps || 5 };
                 }
            }
        }
        
        // Ensure 'idle' exists at minimum
        if (!loadedActions['idle']) {
            loadedActions['idle'] = { frames: [blank], fps: 5 };
        }

        setActions(loadedActions);
        setCurrentActionName('idle');
        setIsLoading(false);
    };
    init();
  }, [initialVisuals, imageToGrid]);

  // --- DERIVED STATE ---
  const currentAction = actions[currentActionName] || { frames: [], fps: 5 };
  const currentGrid = currentAction.frames[currentFrameIdx] || Array(gridSize * gridSize).fill('TRANSPARENT');

  // --- HELPERS ---
  const updateAction = (name: string, newFrames: GridData[], newFps?: number) => {
      setActions(prev => ({
          ...prev,
          [name]: {
              frames: newFrames,
              fps: newFps ?? prev[name].fps
          }
      }));
  };

  const handlePixelClick = (index: number) => {
    const newGrid = [...currentGrid];
    newGrid[index] = selectedColor;
    
    const newFrames = [...currentAction.frames];
    newFrames[currentFrameIdx] = newGrid;
    updateAction(currentActionName, newFrames);
  };

  const handleAddFrame = () => {
    const newFrames = [...currentAction.frames, [...currentGrid]];
    updateAction(currentActionName, newFrames);
    setCurrentFrameIdx(newFrames.length - 1);
  };

  const handleDeleteFrame = () => {
    if (currentAction.frames.length <= 1) return;
    const newFrames = currentAction.frames.filter((_, i) => i !== currentFrameIdx);
    updateAction(currentActionName, newFrames);
    setCurrentFrameIdx(Math.max(0, currentFrameIdx - 1));
  };

  const handleCreateAction = (name?: string) => {
      const targetName = name || newActionName;
      if (!targetName) return;
      if (actions[targetName]) { 
          // If already exists, just switch to it
          setCurrentActionName(targetName);
          setNewActionName('');
          return;
      }
      
      const blank = Array(gridSize * gridSize).fill('TRANSPARENT');
      setActions(prev => ({ ...prev, [targetName]: { frames: [blank], fps: 5 } }));
      setCurrentActionName(targetName);
      setNewActionName('');
  };

  const handleDeleteAction = (name: string) => {
      if (Object.keys(actions).length <= 1) { alert("Must have at least one action!"); return; }
      const newActions = { ...actions };
      delete newActions[name];
      setActions(newActions);
      if (currentActionName === name) {
          setCurrentActionName(Object.keys(newActions)[0]);
          setCurrentFrameIdx(0);
      }
  };
  
  const handleChangeGridSize = (newSize: number) => {
      if (confirm("Changing grid size will reset all frames. Continue?")) {
          setGridSize(newSize);
          const blank = Array(newSize * newSize).fill('TRANSPARENT');
          setActions({ idle: { frames: [blank], fps: 5 }});
          setCurrentActionName('idle');
          setCurrentFrameIdx(0);
      }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (index: number) => setDraggedFrameIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIndex: number) => {
      if (draggedFrameIndex === null || draggedFrameIndex === targetIndex) return;
      const newFrames = [...currentAction.frames];
      const [draggedItem] = newFrames.splice(draggedFrameIndex, 1);
      newFrames.splice(targetIndex, 0, draggedItem);
      updateAction(currentActionName, newFrames);
      setCurrentFrameIdx(targetIndex);
      setDraggedFrameIndex(null);
  };

  // --- Preview Loop ---
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
     if (!isPlaying || currentAction.frames.length === 0) return;
     let frame = 0;
     const intervalMs = 1000 / (currentAction.fps || 5);
     const interval = setInterval(() => {
         frame = (frame + 1) % currentAction.frames.length;
         drawGridToCanvas(currentAction.frames[frame], previewCanvasRef.current, PREVIEW_SCALE);
     }, intervalMs);
     return () => clearInterval(interval);
  }, [currentAction.frames, currentAction.fps, isPlaying, gridSize]);

  // --- Drawing ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const drawGridToCanvas = (grid: GridData, canvas: HTMLCanvasElement | null, scale: number, gridLines = false) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = gridSize * scale;
      canvas.height = gridSize * scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!grid) return;

      grid.forEach((color, i) => {
          if (color !== 'TRANSPARENT') {
              const x = (i % gridSize) * scale;
              const y = Math.floor(i / gridSize) * scale;
              ctx.fillStyle = color;
              ctx.fillRect(x, y, scale, scale);
          }
      });

      if (gridLines) {
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for(let i=0; i<=gridSize; i++) {
              ctx.moveTo(i*scale, 0); ctx.lineTo(i*scale, gridSize*scale);
              ctx.moveTo(0, i*scale); ctx.lineTo(gridSize*scale, i*scale);
          }
          ctx.stroke();
      }
  };

  useEffect(() => {
      drawGridToCanvas(currentGrid, canvasRef.current, EDITOR_SCALE, true);
  }, [currentGrid, EDITOR_SCALE, gridSize]);

  const getIndexFromCoords = (e: React.MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / EDITOR_SCALE);
      const y = Math.floor((e.clientY - rect.top) / EDITOR_SCALE);
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) return y * gridSize + x;
      return -1;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDrawing.current) {
          const idx = getIndexFromCoords(e);
          if (idx !== -1 && currentGrid[idx] !== selectedColor) handlePixelClick(idx);
      }
  };

  // --- EXPORT ---
  const generateBase64FromGrid = (grid: GridData): string => {
      const canvas = document.createElement('canvas');
      canvas.width = gridSize;
      canvas.height = gridSize;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, gridSize, gridSize);
      grid.forEach((color, i) => {
          if (color !== 'TRANSPARENT') {
              ctx.fillStyle = color;
              ctx.fillRect(i % gridSize, Math.floor(i / gridSize), 1, 1);
          }
      });
      return canvas.toDataURL('image/png');
  };

  const handleSave = () => {
      const exportVisuals: EntityVisuals = { gridSize };
      
      for (const [key, val] of Object.entries(actions)) {
          const anim = val as { frames: GridData[], fps: number };
          const base64Frames = anim.frames.map(generateBase64FromGrid);
          // @ts-ignore
          exportVisuals[key] = {
              frames: base64Frames,
              fps: anim.fps
          };
      }
      
      onSave(exportVisuals);
  };

  if (isLoading) return <div className="fixed inset-0 z-[100] bg-black text-white flex items-center justify-center font-pixel">{t('LOADING_PIXELS', language)}</div>;

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900/95 backdrop-blur flex items-center justify-center p-4">
        <div className="bg-slate-800 border-4 border-slate-600 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden w-[1000px]">
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl text-white font-pixel">{t('PIXEL_EDITOR', language)}: <span className="text-yellow-400">{entityName}</span></h2>
                    <select 
                        value={gridSize} 
                        onChange={e => handleChangeGridSize(parseInt(e.target.value))}
                        className="bg-slate-800 text-xs text-white border border-slate-600 rounded px-2 py-1"
                    >
                        <option value={16}>16x16 (Standard)</option>
                        <option value={32}>32x32 (Large)</option>
                        <option value={48}>48x48 (Huge)</option>
                        <option value={64}>64x64 (Boss)</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">{t('CANCEL', language)}</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-pixel rounded shadow">{t('SAVE_VISUALS', language)}</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Tools & Palette */}
                <div className="w-56 bg-slate-800 p-4 border-r border-slate-700 flex flex-col gap-4 overflow-y-auto">
                    
                    {/* Actions List (Conditionally Hidden) */}
                    {!hideActionMenu && (
                        <div>
                            <h4 className="text-xs text-slate-400 font-bold mb-2">{t('ACTIONS', language)}</h4>
                            <div className="flex flex-col gap-2 mb-2">
                                {Object.keys(actions).map(actionName => (
                                    <div key={actionName} className="flex gap-1">
                                        <button 
                                            onClick={() => { setCurrentActionName(actionName); setCurrentFrameIdx(0); }} 
                                            className={`flex-1 p-2 text-xs font-pixel border rounded text-left truncate ${currentActionName === actionName ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}
                                        >
                                            {actionName.toUpperCase()}
                                        </button>
                                        <button onClick={() => handleDeleteAction(actionName)} className="px-2 bg-slate-700 hover:bg-red-600 text-white border border-slate-600 rounded">×</button>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Action Quick Add Dropdown */}
                            <label className="text-[10px] text-slate-500">Quick Add:</label>
                            <select 
                                onChange={(e) => {
                                    handleCreateAction(e.target.value);
                                    e.target.value = '';
                                }}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-1 text-xs text-white mb-2"
                            >
                                <option value="">-- Add Action --</option>
                                {STANDARD_ACTIONS.map(act => (
                                    <option key={act} value={act} disabled={!!actions[act]}>
                                        {act.toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            <div className="flex gap-1">
                                <input type="text" placeholder="Custom..." value={newActionName} onChange={e => setNewActionName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 text-xs text-white" />
                                <button onClick={() => handleCreateAction()} className="text-green-400 font-bold bg-slate-700 px-2 rounded">+</button>
                            </div>
                        </div>
                    )}

                    {/* Properties */}
                    <div className={`${!hideActionMenu ? 'border-t border-slate-700 pt-4' : ''}`}>
                        <h4 className="text-xs text-slate-400 font-bold mb-2">{t('PLAYBACK_SPEED', language)}</h4>
                        <div className="flex items-center gap-2">
                            <input 
                                type="range" min="1" max="20" step="1" 
                                value={currentAction.fps} 
                                onChange={e => updateAction(currentActionName, currentAction.frames, parseInt(e.target.value))}
                                className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-white text-xs font-mono w-8 text-right">{currentAction.fps} FPS</span>
                        </div>
                    </div>

                    {/* Tools */}
                    <div className="border-t border-slate-700 pt-4">
                        <h4 className="text-xs text-slate-400 font-bold mb-2">{t('TOOLS', language)}</h4>
                        <div className="flex gap-2">
                            <button onClick={() => setSelectedColor('TRANSPARENT')} className={`w-8 h-8 rounded border-2 flex items-center justify-center ${selectedColor === 'TRANSPARENT' ? 'border-white' : 'border-slate-600 bg-slate-700'}`}>
                                ❌
                            </button>
                            <div className="w-8 h-8 rounded border-2 border-slate-600" style={{backgroundColor: selectedColor === 'TRANSPARENT' ? 'transparent' : selectedColor}} />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs text-slate-400 font-bold mb-2">{t('PALETTE', language)}</h4>
                        <div className="grid grid-cols-4 gap-1">
                            {PALETTE.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => setSelectedColor(c)}
                                    className={`w-8 h-8 rounded border hover:scale-110 transition-transform ${selectedColor === c ? 'border-white z-10 scale-110 shadow-lg' : 'border-slate-600'}`}
                                    style={{backgroundColor: c === 'TRANSPARENT' ? 'transparent' : c}}
                                    title={c}
                                >
                                    {c === 'TRANSPARENT' && '❌'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 bg-slate-700/50 flex flex-col items-center justify-center relative p-8">
                     <div 
                        className="bg-slate-900 border border-slate-500 shadow-2xl cursor-crosshair"
                        onMouseDown={(e) => { isDrawing.current = true; handleMouseMove(e); }}
                        onMouseUp={() => isDrawing.current = false}
                        onMouseLeave={() => isDrawing.current = false}
                        onMouseMove={handleMouseMove}
                     >
                         <canvas ref={canvasRef} />
                     </div>
                     <div className="mt-4 text-slate-400 text-xs font-mono">
                         {currentActionName.toUpperCase()} - Frame {currentFrameIdx + 1} / {currentAction.frames.length} ({gridSize}x{gridSize})
                     </div>
                </div>

                {/* Animation Timeline & Preview */}
                <div className="w-64 bg-slate-800 border-l border-slate-700 p-4 flex flex-col">
                    <h4 className="text-xs text-slate-400 font-bold mb-4">{t('PREVIEW', language)}</h4>
                    <div className="bg-black/40 rounded-lg p-4 flex justify-center border border-slate-600 mb-6">
                         <canvas ref={previewCanvasRef} className="image-pixelated bg-transparent" />
                    </div>

                    <h4 className="text-xs text-slate-400 font-bold mb-2">{t('TIMELINE', language)}</h4>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {currentAction.frames.map((_, idx) => (
                            <div 
                                key={idx}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(idx)}
                                onClick={() => setCurrentFrameIdx(idx)}
                                className={`
                                    p-2 rounded border cursor-pointer flex justify-between items-center transition-all select-none
                                    ${currentFrameIdx === idx ? 'bg-slate-600 border-yellow-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}
                                    ${draggedFrameIndex === idx ? 'opacity-50 border-dashed' : ''}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 cursor-move">☰</span>
                                    <span className="text-xs text-white">Frame {idx + 1}</span>
                                </div>
                                {currentAction.frames.length > 1 && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFrame(); }} className="text-red-400 hover:text-red-200 text-xs">✕</button>
                                )}
                            </div>
                        ))}
                        <button onClick={handleAddFrame} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-blue-400 text-xs font-bold border border-dashed border-slate-500 rounded">
                            + {t('NEW_FRAME', language)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
