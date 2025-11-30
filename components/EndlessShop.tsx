import React from 'react';
import { ConsumableType } from '../types';
import { CONSUMABLES } from '../constants';

interface EndlessShopProps {
  floor: number;
  score: number;
  inventory: Record<string, number>;
  onBuy: (type: ConsumableType, cost: number) => void;
  onContinue: () => void;
}

export const EndlessShop: React.FC<EndlessShopProps> = ({ floor, score, inventory, onBuy, onContinue }) => {
  return (
    <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col items-center justify-center p-8">
       <div className="w-[800px] bg-slate-800 border-4 border-yellow-600 rounded-xl p-8 shadow-2xl relative">
           
           <div className="text-center mb-8">
               <h2 className="text-3xl text-yellow-400 font-pixel mb-2">MERCHANT - FLOOR {floor}</h2>
               <div className="text-xl text-white font-mono">CREDITS: <span className="text-green-400">{score.toLocaleString()}</span></div>
           </div>

           <div className="grid grid-cols-2 gap-4 mb-8">
               {Object.entries(CONSUMABLES).map(([key, item]) => {
                   const type = key as ConsumableType;
                   const count = inventory[type] || 0;
                   const canAfford = score >= item.cost;
                   
                   return (
                       <div key={type} className="bg-slate-700 p-4 rounded border-2 border-slate-600 flex justify-between items-center group hover:border-yellow-500 transition-colors">
                           <div className="flex items-center gap-4">
                               <div className="text-4xl bg-slate-800 w-16 h-16 flex items-center justify-center rounded border border-slate-500">
                                   {item.icon}
                               </div>
                               <div>
                                   <div className="font-bold text-white font-pixel">{item.name}</div>
                                   <div className="text-xs text-slate-400">{item.description}</div>
                                   <div className="text-xs text-yellow-300 mt-1 font-mono">OWNED: {count}</div>
                               </div>
                           </div>
                           
                           <button 
                             onClick={() => onBuy(type, item.cost)}
                             disabled={!canAfford}
                             className={`px-4 py-2 rounded font-bold font-mono border-b-4 active:border-b-0 active:translate-y-1 ${canAfford ? 'bg-green-600 hover:bg-green-500 text-white border-green-800' : 'bg-slate-600 text-slate-400 border-slate-800 cursor-not-allowed'}`}
                           >
                               {item.cost} pts
                           </button>
                       </div>
                   );
               })}
           </div>

           <div className="flex justify-center">
               <button onClick={onContinue} className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-pixel text-xl rounded shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
                   NEXT FLOOR &gt;
               </button>
           </div>
       </div>
    </div>
  );
};