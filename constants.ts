
import { AssetCategory, Task } from './types';

export const APP_NAME = "HomeHealth";

export const DEFAULT_TASKS_CONDO: Partial<Task>[] = [
  { 
    title: "Check HVAC Filter", 
    description: "Inspect and replace if dirty", 
    importance: "A dirty filter restricts airflow, increasing energy costs and potentially damaging your HVAC unit.",
    priority: 'HIGH', 
    recurring: true 
  },
  { 
    title: "Test Smoke Alarms", 
    description: "Press test button on all alarms", 
    importance: "Ensures alarms are functional in case of emergency. Batteries can fail without warning.",
    priority: 'HIGH', 
    recurring: true 
  },
  { 
    title: "Inspect Dryer Vent", 
    description: "Clear lint from external vent", 
    importance: "Lint buildup is a leading cause of household fires and reduces dryer efficiency.",
    priority: 'MEDIUM', 
    recurring: true 
  },
];

export const DEFAULT_TASKS_HOUSE: Partial<Task>[] = [
  ...DEFAULT_TASKS_CONDO,
  // Existing defaults
  { 
    title: "Clean Gutters", 
    description: "Remove leaves and debris", 
    importance: "Clogged gutters cause water to overflow, leading to foundation damage and roof rot.",
    priority: 'MEDIUM', 
    recurring: true 
  },
  { 
    title: "Inspect Roof", 
    description: "Check for missing shingles or damage", 
    importance: "Catching small leaks early prevents expensive water damage to ceilings and insulation.",
    priority: 'HIGH', 
    recurring: true 
  },
  { 
    title: "Winterize Hose Bibs", 
    description: "Drain outdoor faucets", 
    importance: "Water left in pipes can freeze and burst, causing significant flooding and plumbing damage.",
    priority: 'HIGH', 
    recurring: true 
  },

  // General Annual/Periodic
  { title: "Lubricate Garage Door Tracks", description: "Lubricate tracks - once per year", importance: "Reduces noise and strain on the opener motor, extending its lifespan.", priority: 'MEDIUM', recurring: true },
  { title: "Change Furnace Filter", description: "Change filter - once every 3 months", importance: "Maintains air quality and system efficiency.", priority: 'HIGH', recurring: true },

  // Late Fall Tasks
  { title: "Bring in Garden Hoses", description: "Bring back and garage hoses into house", importance: "Prevents rubber from cracking due to freezing temperatures.", priority: 'MEDIUM', season: 'Late Fall' },
  { title: "Clean Outside Windows (Fall)", description: "Clean outside windows", importance: "Maximizes natural light during darker winter months.", priority: 'LOW', season: 'Late Fall' },
  { title: "Remove Dead Leaves", description: "Remove dead leaves from lawn as needed", importance: "Thick layers of leaves can smother grass and promote mold growth.", priority: 'MEDIUM', season: 'Late Fall' },
  { title: "Check Window Seals", description: "Check for drafts and seal gaps", importance: "Prevents heat loss, lowering heating bills.", priority: 'MEDIUM', season: 'Late Fall' },
  { title: "Service Lawn Mower", description: "Change oil in lawn mower, empty gas", importance: "Old gas can gum up the carburetor, preventing the mower from starting in spring.", priority: 'MEDIUM', season: 'Late Fall' },
  { title: "Stabilize Fuel", description: "Add fuel stabilizer to gas cans", importance: "Keeps fuel fresh for up to 24 months.", priority: 'MEDIUM', season: 'Late Fall' },
  { title: "Winterize A/C", description: "Cover air conditioner, turn off circuit breaker", importance: "Protects the unit from snow, ice, and debris damage.", priority: 'HIGH', season: 'Late Fall' },
  { title: "Store Outdoor Items", description: "Store outside furniture and carpet", importance: "Extends the life of your furniture by protecting it from harsh weather.", priority: 'LOW', season: 'Late Fall' },

  // Late Spring Tasks
  { title: "Install Garden Hoses", description: "Install back and garage hoses", importance: "Prepare for watering lawn and garden.", priority: 'MEDIUM', season: 'Late Spring' },
  { title: "Clean Eavestroughs", description: "Clean out eavestrough corners", importance: "Ensures spring rains drain away from your foundation.", priority: 'HIGH', season: 'Late Spring' },
  { title: "Clean Outside Windows (Spring)", description: "Clean outside windows", importance: "Removes winter grime and salt.", priority: 'LOW', season: 'Late Spring' },
  { title: "Clean HVAC Screen", description: "Clean outside screen for HVAC", importance: "Ensures proper airflow for A/C efficiency.", priority: 'MEDIUM', season: 'Late Spring' },
  { title: "Service Snowblower", description: "Change oil in snowblower, empty gas", importance: "Prepare machine for long-term storage.", priority: 'MEDIUM', season: 'Late Spring' },
  { title: "Prepare A/C", description: "Uncover air conditioner, turn on circuit breaker", importance: "Get ready for summer cooling.", priority: 'HIGH', season: 'Late Spring' },
];

export const ASSET_TASK_MAP: Record<AssetCategory, Partial<Task>[]> = {
  [AssetCategory.DISHWASHER]: [
    { title: "Clean Dishwasher Filter", description: "Remove and rinse filter at bottom of tub", importance: "Prevents food buildup which causes odors and poor cleaning performance.", priority: 'MEDIUM' },
    { title: "Check Door Seals", description: "Wipe down seals and check for cracks", importance: "Ensures a watertight seal to prevent leaks.", priority: 'LOW' }
  ],
  [AssetCategory.FRIDGE]: [
    { title: "Clean Coils", description: "Vacuum dust from coils behind/under fridge", importance: "Dusty coils force the compressor to work harder, shortening its life and increasing energy bills.", priority: 'MEDIUM' },
    { title: "Replace Water Filter", description: "Replace internal water filter", importance: "Ensures clean drinking water and prevents mineral buildup.", priority: 'MEDIUM' }
  ],
  [AssetCategory.HVAC]: [
    { title: "Replace Air Filter", description: "Replace main unit filter", importance: "Critical for system airflow and air quality.", priority: 'HIGH' },
    { title: "Professional Tune-up", description: "Schedule annual maintenance", importance: "Identifies potential failures before extreme weather hits.", priority: 'MEDIUM' }
  ],
  [AssetCategory.SMOKE_ALARM]: [
    { title: "Replace Batteries", description: "Change backup batteries", importance: "Ensures operation during power outages.", priority: 'HIGH' }
  ],
  [AssetCategory.ROOF]: [],
  [AssetCategory.GUTTERS]: [],
  [AssetCategory.HOSE_BIBS]: [],
  [AssetCategory.OTHER]: []
};
