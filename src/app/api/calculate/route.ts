// =============================================================================
// API Route: POST /api/calculate
//
// Accepts user preferences, calculates the dating pool, stores the submission,
// and returns the results.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { UserPreferences } from '@/lib/types';
import { calculateDatingPool } from '@/lib/calculator';
import { storeSubmission } from '@/lib/storage';

/**
 * Validate and sanitize user preferences from the request body.
 */
function validatePreferences(body: unknown): UserPreferences | null {
  if (!body || typeof body !== 'object') return null;

  const b = body as Record<string, unknown>;

  const interestedInSex = b.interestedInSex;
  if (interestedInSex !== 'male' && interestedInSex !== 'female' && interestedInSex !== 'any') {
    return null;
  }

  const ageMin = Number(b.ageMin);
  const ageMax = Number(b.ageMax);
  if (isNaN(ageMin) || isNaN(ageMax) || ageMin < 18 || ageMax > 100 || ageMin > ageMax) {
    return null;
  }

  const heightMin = Number(b.heightMin);
  const heightMax = Number(b.heightMax);
  if (isNaN(heightMin) || isNaN(heightMax) || heightMin < 100 || heightMax > 250 || heightMin > heightMax) {
    return null;
  }

  const incomeMin = Number(b.incomeMin) || 0;
  const incomeMax = Number(b.incomeMax) || 250000;
  if (isNaN(incomeMin) || isNaN(incomeMax) || incomeMin > incomeMax) {
    return null;
  }

  const ethnicities = Array.isArray(b.ethnicities) ? b.ethnicities.filter((e): e is string => typeof e === 'string') : [];

  const city = String(b.city || 'any');

  const singleOnly = b.singleOnly !== false; // default true

  return {
    interestedInSex,
    ageMin,
    ageMax,
    heightMin,
    heightMax,
    incomeMin,
    incomeMax,
    ethnicities,
    city,
    singleOnly,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prefs = validatePreferences(body);

    if (!prefs) {
      return NextResponse.json(
        { error: 'Invalid preferences. Please check your inputs.' },
        { status: 400 }
      );
    }

    // Calculate the dating pool
    const result = calculateDatingPool(prefs);

    // Store the submission (fire-and-forget, don't block response)
    storeSubmission(prefs, result).catch((err) => {
      console.error('Failed to store submission:', err);
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { error: 'An error occurred during calculation.' },
      { status: 500 }
    );
  }
}
