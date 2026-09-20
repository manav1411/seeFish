import { createElement, type CSSProperties } from 'react';
import type { DistributionBin } from '../model/types';

export interface HistogramBar {
  start: number;
  end: number;
  weight: number;
}

export interface HistogramProps {
  min: number;
  max: number;
  bins: DistributionBin[];
  start?: number;
  end?: number;
  any?: boolean;
  className?: string;
}

/**
 * Turns banded source data into equal-width bars on the requested numeric
 * domain. A source value describes the interval up to the next source value;
 * a value at max is an open-ended/sentinel bucket and remains in the last bar.
 */
export function makeHistogramBars(bins: DistributionBin[], min: number, max: number, count = bins.length): HistogramBar[] {
  if (!(max > min) || count < 1) return [];
  const sorted = bins.filter(bin => Number.isFinite(bin.value) && Number.isFinite(bin.weight))
    .slice().sort((a, b) => a.value - b.value);
  const bars = Array.from({ length: count }, (_, i) => ({
    start: min + (max - min) * i / count,
    end: min + (max - min) * (i + 1) / count,
    weight: 0,
  }));
  for (let i = 0; i < sorted.length; i += 1) {
    const source = sorted[i];
    if (source.value < min || source.value > max) continue;
    const next = sorted[i + 1]?.value ?? max;
    // The final top-coded band has no measurable width. Keep all its mass in
    // the endpoint bucket instead of smearing it through the domain.
    if (source.value >= max || next <= source.value) {
      bars[count - 1].weight += source.weight;
      continue;
    }
    const intervalStart = Math.max(min, source.value);
    const intervalEnd = Math.min(max, next);
    const intervalLength = next - source.value;
    if (intervalEnd <= intervalStart) continue;
    for (const bar of bars) {
      const overlap = Math.max(0, Math.min(bar.end, intervalEnd) - Math.max(bar.start, intervalStart));
      if (overlap) bar.weight += source.weight * overlap / intervalLength;
    }
  }
  return bars;
}

export const histogramBars = makeHistogramBars;

function pct(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
}

export function Histogram({ min, max, bins, start = min, end = max, any = false, className = '' }: HistogramProps) {
  const bars = makeHistogramBars(bins, min, max);
  const maxWeight = Math.max(1, ...bars.map(bar => bar.weight));
  const startPct = pct(start, min, max);
  const endPct = pct(end, min, max);
  const layer = (active: boolean): CSSProperties => ({
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'end', gap: '2px',
    clipPath: active && !any ? `inset(0 ${100 - endPct}% 0 ${startPct}%)` : undefined,
  });
  const columns = (kind: 'base' | 'active') => bars.map((bar, i) => createElement('i', {
    key: i, style: { height: `${Math.max(6, bar.weight / maxWeight * 100)}%` },
  }));
  return createElement('div', { className: `range-histogram ${className}`.trim(), 'aria-hidden': true },
    createElement('div', { className: 'histogram-track', style: { position: 'relative', width: '100%', height: '100%' } },
      createElement('div', { className: 'histogram-layer histogram-base', style: layer(false) }, columns('base')),
      createElement('div', { className: 'histogram-layer histogram-active', style: layer(true) }, columns('active')),
    ),
  );
}

export default Histogram;
