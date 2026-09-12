'use client';

import { useState, useRef } from 'react';
import PreferenceForm from '@/components/PreferenceForm';
import Results from '@/components/Results';
import { UserPreferences, CalculationResult } from '@/lib/types';

export default function Home() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (prefs: UserPreferences) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to calculate. Please try again.');
      }

      const data: CalculationResult = await response.json();
      setResult(data);

      // Smooth scroll to results after a short delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="text-center py-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          How Big Is Your Dating Pool?
        </h2>
        <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto">
          Select your dating preferences below and find out exactly how many
          Australians match your criteria — using real census data.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <PreferenceForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-medium">Something went wrong</p>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div ref={resultsRef} className="pt-4">
          <Results result={result} />
        </div>
      )}
    </div>
  );
}
