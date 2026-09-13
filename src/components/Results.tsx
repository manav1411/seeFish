'use client';

import { useState, useEffect, useRef } from 'react';
import { CalculationResult, UserPreferences } from '@/lib/types';

interface ResultsProps {
  result: CalculationResult;
  userPrefs: UserPreferences;
  onCheckAmITheirType: () => void;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-AU');
}

function useCountUp(target: number, duration = 800): number {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

/** A single row in the waterfall, showing how this filter narrows the bar from the PREVIOUS filter's width */
function WaterfallRow({
  label,
  percentKept,   // % of THIS filter's input that survives
  poolAfter,
  index,
  prevWidth,     // CSS % width of the previous bar (to show linkage)
}: {
  label: string;
  percentKept: number;
  poolAfter: number;
  index: number;
  prevWidth: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80 + index * 70);
    return () => clearTimeout(t);
  }, [index]);

  // This bar's width = prev width * (percentKept / 100)
  // We render it relative to 100% of the container, so:
  const thisWidth = prevWidth * (Math.max(0.5, Math.min(100, percentKept)) / 100);
  const narrowedBy = prevWidth - thisWidth; // how much this filter cut

  return (
    <div
      style={{
        opacity: 0,
        animation: `fadeUp 0.35s ease both`,
        animationDelay: `${index * 0.07}s`,
        animationFillMode: 'both',
      }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-500 truncate pr-2">{label}</span>
        <span className="text-xs font-semibold text-black tabular-nums shrink-0">
          {formatNumber(Math.round(poolAfter))}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
        {/* Dim "what was removed" portion — from thisWidth to prevWidth */}
        {mounted && narrowedBy > 0.5 && (
          <div
            className="absolute top-0 h-full rounded-full bg-gray-200"
            style={{
              left: 0,
              width: `${prevWidth}%`,
              transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
              transitionDelay: `${index * 0.07}s`,
            }}
          />
        )}
        {/* Active portion */}
        <div
          className="absolute top-0 h-full rounded-full bg-black"
          style={{
            left: 0,
            width: mounted ? `${thisWidth}%` : '0%',
            transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
            transitionDelay: `${index * 0.07 + 0.05}s`,
          }}
        />
      </div>
    </div>
  );
}

export default function Results({ result, userPrefs, onCheckAmITheirType }: ResultsProps) {
  const { matchingPopulation, totalAdultPopulation, percentage, breakdown, insights } = result;
  const animatedCount = useCountUp(matchingPopulation);

  // Build cumulative widths for waterfall bars
  // First bar starts at 100% (total population), then each subsequent bar
  // is prev * (percentKept/100)
  const cumulativeWidths: number[] = [];
  let running = 100;
  for (const item of breakdown) {
    cumulativeWidths.push(running);
    running = running * (Math.max(0.5, Math.min(100, item.percentKept)) / 100);
  }

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      {/* Hero number */}
      <div className="text-center shrink-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1.5">
          Your dating pool
        </p>
        <p
          key={matchingPopulation}
          className="text-5xl font-bold text-black tracking-tight tabular-nums"
          style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {formatNumber(animatedCount)}
        </p>
        <p className="text-xs text-gray-400 mt-1.5">
          <span className="text-black font-semibold">{percentage.toFixed(2)}%</span>
          {' '}of {formatNumber(totalAdultPopulation)} adults
        </p>
      </div>

      {/* Filter waterfall */}
      {breakdown.length > 0 && (
        <div className="flex-1 overflow-y-auto custom-scroll min-h-0">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-2.5">
            How filters narrow your pool
          </p>
          <div className="space-y-3">
            {breakdown.map((item, i) => (
              <WaterfallRow
                key={item.filterName}
                label={item.label}
                percentKept={item.percentKept}
                poolAfter={item.poolAfter}
                index={i}
                prevWidth={cumulativeWidths[i]}
              />
            ))}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                Insights
              </p>
              <ul className="space-y-1.5">
                {insights.map((insight, i) => (
                  <li key={i} className="text-xs text-gray-500 flex gap-2">
                    <span className="text-gray-300 shrink-0 mt-px">—</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Segment 2 CTA */}
      <div className="pt-3 border-t border-gray-100 shrink-0">
        <p className="text-[10px] text-gray-400 mb-2">
          Out of these {formatNumber(matchingPopulation)} people — how many would be interested in you?
        </p>
        <button
          onClick={onCheckAmITheirType}
          className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.99] transition-all duration-150"
        >
          Am I their type?
        </button>
      </div>
    </div>
  );
}
