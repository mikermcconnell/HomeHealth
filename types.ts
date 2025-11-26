
export type HomeType = 'CONDO' | 'HOUSE';

export enum AssetCategory {
  FRIDGE = 'Refrigerator',
  DISHWASHER = 'Dishwasher',
  HVAC = 'HVAC',
  SMOKE_ALARM = 'Smoke Alarm',
  ROOF = 'Roof',
  GUTTERS = 'Gutters',
  HOSE_BIBS = 'Hose Bibs',
  OTHER = 'Other'
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  brand: string;
  model: string;
  image?: string; // Data URL
  manual?: string; // Data URL or filename (uploaded)
  manualUrl?: string; // URL found via search
  purchaseDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  importance?: string; // Why this task matters
  dueDate: string; // ISO Date string
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assetId?: string;
  recurring?: boolean;
  season?: string; // e.g., 'Late Fall', 'Late Spring'
}

export interface ImprovementProject {
  id: string;
  title: string;
  description: string;
  estimatedCost: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  category: 'AESTHETIC' | 'FUNCTIONAL' | 'ENERGY_SAVING' | 'SMART_HOME';
}

export interface UserState {
  isOnboarded: boolean;
  homeType: HomeType | null;
  score: number;
}
