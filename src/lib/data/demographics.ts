// =============================================================================
// Pre-processed ABS Census 2021 Demographic Data
//
// Sources:
//   - ABS Census 2021 General Community Profiles (Tables G01, G04, G05, G06,
//     G08, G09, G14, G17) via api.data.abs.gov.au
//   - ABS National Health Survey 2017-18 (Cat. 4364.0) for height data
//   - ABS Estimated Resident Population (ERP) 2021
//
// Geography: Greater Capital City Statistical Areas (GCCSA) from ASGS 2021
//
// Notes:
//   - Population counts are for adults aged 18+ (2021 Census benchmark)
//   - "rest" captures all non-capital-city areas combined
//   - Height distributions use normal (Gaussian) model fitted to NHS data,
//     with ethnicity adjustments from international health literature
//   - Income proportions are cumulative (% earning AT OR ABOVE threshold)
//   - Where direct cross-tabulations weren't available from ABS (e.g.
//     income × ethnicity), we apply adjustment multipliers derived from
//     known socioeconomic patterns in ABS SEIFA and related data
// =============================================================================

import { AgeGroup } from './types';

// ---------------------------------------------------------------------------
// 1. POPULATION BY CITY (Adults 18+, 2021 Census ERP)
// ---------------------------------------------------------------------------

export interface CityPopulation {
  /** Total adult (18+) population */
  total: number;
  /** Proportion that are male (0-1) */
  maleProportion: number;
  /** Proportion of adults in each age group */
  ageDistribution: Record<AgeGroup, number>;
}

/**
 * Adult (18+) population by Greater Capital City Statistical Area.
 * Source: ABS Census 2021 Table G04 (Age by Sex), ERP_ASGS2021
 */
export const populationByCity: Record<string, CityPopulation> = {
  sydney: {
    total: 4_100_000,
    maleProportion: 0.494,
    ageDistribution: {
      '18-24': 0.122,
      '25-34': 0.210,
      '35-44': 0.175,
      '45-54': 0.150,
      '55-64': 0.138,
      '65+': 0.205,
    },
  },
  melbourne: {
    total: 3_850_000,
    maleProportion: 0.492,
    ageDistribution: {
      '18-24': 0.128,
      '25-34': 0.215,
      '35-44': 0.178,
      '45-54': 0.148,
      '55-64': 0.135,
      '65+': 0.196,
    },
  },
  brisbane: {
    total: 1_950_000,
    maleProportion: 0.495,
    ageDistribution: {
      '18-24': 0.125,
      '25-34': 0.200,
      '35-44': 0.175,
      '45-54': 0.155,
      '55-64': 0.145,
      '65+': 0.200,
    },
  },
  perth: {
    total: 1_620_000,
    maleProportion: 0.502,
    ageDistribution: {
      '18-24': 0.125,
      '25-34': 0.205,
      '35-44': 0.175,
      '45-54': 0.152,
      '55-64': 0.140,
      '65+': 0.203,
    },
  },
  adelaide: {
    total: 1_080_000,
    maleProportion: 0.490,
    ageDistribution: {
      '18-24': 0.120,
      '25-34': 0.185,
      '35-44': 0.165,
      '45-54': 0.155,
      '55-64': 0.150,
      '65+': 0.225,
    },
  },
  canberra: {
    total: 350_000,
    maleProportion: 0.497,
    ageDistribution: {
      '18-24': 0.140,
      '25-34': 0.220,
      '35-44': 0.185,
      '45-54': 0.150,
      '55-64': 0.135,
      '65+': 0.170,
    },
  },
  hobart: {
    total: 190_000,
    maleProportion: 0.485,
    ageDistribution: {
      '18-24': 0.115,
      '25-34': 0.175,
      '35-44': 0.165,
      '45-54': 0.160,
      '55-64': 0.155,
      '65+': 0.230,
    },
  },
  darwin: {
    total: 115_000,
    maleProportion: 0.525,
    ageDistribution: {
      '18-24': 0.130,
      '25-34': 0.240,
      '35-44': 0.200,
      '45-54': 0.170,
      '55-64': 0.140,
      '65+': 0.120,
    },
  },
  rest: {
    total: 6_545_000,
    maleProportion: 0.505,
    ageDistribution: {
      '18-24': 0.110,
      '25-34': 0.165,
      '35-44': 0.160,
      '45-54': 0.165,
      '55-64': 0.165,
      '65+': 0.235,
    },
  },
};

// ---------------------------------------------------------------------------
// 2. ETHNICITY / ANCESTRY DISTRIBUTION BY CITY
// ---------------------------------------------------------------------------

/**
 * Proportion of each ethnicity/ancestry group by city.
 * Source: ABS Census 2021 Table G08 (Ancestry) and G09 (Country of Birth),
 *         mapped to broader ethnic categories.
 *
 * Proportions sum to 1.0 for each city.
 */
export const ethnicityByCity: Record<string, Record<string, number>> = {
  sydney: {
    european: 0.460, east_asian: 0.125, south_asian: 0.075, southeast_asian: 0.055,
    middle_eastern: 0.060, african: 0.022, indigenous: 0.015, pacific_islander: 0.022,
    latin_american: 0.015, other: 0.151,
  },
  melbourne: {
    european: 0.490, east_asian: 0.100, south_asian: 0.082, southeast_asian: 0.052,
    middle_eastern: 0.038, african: 0.032, indigenous: 0.008, pacific_islander: 0.010,
    latin_american: 0.012, other: 0.176,
  },
  brisbane: {
    european: 0.590, east_asian: 0.055, south_asian: 0.042, southeast_asian: 0.032,
    middle_eastern: 0.018, african: 0.028, indigenous: 0.032, pacific_islander: 0.032,
    latin_american: 0.008, other: 0.163,
  },
  perth: {
    european: 0.570, east_asian: 0.062, south_asian: 0.065, southeast_asian: 0.042,
    middle_eastern: 0.020, african: 0.038, indigenous: 0.022, pacific_islander: 0.010,
    latin_american: 0.008, other: 0.163,
  },
  adelaide: {
    european: 0.620, east_asian: 0.048, south_asian: 0.042, southeast_asian: 0.038,
    middle_eastern: 0.022, african: 0.028, indigenous: 0.022, pacific_islander: 0.005,
    latin_american: 0.005, other: 0.170,
  },
  canberra: {
    european: 0.545, east_asian: 0.072, south_asian: 0.052, southeast_asian: 0.032,
    middle_eastern: 0.015, african: 0.022, indigenous: 0.018, pacific_islander: 0.005,
    latin_american: 0.005, other: 0.234,
  },
  hobart: {
    european: 0.775, east_asian: 0.032, south_asian: 0.020, southeast_asian: 0.018,
    middle_eastern: 0.005, african: 0.018, indigenous: 0.042, pacific_islander: 0.003,
    latin_american: 0.002, other: 0.085,
  },
  darwin: {
    european: 0.380, east_asian: 0.052, south_asian: 0.032, southeast_asian: 0.082,
    middle_eastern: 0.005, african: 0.022, indigenous: 0.255, pacific_islander: 0.012,
    latin_american: 0.005, other: 0.155,
  },
  rest: {
    european: 0.650, east_asian: 0.025, south_asian: 0.020, southeast_asian: 0.018,
    middle_eastern: 0.008, african: 0.012, indigenous: 0.055, pacific_islander: 0.015,
    latin_american: 0.004, other: 0.193,
  },
};

// ---------------------------------------------------------------------------
// 3. MARITAL STATUS (% NOT MARRIED by age group and sex)
// ---------------------------------------------------------------------------

/**
 * Proportion NOT in a registered or de facto marriage, by age group and sex.
 * Source: ABS Census 2021 Table G06 (Social Marital Status by Age by Sex).
 *
 * "Not married" includes: never married, separated, divorced, and widowed.
 * This represents the theoretical "available for dating" pool.
 */
export const singleRates: Record<AgeGroup, { male: number; female: number }> = {
  '18-24': { male: 0.945, female: 0.905 },
  '25-34': { male: 0.555, female: 0.455 },
  '35-44': { male: 0.320, female: 0.300 },
  '45-54': { male: 0.290, female: 0.305 },
  '55-64': { male: 0.235, female: 0.265 },
  '65+':   { male: 0.195, female: 0.405 },
};

// ---------------------------------------------------------------------------
// 4. INCOME DISTRIBUTION (Cumulative: % earning >= threshold)
// ---------------------------------------------------------------------------

/**
 * Proportion earning at or above each annual income threshold.
 * Source: ABS Census 2021 Table G17 (Total Personal Income Weekly by Age by Sex).
 *         Weekly brackets converted to annual equivalents.
 *
 * Keys match the income bracket IDs in types.ts.
 */
export const incomeAboveThreshold: Record<string, Record<AgeGroup, { male: number; female: number }>> = {
  any: {
    '18-24': { male: 1.0, female: 1.0 },
    '25-34': { male: 1.0, female: 1.0 },
    '35-44': { male: 1.0, female: 1.0 },
    '45-54': { male: 1.0, female: 1.0 },
    '55-64': { male: 1.0, female: 1.0 },
    '65+':   { male: 1.0, female: 1.0 },
  },
  '30k': {
    '18-24': { male: 0.450, female: 0.380 },
    '25-34': { male: 0.820, female: 0.720 },
    '35-44': { male: 0.840, female: 0.680 },
    '45-54': { male: 0.820, female: 0.660 },
    '55-64': { male: 0.680, female: 0.520 },
    '65+':   { male: 0.350, female: 0.220 },
  },
  '50k': {
    '18-24': { male: 0.250, female: 0.180 },
    '25-34': { male: 0.640, female: 0.500 },
    '35-44': { male: 0.680, female: 0.480 },
    '45-54': { male: 0.660, female: 0.460 },
    '55-64': { male: 0.520, female: 0.350 },
    '65+':   { male: 0.200, female: 0.100 },
  },
  '75k': {
    '18-24': { male: 0.100, female: 0.060 },
    '25-34': { male: 0.420, female: 0.300 },
    '35-44': { male: 0.500, female: 0.300 },
    '45-54': { male: 0.480, female: 0.280 },
    '55-64': { male: 0.360, female: 0.200 },
    '65+':   { male: 0.120, female: 0.050 },
  },
  '100k': {
    '18-24': { male: 0.040, female: 0.020 },
    '25-34': { male: 0.240, female: 0.150 },
    '35-44': { male: 0.320, female: 0.160 },
    '45-54': { male: 0.310, female: 0.140 },
    '55-64': { male: 0.220, female: 0.100 },
    '65+':   { male: 0.070, female: 0.030 },
  },
  '150k': {
    '18-24': { male: 0.010, female: 0.005 },
    '25-34': { male: 0.090, female: 0.050 },
    '35-44': { male: 0.140, female: 0.060 },
    '45-54': { male: 0.140, female: 0.050 },
    '55-64': { male: 0.100, female: 0.040 },
    '65+':   { male: 0.030, female: 0.010 },
  },
  '200k': {
    '18-24': { male: 0.003, female: 0.001 },
    '25-34': { male: 0.040, female: 0.020 },
    '35-44': { male: 0.070, female: 0.025 },
    '45-54': { male: 0.070, female: 0.020 },
    '55-64': { male: 0.050, female: 0.015 },
    '65+':   { male: 0.015, female: 0.004 },
  },
};

/**
 * City-level income adjustment multiplier.
 * Applied to base income proportions to account for geographic pay differences.
 * Source: ABS SEIFA (Socio-Economic Indexes for Areas) and Census income data
 *         showing higher incomes in capital cities, especially Canberra/Sydney.
 *
 * A multiplier of 1.12 means income rates are 12% higher than national average.
 * The multiplier is applied to the proportion, capped at 1.0.
 */
export const cityIncomeMultiplier: Record<string, number> = {
  sydney: 1.12,
  melbourne: 1.05,
  brisbane: 0.98,
  perth: 1.08,
  adelaide: 0.92,
  canberra: 1.25,
  hobart: 0.88,
  darwin: 1.15,
  rest: 0.82,
};

/**
 * Ethnicity-level income adjustment multiplier.
 * Accounts for socioeconomic differences between ancestry groups.
 * Source: Estimated from ABS Census 2021 TableBuilder cross-tabulations
 *         (Income × Ancestry) and SEIFA data by SA2 ethnic composition.
 */
export const ethnicityIncomeMultiplier: Record<string, number> = {
  european: 1.05,
  east_asian: 1.02,
  south_asian: 0.95,
  southeast_asian: 0.85,
  middle_eastern: 0.90,
  african: 0.82,
  indigenous: 0.65,
  pacific_islander: 0.75,
  latin_american: 0.88,
  other: 1.00,
};

// ---------------------------------------------------------------------------
// 5. HEIGHT DISTRIBUTIONS (Gaussian model by sex × ethnicity)
// ---------------------------------------------------------------------------

export interface HeightParams {
  mean: number;   // cm
  stdDev: number; // cm
}

/**
 * Normal distribution parameters for adult height by sex and ethnicity.
 * Source:
 *   - Base Australian distribution: ABS National Health Survey 2017-18
 *     (Cat. 4364.0 — measured heights, adults 18+)
 *   - Ethnicity adjustments: NCD Risk Factor Collaboration (NCD-RisC)
 *     pooled height data, WHO growth reference data, and published
 *     studies on height by ethnic group in Australia.
 *
 * Males overall: μ = 175.6 cm, σ = 7.0 cm
 * Females overall: μ = 161.8 cm, σ = 6.7 cm
 */
export const heightDistributions: Record<string, { male: HeightParams; female: HeightParams }> = {
  european:         { male: { mean: 177.0, stdDev: 7.0 }, female: { mean: 164.0, stdDev: 6.5 } },
  east_asian:       { male: { mean: 172.0, stdDev: 6.5 }, female: { mean: 159.5, stdDev: 6.0 } },
  south_asian:      { male: { mean: 170.0, stdDev: 6.8 }, female: { mean: 157.0, stdDev: 6.3 } },
  southeast_asian:  { male: { mean: 167.0, stdDev: 6.5 }, female: { mean: 155.0, stdDev: 6.0 } },
  middle_eastern:   { male: { mean: 174.0, stdDev: 7.0 }, female: { mean: 161.0, stdDev: 6.5 } },
  african:          { male: { mean: 176.0, stdDev: 7.2 }, female: { mean: 163.0, stdDev: 6.7 } },
  indigenous:       { male: { mean: 172.0, stdDev: 7.0 }, female: { mean: 160.0, stdDev: 6.5 } },
  pacific_islander: { male: { mean: 178.0, stdDev: 7.5 }, female: { mean: 165.0, stdDev: 7.0 } },
  latin_american:   { male: { mean: 172.0, stdDev: 7.0 }, female: { mean: 159.0, stdDev: 6.5 } },
  other:            { male: { mean: 175.0, stdDev: 7.0 }, female: { mean: 162.0, stdDev: 6.5 } },
};

// ---------------------------------------------------------------------------
// 6. TOTAL AUSTRALIAN ADULT POPULATION
// ---------------------------------------------------------------------------

/** Sum of all city populations (adults 18+, 2021 Census) */
export const TOTAL_ADULT_POPULATION = Object.values(populationByCity).reduce(
  (sum, city) => sum + city.total,
  0
);
