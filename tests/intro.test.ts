import { describe, expect, it } from 'vitest';
import { matchesManav } from '../src/model/intro';
import type { Profile } from '../src/model/types';

const profile: Profile = { gender: 'women', age: 22, height: null, income: null, backgrounds: ['indian'], city: 'australia' };
describe('personal introduction', () => {
  it('includes ages 20–24 without height, income or city requirements', () => {
    for (const age of [20, 21, 22, 23, 24]) expect(matchesManav({ ...profile, age })).toBe(true);
    expect(matchesManav({ ...profile, height: 210, income: 182000, city: 'perth', backgrounds: ['english', 'indian'] })).toBe(true);
  });
  it('requires each actual self-description and never infers it from desired preferences', () => {
    for (const changed of [{ gender: null }, { gender: 'men' as const }, { age: null }, { age: 19 }, { age: 25 }, { backgrounds: [] }, { backgrounds: ['chinese'] }]) {
      expect(matchesManav({ ...profile, ...changed })).toBe(false);
    }
  });
});
