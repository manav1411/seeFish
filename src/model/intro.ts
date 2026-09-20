import type { Profile } from './types';

// A deliberately personal easter egg, kept separate from population estimates.
// Every criterion must be explicitly supplied. Height and income are irrelevant.
export function matchesManav(profile: Profile): boolean {
  return profile.gender === 'women' && profile.age !== null
    && profile.age >= 20 && profile.age <= 24 && profile.backgrounds.includes('indian');
}
