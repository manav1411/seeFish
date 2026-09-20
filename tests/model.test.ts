import { describe, expect, it } from 'vitest';
import { BACKGROUNDS, CITIES, MODEL_VERSION, calculate, calculateMutualInterest, distributions, formatCount } from '../src/model';
import type { Preferences, Profile } from '../src/model/types';

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

  it('keeps same-sex pairings positive and uses pooled orientation identity rates', () => {
    const opposite = calculateMutualInterest(base, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    const sameSex = calculateMutualInterest(base, { gender: 'men', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    const womenSameSex = calculateMutualInterest({ ...base, gender: 'women' }, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    expect(opposite.pool).toBe(calculate(base).estimate);
    expect(opposite.denominator).toBe(opposite.pool);
    expect(opposite.estimate).toBeGreaterThan(0);
    expect(sameSex.estimate).toBeGreaterThan(0);
    expect(womenSameSex.estimate).toBeGreaterThan(0);
    expect(sameSex.estimate).toBeLessThan(opposite.estimate);
    expect(sameSex.orientationShare).toBeGreaterThan(0);
    expect(womenSameSex.orientationShare).toBeCloseTo(sameSex.orientationShare, 3);
    expect(opposite.orientationShare).toBeGreaterThan(sameSex.orientationShare);
    expect(sameSex.evidenceState).toBe('illustrative scenario');
    expect(sameSex.factors.map(factor => factor.id)).toEqual(expect.arrayContaining(['orientation', 'age', 'height', 'income', 'background', 'geography']));
  });

  it('uses the published pooled age-band identity rates without excluding bisexual people', () => {
    const young = calculateMutualInterest({ ...base, age: [20, 24] }, { gender: 'men', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    const mid = calculateMutualInterest({ ...base, age: [25, 34] }, { gender: 'men', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    const older = calculateMutualInterest({ ...base, age: [35, 38] }, { gender: 'men', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    const opposite = calculateMutualInterest({ ...base, age: [25, 34] }, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    expect(young.orientationShare).toBeCloseTo(0.076, 6);
    expect(mid.orientationShare).toBeCloseTo(0.056, 6);
    expect(older.orientationShare).toBeCloseTo(0.017, 6);
    expect(opposite.orientationShare).toBeCloseTo(0.966, 6);
  });

  it('responds to every optional profile field even when target preferences are Any', () => {
    const neutral: Profile = { gender: 'women', city: null, age: 30, height: null, income: null, backgrounds: [] };
    const older = calculateMutualInterest(base, { ...neutral, age: 70 });
    const shorter = calculateMutualInterest(base, { ...neutral, height: 145 });
    const higherIncome = calculateMutualInterest(base, { ...neutral, income: 180_000 });
    const remote = calculateMutualInterest(base, { ...neutral, city: 'perth' });
    const indian = calculateMutualInterest(base, { ...neutral, backgrounds: ['indian'] });
    expect(older.estimate).toBeLessThan(calculateMutualInterest(base, neutral).estimate);
    expect(shorter.estimate).not.toBe(calculateMutualInterest(base, neutral).estimate);
    expect(higherIncome.estimate).not.toBe(calculateMutualInterest(base, neutral).estimate);
    expect(remote.estimate).toBeLessThan(calculateMutualInterest(base, { ...neutral, city: 'sydney' }).estimate);
    expect(indian.estimate).not.toBe(calculateMutualInterest(base, neutral).estimate);
    for (const result of [older, shorter, higherIncome, remote, indian]) {
      expect(result.estimate).toBeGreaterThanOrEqual(0);
      expect(result.estimate).toBeLessThanOrEqual(result.pool);
      expect(result.range[0]).toBeGreaterThanOrEqual(0);
      expect(result.range[1]).toBeLessThanOrEqual(result.pool);
      expect(Number.isFinite(result.fit)).toBe(true);
    }
  });

  it('uses exact single-background matches and bounded mixed unions', () => {
    const indianTarget: Preferences = { ...base, backgrounds: ['indian'] };
    const matching = calculateMutualInterest(indianTarget, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: ['indian'] });
    const different = calculateMutualInterest(indianTarget, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: ['english'] });
    const mixed = calculateMutualInterest({ ...base, backgrounds: ['indian', 'english', 'indian'] }, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: ['indian'] });
    const mixedOrder = calculateMutualInterest({ ...base, backgrounds: ['english', 'indian'] }, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: ['indian', 'indian'] });
    const partial = calculateMutualInterest({ ...base, backgrounds: ['indian', 'english'] }, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: ['indian'] });
    const full = calculateMutualInterest({ ...base, backgrounds: ['indian', 'english'] }, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: ['indian', 'english'] });
    expect(matching.estimate).toBeGreaterThan(different.estimate);
    expect(mixed.estimate).toBe(mixedOrder.estimate);
    expect(partial.estimate).toBeLessThan(full.estimate);
    expect(matching.range[0]).toBeLessThanOrEqual(matching.estimate);
    expect(matching.range[1]).toBeGreaterThanOrEqual(matching.estimate);
  });

  it('weights a national search by the selected local city cohort', () => {
    const national: Preferences = { ...base, city: 'australia' };
    const local = calculateMutualInterest(national, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    const remote = calculateMutualInterest(national, { gender: 'women', city: 'darwin', age: 30, height: null, income: null, backgrounds: [] });
    const unspecified = calculateMutualInterest(national, { gender: 'women', city: null, age: 30, height: null, income: null, backgrounds: [] });
    expect(local.estimate).toBeGreaterThan(remote.estimate);
    expect(unspecified.estimate).toBeGreaterThan(remote.estimate);
    expect(local.pool).toBe(remote.pool);

    const restricted: Preferences = { ...national, backgrounds: ['indian'] };
    const restrictedLocal = calculateMutualInterest(restricted, { gender: 'women', city: 'sydney', age: 30, height: null, income: null, backgrounds: [] });
    const restrictedRemote = calculateMutualInterest(restricted, { gender: 'women', city: 'darwin', age: 30, height: null, income: null, backgrounds: [] });
    expect(restrictedLocal.estimate).toBeGreaterThan(restrictedRemote.estimate);
    expect(restrictedLocal.pool).toBe(restrictedRemote.pool);
  });

  it('keeps nulls neutral and impossible target pools bounded at zero', () => {
    const allNull: Profile = { gender: null, city: null, age: null, height: null, income: null, backgrounds: [] };
    const neutral = calculateMutualInterest(base, allNull);
    expect(neutral.estimate).toBeGreaterThan(0);
    expect(neutral.share).toBeGreaterThan(0);
    expect(neutral.fit).toBeCloseTo(0.35, 2);
    const impossible = calculateMutualInterest({ ...base, height: [300, 301] }, allNull);
    expect(impossible.pool).toBe(0);
    expect(impossible.estimate).toBe(0);
    expect(impossible.range).toEqual([0, 0]);
    expect(Number.isFinite(impossible.fit)).toBe(true);
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
