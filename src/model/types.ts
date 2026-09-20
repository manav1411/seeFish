export type Gender = 'men' | 'women';
export type CityId = 'australia' | 'sydney' | 'melbourne' | 'brisbane' | 'perth' | 'adelaide' | 'canberra' | 'hobart' | 'darwin';
export interface Preferences {
  gender: Gender;
  city: CityId;
  age: [number, number];
  height: [number, number] | null;
  income: [number, number] | null;
  backgrounds: string[];
}
export interface Profile {
  gender: Gender | null;
  city: CityId | null;
  age: number | null;
  height: number | null;
  income: number | null;
  backgrounds: string[];
}
export interface Source { id: string; title: string; url: string; period: string; note: string }
export interface Insight { id: string; eyebrow: string; title: string; body: string }
export interface Estimate {
  estimate: number;
  range: [number, number];
  denominator: number;
  share: number;
  evidenceState: 'direct table' | 'modelled combination' | 'limited evidence' | 'illustrative scenario';
  rangeMeaning: string;
  assumptions: string[];
  sourceIds: string[];
  modelVersion: string;
  insights: Insight[];
}
export interface MutualEstimate {
  estimate: number;
  pool: number;
  denominator: number;
  share: number;
  fit: number;
  range: [number, number];
  orientationShare: number;
  factors: Array<{ id: string; label: string; detail: string }>;
  assumptions: string[];
  sourceIds: string[];
  evidenceState: 'illustrative scenario';
}
export interface DistributionBin { value: number; weight: number }
export interface City { id: CityId; name: string; label: string; x: number; y: number }
export const DISCLOSURE_VERSION = '2026-09-19-v1';
export const DEFAULT_PREFERENCES: Preferences = { gender: 'men', city: 'australia', age: [25, 38], height: null, income: null, backgrounds: [] };
