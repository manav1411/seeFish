'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface DualSliderProps {
  label: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (val: number) => string;
  distribution?: number[];
}

export default function DualSlider({
  label,
  min,
  max,
  value,
  onChange,
  formatValue = (v) => String(v),
  distribution = [],
}: DualSliderProps) {
  const [localMin, setLocalMin] = useState(value[0]);
  const [localMax, setLocalMax] = useState(value[1]);

  // Sync from parent
  useEffect(() => { setLocalMin(value[0]); }, [value[0]]);
  useEffect(() => { setLocalMax(value[1]); }, [value[1]]);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const minPct = pct(localMin);
  const maxPct = pct(localMax);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), localMax - 1);
    setLocalMin(v);
    onChange([v, localMax]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), localMin + 1);
    setLocalMax(v);
    onChange([localMin, v]);
  };

  const maxDistVal = distribution.length > 0 ? Math.max(...distribution) : 1;
  const TRACK_H = 3; // px

  return (
    <div className="w-full select-none">
      {/* Label + current values */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-semibold text-black tabular-nums">
          {formatValue(localMin)}&thinsp;&ndash;&thinsp;{formatValue(localMax)}
        </span>
      </div>

      {/* Histogram */}
      {distribution.length > 0 && (
        <div className="flex items-end gap-[1.5px] h-8 mb-1 pointer-events-none">
          {distribution.map((val, i) => {
            const itemPct = (i / (distribution.length - 1)) * 100;
            const inRange = itemPct >= minPct && itemPct <= maxPct;
            return (
              <div
                key={i}
                className="flex-1 rounded-[2px] transition-colors duration-150"
                style={{
                  height: `${Math.max(12, (val / maxDistVal) * 100)}%`,
                  background: inRange ? '#111' : '#e5e5e5',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Track + thumbs — all in one relative container */}
      <div className="relative" style={{ height: `${TRACK_H + 20}px` }}>
        {/* Grey track */}
        <div
          className="absolute left-0 right-0 bg-gray-200 rounded-full"
          style={{ height: TRACK_H, top: '50%', transform: 'translateY(-50%)' }}
        />
        {/* Black active fill */}
        <div
          className="absolute bg-black rounded-full"
          style={{
            height: TRACK_H,
            top: '50%',
            transform: 'translateY(-50%)',
            left: `${minPct}%`,
            right: `${100 - maxPct}%`,
          }}
        />

        <style dangerouslySetInnerHTML={{__html: `
          .range-input {
            pointer-events: none;
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
          }
          .range-input::-webkit-slider-thumb {
            pointer-events: auto;
            width: 24px;
            height: 24px;
            -webkit-appearance: none;
            cursor: pointer;
          }
          .range-input::-moz-range-thumb {
            pointer-events: auto;
            width: 24px;
            height: 24px;
            cursor: pointer;
            border: none;
            background: transparent;
          }
        `}} />
        {/* Min input */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={localMin}
          onChange={handleMinChange}
          className="absolute inset-0 w-full h-full opacity-0 range-input"
          style={{ zIndex: 3 }}
        />
        {/* Max input */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={localMax}
          onChange={handleMaxChange}
          className="absolute inset-0 w-full h-full opacity-0 range-input"
          style={{ zIndex: 4 }}
        />

        {/* Visual thumb circles — rendered on top of the inputs, pointer-events-none */}
        <div
          className="absolute w-[18px] h-[18px] rounded-full bg-black border-2 border-white shadow-md pointer-events-none"
          style={{
            top: '50%',
            left: `${minPct}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        />
        <div
          className="absolute w-[18px] h-[18px] rounded-full bg-black border-2 border-white shadow-md pointer-events-none"
          style={{
            top: '50%',
            left: `${maxPct}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        />
      </div>
    </div>
  );
}
