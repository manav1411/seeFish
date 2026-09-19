import rawModel from '../../data/abs-2021-model.json';
import type { City, CityId, DistributionBin, Estimate, Gender, Insight, Preferences, Source } from './types';

type Cell = { a: number; s: 'M' | 'F'; g: string; l: number | null; h: number | null; t: number; p: number; n: number };
type Model = {
  version: string;
  cells: Record<CityId, Cell[]>;
  ancestry: Record<CityId, Record<string, number>>;
};
const MODEL = rawModel as unknown as Model;

export const MODEL_VERSION = MODEL.version;

export const CITIES: City[] = [
  { id: 'australia', name: 'Australia', label: 'Australia', x: 49, y: 48 },
  { id: 'sydney', name: 'Sydney', label: 'Greater Sydney', x: 82, y: 67 },
  { id: 'melbourne', name: 'Melbourne', label: 'Greater Melbourne', x: 73, y: 82 },
  { id: 'brisbane', name: 'Brisbane', label: 'Greater Brisbane', x: 86, y: 48 },
  { id: 'perth', name: 'Perth', label: 'Greater Perth', x: 18, y: 62 },
  { id: 'adelaide', name: 'Adelaide', label: 'Greater Adelaide', x: 59, y: 73 },
  { id: 'canberra', name: 'Canberra', label: 'Australian Capital Territory', x: 78, y: 71 },
  { id: 'hobart', name: 'Hobart', label: 'Greater Hobart', x: 74, y: 94 },
  { id: 'darwin', name: 'Darwin', label: 'Greater Darwin', x: 48, y: 14 },
];

export const BACKGROUNDS = [
  { id: 'australian', label: 'Australian ancestry' },
  { id: 'aboriginal', label: 'Australian Aboriginal ancestry' },
  { id: 'chinese', label: 'Chinese ancestry' },
  { id: 'english', label: 'English ancestry' },
  { id: 'filipino', label: 'Filipino ancestry' },
  { id: 'greek', label: 'Greek ancestry' },
  { id: 'indian', label: 'Indian ancestry' },
  { id: 'irish', label: 'Irish ancestry' },
  { id: 'italian', label: 'Italian ancestry' },
  { id: 'lebanese', label: 'Lebanese ancestry' },
  { id: 'vietnamese', label: 'Vietnamese ancestry' },
] as const;

export const SOURCES: Source[] = [
  {
    id: 'abs-census-g17',
    title: '2021 Census General Community Profile — G17 and G04',
    url: 'https://www.abs.gov.au/census/find-census-data/datapacks',
    period: 'Census night, 10 August 2021',
    note: 'Observed age, sex and total personal income cells for Greater Capital City Statistical Areas. Income is before tax and includes sources beyond wages.',
  },
  {
    id: 'abs-census-g08',
    title: '2021 Census General Community Profile — G08 selected ancestry',
    url: 'https://www.abs.gov.au/census/find-census-data/datapacks',
    period: 'Census night, 10 August 2021',
    note: 'Observed ancestry margins. People may report up to two ancestries, so selected categories can overlap.',
  },
  {
    id: 'abs-nhs-height',
    title: 'National Health Survey: height by age and sex',
    url: 'https://www.abs.gov.au/statistics/health/health-conditions-and-risks/national-health-survey/2022',
    period: '2022',
    note: 'Measured and imputed national height evidence. The browser curve uses disclosed distribution fallbacks because city-level distributions are unavailable.',
  },
];

const sexCode = (gender: Gender): 'M' | 'F' => gender === 'men' ? 'M' : 'F';
const erf = (x: number) => {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-a * a);
  return sign * y;
};
const normalCdf = (x: number, mean: number, sd: number) => 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
const heightParameters = (gender: Gender, age: number, spread: 'central' | 'narrow' | 'wide' = 'central') => {
  // Published NHS 2022 Table 8.1 means, used at their published age resolution.
  const maleMeans = age <= 24 ? 177.4 : age <= 34 ? 176.4 : age <= 44 ? 175.6 : age <= 54 ? 175.6 : age <= 64 ? 173.6 : age <= 74 ? 172.3 : 170.2;
  const femaleMeans = age <= 24 ? 162.9 : age <= 34 ? 163.4 : age <= 44 ? 162.9 : age <= 54 ? 162.5 : age <= 64 ? 160.7 : age <= 74 ? 158.7 : 157.1;
  const spreads = gender === 'men' ? { narrow: 6, central: 7.2, wide: 8.5 } : { narrow: 5.5, central: 6.7, wide: 8 };
  return { mean: gender === 'men' ? maleMeans : femaleMeans, sd: spreads[spread] };
};
const heightProbability = (range: [number, number] | null, gender: Gender, age: number, spread: 'central' | 'narrow' | 'wide' = 'central') => {
  if (!range) return 1;
  const { mean, sd } = heightParameters(gender, age, spread);
  return Math.max(0, normalCdf(range[1] + 0.5, mean, sd) - normalCdf(range[0] - 0.5, mean, sd));
};
const incomeProbability = (range: [number, number] | null, cell: Cell) => {
  if (range == null) return 1;
  if (cell.l == null) return 0; // Not stated cannot be assumed to pass a selected range.
  const [low, high] = range;
  const cellHigh = cell.h ?? high; // $182k+ is the open-ended top band.
  const overlapLow = Math.max(cell.l, low);
  const overlapHigh = Math.min(cellHigh, high);
  if (overlapHigh < overlapLow) return 0;
  return Math.max(0, Math.min(1, (overlapHigh - overlapLow + 1) / (cellHigh - cell.l + 1)));
};

type BackgroundScenario = { midpoint: number; low: number; high: number };
const backgroundScenario = (city: CityId, selected: string[]): BackgroundScenario => {
  const rates = selected.map(id => MODEL.ancestry[city]?.[id]).filter((v): v is number => Number.isFinite(v));
  if (!rates.length) return { midpoint: 1, low: 1, high: 1 };
  // With no joint ancestry table, independence is only a midpoint scenario. The bounds
  // are the Frechet bounds for the union of the selected, potentially overlapping responses.
  const midpoint = 1 - rates.reduce((p, rate) => p * (1 - rate), 1);
  const unionLow = Math.max(...rates);
  const unionHigh = Math.min(1, rates.reduce((sum, rate) => sum + rate, 0));
  return { midpoint, low: unionLow, high: unionHigh };
};

type ExcludedField = 'age' | 'height' | 'income' | null;
const weightedCount = (preferences: Preferences, exclude: ExcludedField = null) => {
  const sex = sexCode(preferences.gender);
  let count = 0;
  for (const cell of MODEL.cells[preferences.city]) {
    if (cell.s !== sex) continue;
    if (exclude !== 'age' && (cell.a < preferences.age[0] || cell.a > preferences.age[1])) continue;
    const income = exclude === 'income' ? 1 : incomeProbability(preferences.income, cell);
    const height = exclude === 'height' ? 1 : heightProbability(preferences.height, preferences.gender, cell.a);
    count += cell.n * income * height;
  }
  return count;
};
const adultDenominator = (preferences: Preferences) => {
  const sex = sexCode(preferences.gender);
  return MODEL.cells[preferences.city].reduce((sum, cell) => sum + (cell.s === sex ? cell.n : 0), 0);
};

const demographicSensitivityBounds = (preferences: Preferences): [number, number] => {
  const sex = sexCode(preferences.gender);
  const groups = new Map<string, Cell[]>();
  for (const cell of MODEL.cells[preferences.city]) {
    if (cell.s !== sex) continue;
    const key = `${cell.s}|${cell.g}|${cell.l}|${cell.h}`;
    groups.set(key, [...(groups.get(key) || []), cell]);
  }
  let low = 0;
  let high = 0;
  for (const cells of groups.values()) {
    const selected = cells.filter(cell => cell.a >= preferences.age[0] && cell.a <= preferences.age[1]);
    if (!selected.length) continue;
    const { t, p } = cells[0];
    const selectedPopulation = selected.reduce((sum, cell) => sum + (t ? cell.n * p / t : 0), 0);
    const incomeShare = incomeProbability(preferences.income, cells[0]);
    if (incomeShare === 0) continue;
    // If a selected range cuts a published income band, the source does not
    // locate people within that band, so its contribution ranges from none to all.
    const eligibleIncomeLow = incomeShare === 1 ? t : 0;
    const eligibleIncomeHigh = t;
    const ageLow = Math.max(0, eligibleIncomeLow - (p - selectedPopulation));
    const ageHigh = Math.min(eligibleIncomeHigh, selectedPopulation);
    if (!preferences.height) {
      low += ageLow;
      high += ageHigh;
      continue;
    }
    const probabilities = selected.flatMap(cell => (['narrow', 'central', 'wide'] as const)
      .map(spread => heightProbability(preferences.height, preferences.gender, cell.a, spread)));
    low += ageLow * Math.min(...probabilities);
    high += ageHigh * Math.max(...probabilities);
  }
  // Include the two alternative, disclosed height spreads as model variants.
  if (preferences.height) {
    for (const spread of ['narrow', 'wide'] as const) {
      let variant = 0;
      for (const cell of MODEL.cells[preferences.city]) {
        if (cell.s !== sex || cell.a < preferences.age[0] || cell.a > preferences.age[1]) continue;
        variant += cell.n * incomeProbability(preferences.income, cell) * heightProbability(preferences.height, preferences.gender, cell.a, spread);
      }
      low = Math.min(low, variant);
      high = Math.max(high, variant);
    }
  }
  return [Math.max(0, low), Math.max(low, high)];
};

const cityName = (id: CityId) => CITIES.find(c => c.id === id)?.label || id;
const makeInsights = (preferences: Preferences, estimate: number, denominator: number): Insight[] => {
  const byAge = new Map<number, number>();
  for (const cell of MODEL.cells[preferences.city]) {
    if (cell.s !== sexCode(preferences.gender) || cell.a < preferences.age[0] || cell.a > preferences.age[1]) continue;
    byAge.set(cell.a, (byAge.get(cell.a) || 0) + cell.n * incomeProbability(preferences.income, cell) * heightProbability(preferences.height, preferences.gender, cell.a));
  }
  const ageTotal = [...byAge.values()].reduce((sum, n) => sum + n, 0);
  let running = 0;
  let medianAge = preferences.age[0];
  for (const [age, n] of [...byAge].sort((a, b) => a[0] - b[0])) {
    running += n;
    if (running >= ageTotal / 2) { medianAge = age; break; }
  }
  const comparisonCity: CityId = preferences.city === 'australia' ? 'sydney' : 'australia';
  const comparisonPreferences = { ...preferences, city: comparisonCity, backgrounds: [] };
  const comparison = weightedCount(comparisonPreferences) * backgroundScenario(comparisonCity, preferences.backgrounds).midpoint;
  const insights: Insight[] = [{
    id: 'shape', eyebrow: 'Your pool', title: `${Math.round(estimate / Math.max(1, denominator) * 100)} in every 100`,
    body: `Within ${cityName(preferences.city)}, that is the modelled share of ${preferences.gender} aged 18–80 after your selected demographic filters.`,
  }, {
    id: 'age-centre', eyebrow: 'The middle of the shoal', title: `Around age ${medianAge}`,
    body: `Half of the people in this estimate are younger than about ${medianAge}, and half are older, within your chosen age window.`,
  }, {
    id: 'geography', eyebrow: 'A change of scale', title: `About ${formatCount(comparison)} in ${cityName(comparisonCity)}`,
    body: `That is the same set of choices in ${cityName(comparisonCity)}, using the same 2021 population reference.`,
  }];
  if (preferences.backgrounds.length) insights[2] = {
    id: 'ancestry', eyebrow: 'The widest unknown', title: 'Ancestry is a bounded scenario',
    body: 'ABS gives a local ancestry margin, but not its overlap with every other filter. The result range keeps that missing relationship visible.',
  };
  else if (preferences.height) insights[2] = {
    id: 'height', eyebrow: 'Measured across Australia', title: 'Height varies with age',
    body: 'The curve uses national measured averages for each age group. The range also tries narrower and wider spreads because ABS does not publish the full distribution.',
  };
  return insights;
};

export function calculate(preferences: Preferences): Estimate {
  const base = weightedCount(preferences);
  const background = backgroundScenario(preferences.city, preferences.backgrounds);
  const denominator = adultDenominator(preferences);
  const ageCohort = weightedCount({ ...preferences, income: null, height: null, backgrounds: [] });
  const [demographicLow, demographicHigh] = demographicSensitivityBounds(preferences);
  const ancestryUniverse = MODEL.ancestry[preferences.city]?._persons || denominator;
  const baseCapped = Math.min(base, ageCohort, denominator, ancestryUniverse);
  const estimate = Math.max(0, Math.min(baseCapped, baseCapped * background.midpoint));
  // Actual Fréchet intersection bounds: the selected demographic cohort and
  // the ancestry union both live within the published all-persons universe.
  const low = preferences.backgrounds.length
    ? Math.max(0, demographicLow + background.low * ancestryUniverse - ancestryUniverse)
    : demographicLow;
  const high = preferences.backgrounds.length
    ? Math.min(demographicHigh, background.high * ancestryUniverse)
    : demographicHigh;
  const boundedLow = Math.min(estimate, low, ageCohort, denominator);
  const boundedHigh = Math.max(estimate, Math.min(high, ageCohort, denominator));
  const roundedEstimate = Math.round(estimate);
  const roundedDenominator = Math.round(denominator);
  const sourceIds = ['abs-census-g17'];
  if (preferences.height) sourceIds.push('abs-nhs-height');
  if (preferences.backgrounds.length) sourceIds.push('abs-census-g08');
  const assumptions = [
    '2021 Census usual residents are used as the population reference; this is not a count of people currently dating.',
    'Published five- and ten-year income cells are allocated to single ages using each city’s observed single-year age distribution.',
  ];
  if (preferences.income != null) assumptions.push('Selected income ranges are interpolated inside published income bands; income not stated does not pass the range. The $182,000 upper bound includes the open-ended top band.');
  if (preferences.height) assumptions.push('Height uses published NHS 2022 age/sex means. Normal spreads of 6.0–8.5 cm for men and 5.5–8.0 cm for women are sensitivity assumptions because ABS does not publish standard deviations.');
  if (preferences.backgrounds.length) assumptions.push('Selected ancestry uses observed city margins. The range uses mathematical intersection bounds because overlap with the other filters is unavailable.');
  return {
    estimate: roundedEstimate,
    range: [Math.round(boundedLow), Math.round(boundedHigh)],
    denominator: roundedDenominator,
    share: roundedDenominator ? roundedEstimate / roundedDenominator : 0,
    evidenceState: preferences.backgrounds.length ? 'limited evidence' : 'modelled combination',
    rangeMeaning: preferences.backgrounds.length
      ? 'Mathematical bounds from the published ancestry margins and the selected demographic cohort, combined with age-band and height sensitivity variants; not a confidence interval.'
      : 'Range across within-age-band allocation bounds and the disclosed height-spread variants; not a confidence interval.',
    assumptions,
    sourceIds,
    modelVersion: MODEL_VERSION,
    insights: makeInsights(preferences, estimate, denominator),
  };
}

export function distributions(preferences: Preferences, field: 'age' | 'height' | 'income'): DistributionBin[] {
  const background = backgroundScenario(preferences.city, preferences.backgrounds).midpoint;
  const sex = sexCode(preferences.gender);
  if (field === 'height') {
    const totalByAge = new Map<number, number>();
    for (const cell of MODEL.cells[preferences.city]) {
      if (cell.s !== sex || cell.a < preferences.age[0] || cell.a > preferences.age[1]) continue;
      totalByAge.set(cell.a, (totalByAge.get(cell.a) || 0) + cell.n * incomeProbability(preferences.income, cell));
    }
    return Array.from({ length: 36 }, (_, i) => 140 + i * 2).map(value => ({
      value,
      weight: Math.round([...totalByAge].reduce((sum, [age, n]) => sum + n * heightProbability([value, value + 1], preferences.gender, age), 0) * background),
    }));
  }
  const bins = new Map<number, number>();
  for (const cell of MODEL.cells[preferences.city]) {
    if (cell.s !== sex) continue;
    if (field !== 'age' && (cell.a < preferences.age[0] || cell.a > preferences.age[1])) continue;
    const height = heightProbability(preferences.height, preferences.gender, cell.a);
    const income = field === 'income' ? 1 : incomeProbability(preferences.income, cell);
    if (field === 'income' && cell.l == null) continue;
    const value = field === 'age' ? cell.a : cell.l!;
    bins.set(value, (bins.get(value) || 0) + cell.n * height * income * background);
  }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([value, weight]) => ({ value, weight: Math.round(weight) }));
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs < 1_000) return Math.round(value).toLocaleString('en-AU');
  if (abs < 1_000_000) return `${(value / 1_000).toFixed(abs < 10_000 ? 1 : 0).replace('.0', '')}k`;
  return `${(value / 1_000_000).toFixed(abs < 10_000_000 ? 1 : 0).replace('.0', '')}m`;
}

export type { City, CityId, DistributionBin, Estimate, Gender, Insight, Preferences, Source } from './types';
