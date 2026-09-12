'use client';

import { CalculationResult } from '@/lib/types';

interface ResultsProps {
  result: CalculationResult;
}

/**
 * Format a large number with commas: 1234567 → "1,234,567"
 */
function formatNumber(n: number): string {
  return n.toLocaleString('en-AU');
}

/**
 * Determine the color for a percentage bar based on how much was kept.
 */
function barColor(pct: number): string {
  if (pct >= 80) return 'bg-green-400';
  if (pct >= 50) return 'bg-emerald-400';
  if (pct >= 30) return 'bg-yellow-400';
  if (pct >= 10) return 'bg-orange-400';
  return 'bg-red-400';
}

/**
 * Get a fun emoji reaction based on the pool size.
 */
function getReaction(matchPop: number, percentage: number): { emoji: string; text: string } {
  if (matchPop === 0) return { emoji: '😱', text: 'Nobody matches... time to reconsider?' };
  if (percentage > 10) return { emoji: '🎉', text: 'Plenty of fish in the sea!' };
  if (percentage > 5) return { emoji: '😊', text: 'Solid dating pool!' };
  if (percentage > 1) return { emoji: '👍', text: 'A healthy pool to work with.' };
  if (percentage > 0.1) return { emoji: '🤔', text: 'Selective, but realistic.' };
  if (percentage > 0.01) return { emoji: '😅', text: 'Quite the high standards!' };
  if (matchPop > 100) return { emoji: '🎯', text: 'Very selective — they\'re out there though!' };
  return { emoji: '🦄', text: 'Unicorn hunting!' };
}

export default function Results({ result }: ResultsProps) {
  const { matchingPopulation, totalAdultPopulation, percentage, breakdown, insights, funFacts } = result;
  const reaction = getReaction(matchingPopulation, percentage);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Result */}
      <div className="text-center py-8">
        <p className="text-5xl mb-4 animate-count-up">{reaction.emoji}</p>
        <h2 className="text-lg font-medium text-gray-500 mb-2">Your Dating Pool</h2>
        <p className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight animate-count-up">
          {formatNumber(matchingPopulation)}
        </p>
        <p className="text-lg text-gray-500 mt-2">
          people in Australia match your criteria
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-400">
          <span>
            <strong className="text-gray-600">{percentage.toFixed(3)}%</strong> of
            {' '}{formatNumber(totalAdultPopulation)} adults
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-500 italic">
          {reaction.text}
        </p>
      </div>

      {/* Overall percentage bar */}
      <div className="px-2">
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.max(0.5, Math.min(100, percentage))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span>
          <span>of Australia&apos;s adult population</span>
          <span>100%</span>
        </div>
      </div>

      {/* Filter Breakdown Waterfall */}
      {breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            How each filter narrows your pool
          </h3>
          <div className="space-y-4">
            {breakdown.map((item, i) => (
              <div
                key={item.filterName}
                className={`animate-fade-in-up stagger-${i + 1}`}
                style={{ opacity: 0, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatNumber(Math.round(item.poolAfter))} left
                    <span className="text-xs text-gray-400 ml-1">
                      ({item.percentKept.toFixed(1)}% kept)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-grow ${barColor(item.percentKept)}`}
                    style={{ width: `${Math.max(0.5, item.percentKept)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-primary-50 to-pink-50 rounded-2xl border border-primary-100 p-6">
          <h3 className="text-sm font-semibold text-primary-700 mb-3">
            💡 Personalised Insights
          </h3>
          <ul className="space-y-2.5">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-primary-400 mt-0.5 flex-shrink-0">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fun Facts */}
      {funFacts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            🎲 Fun Facts
          </h3>
          <div className="space-y-2.5">
            {funFacts.map((fact, i) => (
              <p key={i} className="text-sm text-gray-600">
                {fact}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon Teaser */}
      <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6 text-center">
        <p className="text-2xl mb-2">🔮</p>
        <h3 className="text-sm font-semibold text-gray-600 mb-1">
          Coming Soon: &quot;Am I Their Type?&quot;
        </h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Once enough people have shared their preferences, you&apos;ll be able to see
          how many of your matches are also looking for someone like you.
        </p>
      </div>

      {/* Data attribution */}
      <p className="text-xs text-gray-400 text-center pb-4">
        Data sourced from ABS Census 2021, ABS National Health Survey 2017-18,
        and statistical estimates. Population figures are for adults aged 18+.
        All calculations use conditional probability accounting for correlations
        between demographics.
      </p>
    </div>
  );
}
