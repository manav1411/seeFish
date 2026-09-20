import type { Gender } from './types';

/**
 * Published orientation identity rates used as compatibility proxies. These
 * are population identity rates, not estimates of who is available or
 * interested in a particular person.
 */
export const SAME_SEX_BY_AGE: Array<{ maxAge: number; share: number }> = [
  { maxAge: 24, share: 0.076 },
  { maxAge: 34, share: 0.056 },
  { maxAge: Infinity, share: 0.017 },
];

export const OPPOSITE_SEX_SHARE = 0.966;
export const MUTUAL_BASELINE = 0.35;

export type MutualScenario = {
  baseline: number;
  ageFloor: number;
  heightFloor: number;
  incomeFloor: number;
  backgroundFloor: number;
  backgroundStrength: number;
};

/**
 * The three scenarios are authored sensitivity cases. They are not fitted
 * confidence intervals and should not be read as observed probabilities.
 */
export const MUTUAL_SCENARIOS: Record<'low' | 'central' | 'high', MutualScenario> = {
  low: {
    baseline: 0.25,
    ageFloor: 0.15,
    heightFloor: 0.75,
    incomeFloor: 0.88,
    backgroundFloor: 0.82,
    backgroundStrength: 0.18,
  },
  central: {
    baseline: MUTUAL_BASELINE,
    ageFloor: 0.25,
    heightFloor: 0.8,
    incomeFloor: 0.9,
    backgroundFloor: 0.85,
    backgroundStrength: 0.15,
  },
  high: {
    baseline: 0.45,
    ageFloor: 0.35,
    heightFloor: 0.85,
    incomeFloor: 0.92,
    backgroundFloor: 0.88,
    backgroundStrength: 0.12,
  },
};

export const MUTUAL_SOURCE_IDS = [
  'abs-lgbti-2022',
  'abs-census-g17',
  'abs-census-g08',
  'abs-nhs-height',
  'eastwick-2025',
  'whyte-2021',
  'stulp-2013',
  'valentova-2014',
  'fisman-2008',
  'prestage-2019',
] as const;

export const MUTUAL_ASSUMPTIONS = [
  'This is an illustrative reciprocal-interest scenario over a Census-derived target pool, not a count of people who are single, available, or interested in the visitor.',
  'The 35% central baseline and all factor strengths are authored sensitivity assumptions; no study supplies a personal acceptance probability for these combined fields.',
  'ABS 2022 same-sex rates combine gay/lesbian and bisexual identity in pooled age bands because an age-by-sex joint table is unavailable. Bisexual people are retained in both same-sex and opposite-sex scenarios.',
  'Orientation identity rates are used as population proxies. They do not measure availability, attraction, or reciprocity.',
  'Age similarity uses a symmetric 12-year Gaussian scale. It is a smooth assumption, so people outside the selected age range retain a non-zero scenario weight.',
  'Height uses NHS age and sex normal distributions, conditioned on the selected target-height range. A 15 cm soft scale and a modest 7 cm opposite-sex target-height offset are authored assumptions; same-sex height uses a symmetric similarity curve.',
  'Income is the weakest modifier. Published income bands are used for target-cell weights and band midpoints for a bounded log-distance comparison. Missing income is neutral.',
  'Ancestry uses local ABS margins. Multiple categories are deduplicated; without joint ancestry cells, union results use independence midpoints and Frechet bounds as sensitivity context.',
  'The shared-background modifier is deliberately half-strength in same-sex scenarios because the available evidence is not calibrated to this combined model.',
  'A different city is assigned a 0.6 reach scenario. For a national search, the visitor city receives its observed selected-cohort share and the remainder receives the remote reach weight.',
];

export function sameSexShareForAge(age: number): number {
  return SAME_SEX_BY_AGE.find(band => age <= band.maxAge)?.share ?? SAME_SEX_BY_AGE.at(-1)!.share;
}

export function orientationShareForAge(age: number, profileGender: Gender | null, targetGender: Gender): number {
  if (profileGender == null) return 1;
  return profileGender === targetGender ? sameSexShareForAge(age) : OPPOSITE_SEX_SHARE;
}
