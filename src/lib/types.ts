// =============================================================================
// Types for the Dating Pool Calculator
// Based on ABS Census 2021 demographic categories
// =============================================================================

export type Sex = 'male' | 'female';

export type AgeGroup = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

export const AGE_GROUPS: AgeGroup[] = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

/** Age span (in years) for each age group */
export const AGE_GROUP_SPANS: Record<AgeGroup, [number, number]> = {
  '18-24': [18, 24],
  '25-34': [25, 34],
  '35-44': [35, 44],
  '45-54': [45, 54],
  '55-64': [55, 64],
  '65+':   [65, 85], // cap at 85 for calculation purposes
};

export interface CityInfo {
  id: string;
  name: string;
}

export const CITIES: CityInfo[] = [
  { id: 'sydney', name: 'Sydney' },
  { id: 'melbourne', name: 'Melbourne' },
  { id: 'brisbane', name: 'Brisbane' },
  { id: 'perth', name: 'Perth' },
  { id: 'adelaide', name: 'Adelaide' },
  { id: 'canberra', name: 'Canberra' },
  { id: 'hobart', name: 'Hobart' },
  { id: 'darwin', name: 'Darwin' },
];

export interface EthnicityInfo {
  id: string;
  name: string;
}

export const ETHNICITIES: EthnicityInfo[] = [
  { id: 'european', name: 'European' },
  { id: 'east_asian', name: 'East Asian' },
  { id: 'south_asian', name: 'South Asian' },
  { id: 'southeast_asian', name: 'Southeast Asian' },
  { id: 'middle_eastern', name: 'Middle Eastern' },
  { id: 'african', name: 'African' },
  { id: 'indigenous', name: 'Indigenous Australian' },
  { id: 'pacific_islander', name: 'Pacific Islander' },
  { id: 'latin_american', name: 'Latin American' },
  { id: 'other', name: 'Other' },
];

export interface IncomeBracketInfo {
  id: string;
  label: string;
  minAnnual: number;
}

export const INCOME_BRACKETS: IncomeBracketInfo[] = [
  { id: 'any',  label: 'Any income',   minAnnual: 0 },
  { id: '30k',  label: '$30,000+',     minAnnual: 30000 },
  { id: '50k',  label: '$50,000+',     minAnnual: 50000 },
  { id: '75k',  label: '$75,000+',     minAnnual: 75000 },
  { id: '100k', label: '$100,000+',    minAnnual: 100000 },
  { id: '150k', label: '$150,000+',    minAnnual: 150000 },
  { id: '200k', label: '$200,000+',    minAnnual: 200000 },
];

// ---- User Preferences (form input) ----

export interface UserPreferences {
  /** Gender the user is interested in */
  interestedInSex: Sex | 'any';
  /** Minimum age */
  ageMin: number;
  /** Maximum age */
  ageMax: number;
  /** Minimum height in cm */
  heightMin: number;
  /** Maximum height in cm */
  heightMax: number;
  /** Minimum income */
  incomeMin: number;
  /** Maximum income */
  incomeMax: number;
  /** Selected ethnicity IDs (empty array = any) */
  ethnicities: string[];
  /** City ID ('any' for all of Australia) */
  city: string;
  /** Only count single people? */
  singleOnly: boolean;
}

// ---- Calculation Results ----

export interface FilterBreakdown {
  /** Internal filter name */
  filterName: string;
  /** Human-readable label for this filter */
  label: string;
  /** Pool size before this filter */
  poolBefore: number;
  /** Pool size after this filter */
  poolAfter: number;
  /** Percentage of pool kept */
  percentKept: number;
}

export interface CalculationResult {
  /** Total adult population of selected area */
  totalAdultPopulation: number;
  /** Number of people matching all criteria */
  matchingPopulation: number;
  /** Percentage of total that matches */
  percentage: number;
  /** Ordered list of how each filter narrowed the pool */
  breakdown: FilterBreakdown[];
  /** Personalized insights based on the user's filters */
  insights: string[];
  /** Fun comparison facts */
  funFacts: string[];
}
