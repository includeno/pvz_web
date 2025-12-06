
import React from 'react';
import { Plant, LevelScene, BasePlantType } from '../types';
import { GridCell } from './GridCell';
import { ROWS, COLS } from '../constants';

interface GameGridProps {
  grid: (Plant | null)[][];
  onCellClick: (row: number, col: number) => void;
  onHover: (row: number, col: number) => void;
  onLeave: () => void;
  dragOverCell: { row: number, col: number } | null;
  scene: LevelScene;
  targetingPlantId: string | null;
  selectedPlantType: string | null;
}

export const GameGrid: React.FC<GameGridProps> = ({
  grid,
  onCellClick,
  onHover,
  onLeave,
  dragOverCell,
  scene,
  targetingPlantId,
  selectedPlantType
}) => {

  const isCellHighlight = (r: number, c: number) => {
      if (!dragOverCell) return false;
      
      // Direct hover
      if (dragOverCell.row === r && dragOverCell.col === c) return true;
      
      // Cob Cannon Multitile Highlight Logic (Visual only)
      if (selectedPlantType === BasePlantType.COB_CANNON) {
          if (dragOverCell.row === r && dragOverCell.col === c - 1) return true;
      }
      return false;
  };

  return (
    <div 
        className="absolute left-[120px] top-[20px] w-[720px] h-[540px] z-10"
        onMouseLeave={onLeave}
    >
        <div className={`grid grid-rows-${ROWS} grid-cols-9 w-full h-full border-4 border-black/20 rounded-lg overflow-hidden bg-black/10 shadow-inner`} style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
            {grid.map((row, r) => (
                row.map((plant, c) => (
                    <div 
                        key={`${r}-${c}`} 
                        onClick={() => onCellClick(r, c)}
                        onMouseEnter={() => onHover(r, c)}
                        className="w-full h-full"
                    >
                        <GridCell 
                            row={r} col={c} plant={plant} 
                            isDragOver={isCellHighlight(r, c)} 
                            scene={scene}
                            isTargeting={!!targetingPlantId}
                        />
                    </div>
                ))
            ))}
        </div>
    </div>
  );
};
