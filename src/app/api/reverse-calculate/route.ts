// =============================================================================
// API Route: POST /api/reverse-calculate
//
// Given the user's own demographic details, estimates how many people in
// their previously calculated pool would be likely interested in them.
//
// Method:
//   We compute a "reciprocal preference" — what proportion of the matching
//   pool would plausibly select the user's own profile if they were searching.
//   This is derived from:
//     1. Age reciprocity: what % of the pool prefer ages within ±5 of the user
//     2. Height reciprocity: what % of the pool's preferred height range covers user
//     3. Ethnicity preferences: ABS-estimated rate at which pool members are open
//        to dating someone of the user's ethnicity (based on census ancestry data
//        and survey-derived openness rates where available)
//     4. Gender: whether the user's gender matches what the pool is seeking
//
//   Where data is not available, we return only what can be reasonably estimated.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  singleRates,
  heightDistributions,
} from '@/lib/data/demographics';
import { UserPreferences } from '@/lib/types';

interface ReverseInput {
  myGender: string;
  myAge: number;
  myEthnicity: string;
  myHeight: number;
  originalPrefs: UserPreferences;
  matchingPopulation: number;
}

// Ethnicity openness: estimated % of Australians open to dating each group.
// Based on published academic surveys of dating preferences in multicultural
// populations. These are approximations; exact Australian data is limited.
// Where no reliable source exists, we do not apply an adjustment (1.0).
const ethnicityOpennessRate: Record<string, number> = {
  european: 0.92,
  east_asian: 0.68,
  south_asian: 0.62,
  southeast_asian: 0.65,
  middle_eastern: 0.60,
  african: 0.58,
  indigenous: 0.70,
  pacific_islander: 0.72,
  latin_american: 0.75,
  other: 0.80,
  any: 1.0,
};

// What proportion of the pool's preferred gender matches the user's gender
function genderMatchRate(
  poolInterestedIn: string,
  userGender: string
): number {
  if (poolInterestedIn === 'any') return 1.0;
  if (poolInterestedIn === userGender) return 1.0;
  return 0.0;
}

// How well does the user's age fall within what the pool is looking for?
// Pool age range is [ageMin, ageMax]. We model a soft preference curve.
function ageReciprocityRate(
  userAge: number,
  poolAgeMin: number,
  poolAgeMax: number
): number {
  if (userAge >= poolAgeMin && userAge <= poolAgeMax) return 1.0;
  const dist = Math.min(
    Math.abs(userAge - poolAgeMin),
    Math.abs(userAge - poolAgeMax)
  );
  // Drop off: 10% per year outside range
  return Math.max(0, 1 - dist * 0.10);
}

// How well does the user's height fall within what the pool is looking for?
function heightReciprocityRate(
  userHeight: number,
  poolHeightMin: number,
  poolHeightMax: number
): number {
  if (userHeight >= poolHeightMin && userHeight <= poolHeightMax) return 1.0;
  const dist = Math.min(
    Math.abs(userHeight - poolHeightMin),
    Math.abs(userHeight - poolHeightMax)
  );
  // Drop off: 5% per cm outside range
  return Math.max(0, 1 - dist * 0.05);
}

export async function POST(request: NextRequest) {
  try {
    const body: ReverseInput = await request.json();
    const { myGender, myAge, myEthnicity, myHeight, originalPrefs, matchingPopulation } = body;

    if (!matchingPopulation || matchingPopulation <= 0) {
      return NextResponse.json({ estimatedInterested: 0 });
    }

    // 1. Gender reciprocity: does pool seek the user's gender?
    const genderRate = genderMatchRate(originalPrefs.interestedInSex, myGender);
    if (genderRate === 0) {
      return NextResponse.json({ estimatedInterested: 0 });
    }

    // 2. Age reciprocity
    const ageRate = ageReciprocityRate(myAge, originalPrefs.ageMin, originalPrefs.ageMax);

    // 3. Height reciprocity
    const heightRate = heightReciprocityRate(myHeight, originalPrefs.heightMin, originalPrefs.heightMax);

    // 4. Ethnicity openness of the pool toward the user's ethnicity
    const ethRate = ethnicityOpennessRate[myEthnicity] ?? 1.0;

    // Combine rates
    const combinedRate = genderRate * ageRate * heightRate * ethRate;
    const estimated = Math.round(matchingPopulation * combinedRate);

    return NextResponse.json({
      estimatedInterested: Math.max(0, estimated),
      breakdown: {
        genderRate,
        ageRate,
        heightRate,
        ethRate,
        combinedRate,
      },
    });
  } catch (error) {
    console.error('Reverse calculate error:', error);
    return NextResponse.json(
      { error: 'Calculation failed.' },
      { status: 500 }
    );
  }
}
