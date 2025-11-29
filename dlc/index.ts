
import { DLCContent } from './types';
import { PLANT_STATS, ZOMBIE_STATS, LEVELS, RESTORE_CONSTANTS } from '../constants';
import NeonCityDLC from './example_expansion';
import SandsOfTimeDLC from './sands_of_time';
import GalacticGardensDLC from './galactic_gardens';
import HauntedHarvestDLC from './haunted_harvest';

// --- DLC REGISTRY ---
// All available DLCs should be listed here.
export const AVAILABLE_DLCS: DLCContent[] = [
    NeonCityDLC,
    SandsOfTimeDLC,
    GalacticGardensDLC,
    HauntedHarvestDLC
];

// --- LOADER LOGIC ---
export const initDLC = () => {
    // Default init: Load all? Or none? 
    // For backward compatibility or auto-loading, we might load all by default,
    // but the new requirements suggest toggle capability.
    // Let's assume initially only base game is loaded unless saved state says otherwise.
    // For now, we won't auto-load anything here to respect the "toggle" feature.
    // If you want default enabled DLCs, call reloadDLCs with their IDs.
};

export const reloadDLCs = (enabledIds: string[]) => {
    console.log("Reloading DLCs...", enabledIds);
    
    // 1. Reset Game Data to Vanilla
    RESTORE_CONSTANTS();

    // 2. Apply Enabled DLCs
    enabledIds.forEach(id => {
        const dlc = AVAILABLE_DLCS.find(d => d.id === id);
        if (!dlc) return;

        console.log(`Applying DLC: ${dlc.name}`);

        // Register New Plants
        if (dlc.plants) {
            dlc.plants.forEach(plant => {
                // @ts-ignore
                PLANT_STATS[plant.type] = plant;
            });
        }

        // Register New Zombies
        if (dlc.zombies) {
            Object.entries(dlc.zombies).forEach(([key, stats]) => {
                 // @ts-ignore
                 ZOMBIE_STATS[key] = stats;
            });
        }

        // Register New Levels
        if (dlc.levels) {
            dlc.levels.forEach(level => {
                // Avoid duplicate IDs
                if (!LEVELS.find(l => l.id === level.id)) {
                    LEVELS.push(level);
                }
            });
        }
    });

    console.log("DLC Reload Complete.");
};
