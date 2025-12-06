
import { DLCContent } from './types';
import { PLANT_STATS, ZOMBIE_STATS, LEVELS, RESTORE_CONSTANTS } from '../constants';
import NeonCityDLC from './example_expansion/data';
import SandsOfTimeDLC from './sands_of_time/data';
import GalacticGardensDLC from './galactic_gardens/data';
import HauntedHarvestDLC from './haunted_harvest/data';

// --- DLC REGISTRY ---

// TS Modules are already typed/cast inside their files or here
const BUILT_IN_DLCS: DLCContent[] = [
    NeonCityDLC as DLCContent,
    SandsOfTimeDLC as DLCContent,
    GalacticGardensDLC as DLCContent,
    HauntedHarvestDLC as DLCContent
];

// Mutable array to hold all DLCs (Built-in + Custom)
export const AVAILABLE_DLCS: DLCContent[] = [...BUILT_IN_DLCS];

// --- CUSTOM DLC MANAGEMENT ---

const STORAGE_KEY = 'pvz_custom_dlcs';

export const initDLCs = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as DLCContent[];
            parsed.forEach(dlc => {
                // Prevent duplicates by ID, update if exists, or append
                const existingIdx = AVAILABLE_DLCS.findIndex(d => d.id === dlc.id);
                if (existingIdx > -1) {
                    // Don't overwrite built-ins with local storage unless intended, 
                    // but usually custom DLCs have unique IDs. 
                    // If ID collides with built-in, built-in usually takes precedence 
                    // unless we allow overrides. Let's allow custom to exist only if not built-in.
                    if (!BUILT_IN_DLCS.some(b => b.id === dlc.id)) {
                        AVAILABLE_DLCS[existingIdx] = dlc;
                    }
                } else {
                    AVAILABLE_DLCS.push(dlc);
                }
            });
        }
    } catch (e) {
        console.error("Failed to load custom DLCs", e);
    }
};

export const addCustomDLC = (dlc: DLCContent) => {
    // 1. Basic Validation
    if (!dlc.id || !dlc.name) {
        throw new Error("Invalid DLC: Missing ID or Name");
    }

    // 2. Add or Update
    const idx = AVAILABLE_DLCS.findIndex(d => d.id === dlc.id);
    if (idx >= 0) {
        // If it's a built-in DLC, prevent overwrite (optional safety)
        if (BUILT_IN_DLCS.some(b => b.id === dlc.id)) {
             throw new Error("Cannot overwrite built-in DLC.");
        }
        AVAILABLE_DLCS[idx] = dlc;
    } else {
        AVAILABLE_DLCS.push(dlc);
    }

    // 3. Persist
    saveCustomDLCs();
};

export const removeCustomDLC = (id: string) => {
    // Cannot remove built-ins
    if (BUILT_IN_DLCS.some(d => d.id === id)) return;

    const idx = AVAILABLE_DLCS.findIndex(d => d.id === id);
    if (idx > -1) {
        AVAILABLE_DLCS.splice(idx, 1);
        saveCustomDLCs();
    }
};

const saveCustomDLCs = () => {
    // Filter out built-ins before saving
    const customOnly = AVAILABLE_DLCS.filter(d => !BUILT_IN_DLCS.some(b => b.id === d.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
};

// --- LOADER LOGIC ---

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
