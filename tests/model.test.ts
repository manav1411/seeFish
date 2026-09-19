import { describe, expect, it } from 'vitest';
import { BACKGROUNDS, CITIES, MODEL_VERSION, calculate, distributions, formatCount } from '../src/model';
import type { Preferences } from '../src/model/types';

const base: Preferences = {
  gender: 'men', city: 'sydney', age: [25, 38], height: null, income: null, backgrounds: [],
};

describe('population model', () => {
  it('covers Australia and all eight capital city regions', () => {
    expect(CITIES).toHaveLength(9);
    expect(CITIES.map(city => city.id)).toContain('darwin');
    expect(MODEL_VERSION).toMatch(/^abs-2021-g17/);
    expect(BACKGROUNDS.length).toBeGreaterThan(5);
  });

  it('is deterministic and returns coherent bounds', () => {
    const first = calculate(base);
    expect(calculate(base)).toEqual(first);
    expect(first.estimate).toBeGreaterThan(100_000);
    expect(first.range[0]).toBeLessThanOrEqual(first.estimate);
    expect(first.range[1]).toBeGreaterThanOrEqual(first.estimate);
    expect(first.range[1]).toBeLessThanOrEqual(first.denominator);
    expect(first.share).toBeCloseTo(first.estimate / first.denominator, 8);
    expect(first.insights).toHaveLength(3);
  });

  it('narrows monotonically as filters tighten', () => {
    const broad = calculate(base).estimate;
    const olderStart = calculate({ ...base, age: [30, 38] }).estimate;
    const income = calculate({ ...base, income: [104_000, 182_000] }).estimate;
    const tighterIncome = calculate({ ...base, income: [104_000, 150_000] }).estimate;
    const height = calculate({ ...base, height: [175, 190] }).estimate;
    expect(olderStart).toBeLessThanOrEqual(broad);
    expect(income).toBeLessThanOrEqual(broad);
    expect(tighterIncome).toBeLessThanOrEqual(income);
    expect(height).toBeLessThanOrEqual(broad);
  });

  it('keeps the open-ended top income band in a range ending at $182k', () => {
    const top = calculate({ ...base, income: [182_000, 182_000] }).estimate;
    const belowTop = calculate({ ...base, income: [0, 181_999] }).estimate;
    expect(top).toBeGreaterThan(0);
    expect(belowTop).toBeLessThan(calculate({ ...base, income: null }).estimate);
  });

  it('uses ancestry margins as a visibly limited-evidence scenario', () => {
    const result = calculate({ ...base, backgrounds: ['chinese', 'indian'] });
    expect(result.estimate).toBeLessThan(calculate(base).estimate);
    expect(result.evidenceState).toBe('limited evidence');
    expect(result.rangeMeaning).toContain('not a confidence interval');
    expect(result.sourceIds).toContain('abs-census-g08');
  });

  it('produces usable distributions with the field constraint excluded', () => {
    const age = distributions(base, 'age');
    const income = distributions(base, 'income');
    const height = distributions(base, 'height');
    expect(age[0].value).toBe(18);
    expect(age.at(-1)?.value).toBe(80);
    expect(income.some(bin => bin.value === 182_000)).toBe(true);
    expect(height).toHaveLength(36);
    expect(height.every(bin => bin.weight >= 0)).toBe(true);
  });

  it('formats approximate display counts', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(12_345)).toBe('12k');
    expect(formatCount(1_250_000)).toBe('1.3m');
  });
});
