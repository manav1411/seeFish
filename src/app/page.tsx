'use client';

import { useState, useCallback } from 'react';
import PreferenceForm from '@/components/PreferenceForm';
import Results from '@/components/Results';
import WhoAreYouForm from '@/components/WhoAreYouForm';
import { UserPreferences, CalculationResult } from '@/lib/types';

const DEFAULT_PREFS: UserPreferences = {
  interestedInSex: 'female',
  ageMin: 22,
  ageMax: 35,
  heightMin: 155,
  heightMax: 200,
  incomeMin: 0,
  incomeMax: 250000,
  ethnicities: [],
  city: 'sydney',
  singleOnly: true,
};

const DEFAULT_SEGMENT_2 = {
  myGender: 'male',
  myAge: 28,
  myEthnicity: 'any',
  myHeight: 175,
};

type Segment = 'preferences' | 'am_i_their_type';

function resetState() {
  return {
    prefs: DEFAULT_PREFS,
    result: null as CalculationResult | null,
    isLoading: false,
    error: null as string | null,
    hasCalculated: false,
    segment: 'preferences' as Segment,
    ...DEFAULT_SEGMENT_2,
    myTypeResult: null as number | null,
  };
}

// Easter egg: user is female, 18-26, south_asian
function isEasterEgg(myGender: string, myAge: number, myEthnicity: string): boolean {
  return myGender === 'female' && myAge >= 18 && myAge <= 26 && myEthnicity === 'south_asian';
}

export default function Home() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [segment, setSegment] = useState<Segment>('preferences');

  // Derive myGender automatically based on interestedInSex.
  const derivedMyGender = prefs.interestedInSex === 'female' ? 'male' : 'female';
  
  const [myGender, setMyGender] = useState(derivedMyGender);
  const [myAge, setMyAge] = useState(DEFAULT_SEGMENT_2.myAge);
  const [myEthnicity, setMyEthnicity] = useState(DEFAULT_SEGMENT_2.myEthnicity);
  const [myHeight, setMyHeight] = useState(DEFAULT_SEGMENT_2.myHeight);
  const [myTypeResult, setMyTypeResult] = useState<number | null>(null);

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    setResult(null);
    setIsLoading(false);
    setError(null);
    setHasCalculated(false);
    setSegment('preferences');
    setMyGender(DEFAULT_PREFS.interestedInSex === 'female' ? 'male' : 'female');
    setMyAge(DEFAULT_SEGMENT_2.myAge);
    setMyEthnicity(DEFAULT_SEGMENT_2.myEthnicity);
    setMyHeight(DEFAULT_SEGMENT_2.myHeight);
    setMyTypeResult(null);
  };

  const fetchResults = useCallback(async (currentPrefs: UserPreferences) => {
    setIsLoading(true);
    setError(null);
    setHasCalculated(true);
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPrefs),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to calculate.');
      }
      const data: CalculationResult = await response.json();
      setResult(data);
      // When fetch is successful, make sure myGender aligns with interestedInSex
      setMyGender(currentPrefs.interestedInSex === 'female' ? 'male' : 'female');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchResults(prefs);
  };

  const handleCheckMyType = useCallback(async () => {
    if (!result) return;
    setMyTypeResult(null);
    try {
      const response = await fetch('/api/reverse-calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myGender,
          myAge,
          myEthnicity,
          myHeight,
          originalPrefs: prefs,
          matchingPopulation: result.matchingPopulation,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setMyTypeResult(data.estimatedInterested);
      }
    } catch {
      // ignore
    }
  }, [result, myGender, myAge, myEthnicity, myHeight, prefs]);

  const easterEgg = myTypeResult !== null && isEasterEgg(myGender, myAge, myEthnicity);

  // ─── Segment 2 ────────────────────────────────────────────────────────────
  if (segment === 'am_i_their_type' && result) {
    return (
      <div className="h-full flex flex-col lg:flex-row gap-0 py-5 overflow-hidden">
        {/* Left */}
        <div className="w-full lg:w-1/2 flex flex-col overflow-hidden pr-0 lg:pr-6">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <button
              onClick={() => setSegment('preferences')}
              className="text-xs text-gray-400 hover:text-black transition-colors flex items-center gap-1 shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </button>
            <div>
              <h2 className="text-sm font-semibold text-black">About you</h2>
              <p className="text-[11px] text-gray-400">How many of your pool would be interested in someone like you</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scroll">
            <WhoAreYouForm
              myGender={myGender}
              setMyGender={setMyGender}
              myAge={myAge}
              setMyAge={setMyAge}
              myEthnicity={myEthnicity}
              setMyEthnicity={setMyEthnicity}
              myHeight={myHeight}
              setMyHeight={setMyHeight}
              onCheckMyType={handleCheckMyType}
              hasResult={myTypeResult !== null}
              interestedInSex={prefs.interestedInSex}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-gray-100 shrink-0" />

        {/* Right */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center overflow-hidden pl-0 lg:pl-6">
          {myTypeResult === null ? (
            <div className="text-center px-8">
              <div className="w-14 h-14 rounded-full border border-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M20 21a8 8 0 1 0-16 0"/>
                </svg>
              </div>
              <p className="text-xs text-gray-400 max-w-[200px]">
                Fill in your details and see how many people in your pool would pick you back.
              </p>
            </div>
          ) : (
            <div
              className="text-center px-6 w-full max-w-xs"
              style={{ animation: 'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                Estimated mutual interest
              </p>
              <p className="text-5xl font-bold text-black tracking-tight tabular-nums mb-1.5">
                {myTypeResult.toLocaleString('en-AU')}
              </p>
              <p className="text-xs text-gray-400 mb-1">
                <span className="text-black font-semibold">
                  {((myTypeResult / result.matchingPopulation) * 100).toFixed(1)}%
                </span>
                {' '}of your pool
              </p>
              <p className="text-[10px] text-gray-300 max-w-[200px] mx-auto mt-3">
                Estimated from ABS demographic data.
              </p>

              {/* Easter egg */}
              {easterEgg && (
                <div
                  className="mt-5 flex flex-col items-center gap-2"
                  style={{ animation: 'fadeUp 0.5s 0.3s ease both' }}
                >
                  <p className="text-[10px] text-gray-400 tabular-nums">
                    + 1 (hi)
                  </p>
                  <a
                    href="https://instagram.com/manav141"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-md hover:scale-105 active:scale-95 transition-transform duration-150"
                    style={{
                      background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    @manav141
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main view ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col lg:flex-row gap-0 py-5 overflow-hidden">
      {/* Left: Preferences */}
      <div className="w-full lg:w-1/2 flex flex-col overflow-hidden pr-0 lg:pr-6">
        <div className="mb-4 shrink-0">
          <h2 className="text-sm font-semibold text-black">Who are you looking for?</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Set your preferences to see your pool</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden gap-4"
        >
          {/* No inner scroll — form content is compact enough */}
          <div className="flex-1 overflow-hidden">
            <PreferenceForm prefs={prefs} onChange={setPrefs} />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Calculating
              </span>
            ) : 'See my pool'}
          </button>
        </form>
      </div>

      {/* Divider */}
      <div className="hidden lg:block w-px bg-gray-100 shrink-0" />

      {/* Right: Results */}
      <div className="w-full lg:w-1/2 flex flex-col overflow-hidden pl-0 lg:pl-6">
        {!hasCalculated ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Ready to see your pool?</p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
                Set your preferences and calculate to see how many Australians match your criteria.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-black mb-1">Something went wrong</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        ) : result ? (
          <div
            className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${
              isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'
            }`}
          >
            <Results
              result={result}
              userPrefs={prefs}
              onCheckAmITheirType={() => setSegment('am_i_their_type')}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
