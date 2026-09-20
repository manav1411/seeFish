import { describe, expect, it } from 'vitest';
import { makeHistogramBars } from '../src/components/histogram';

describe('linear histogram sampling', () => {
  it('conserves mass while distributing uneven bands across a linear domain', () => {
    const bars = makeHistogramBars([
      { value: 0, weight: 10 },
      { value: 20, weight: 20 },
      { value: 100, weight: 5 },
    ], 0, 100, 4);
    expect(bars.map(bar => bar.weight)).toEqual([11.25, 6.25, 6.25, 11.25]);
    expect(bars.reduce((sum, bar) => sum + bar.weight, 0)).toBe(35);
    expect(bars.map(bar => [bar.start, bar.end])).toEqual([[0, 25], [25, 50], [50, 75], [75, 100]]);
  });

  it('keeps the top coded endpoint as a separate sentinel bucket', () => {
    const bars = makeHistogramBars([
      { value: 0, weight: 10 },
      { value: 50, weight: 20 },
      { value: 100, weight: 30 },
    ], 0, 100, 4);
    expect(bars.at(-1)?.weight).toBe(40);
    expect(bars.slice(0, -1).reduce((sum, bar) => sum + bar.weight, 0)).toBe(20);
  });

  it('uses the exact domain endpoints for geometry', () => {
    const bars = makeHistogramBars([{ value: 10, weight: 1 }], 10, 110, 2);
    expect(bars[0].start).toBe(10);
    expect(bars.at(-1)?.end).toBe(110);
  });
});
