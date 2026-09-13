'use client';

import React, { useEffect, useState } from 'react';

interface DistributionSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (val: number) => string;
  label: string;
  distribution?: number[]; // Array of values to form a histogram/curve
  dataPoints?: number; // Number of distinct data points to show as ticks
}

export default function DistributionSlider({
  min,
  max,
  value,
  onChange,
  formatValue = (v) => v.toString(),
  label,
  distribution = [],
  dataPoints,
}: DistributionSliderProps) {
  const [localMin, setLocalMin] = useState(value[0]);
  const [localMax, setLocalMax] = useState(value[1]);
  const [activeThumb, setActiveThumb] = useState<'min'|'max'>('max');

  useEffect(() => {
    setLocalMin(value[0]);
    setLocalMax(value[1]);
  }, [value]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), localMax);
    setLocalMin(val);
    setActiveThumb('min');
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), localMin);
    setLocalMax(val);
    setActiveThumb('max');
  };

  const handleMouseUp = () => {
    onChange([localMin, localMax]);
  };

  // Calculate percentages for styling
  const minPos = ((localMin - min) / (max - min)) * 100;
  const maxPos = ((localMax - min) / (max - min)) * 100;

  // Max value in distribution to normalize heights
  const maxDist = distribution.length > 0 ? Math.max(...distribution) : 1;

  // Generate tick positions based on dataPoints
  const ticks = dataPoints 
    ? Array.from({ length: dataPoints }).map((_, i) => (i / (dataPoints - 1)) * 100)
    : [];

  return (
    <div className="w-full mb-6 relative">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-semibold text-black">{label}</label>
        <span className="text-sm font-medium text-black">
          {formatValue(localMin)} – {formatValue(localMax)}
        </span>
      </div>

      <div className="relative pt-8 pb-4">
        {/* Distribution Curve / Histogram */}
        {distribution.length > 0 && (
          <div className="absolute bottom-6 left-0 right-0 h-14 flex items-end opacity-50 pointer-events-none">
            {distribution.map((val, i) => {
              const itemPercent = (i / (distribution.length - 1)) * 100;
              const isSelected = itemPercent >= minPos && itemPercent <= maxPos;
              const h = (val / maxDist) * 100;
              return (
                <div
                  key={i}
                  className={`flex-1 mx-[1px] rounded-t-sm transition-colors duration-200 ${
                    isSelected ? 'bg-black' : 'bg-gray-300'
                  }`}
                  style={{ height: `${Math.max(2, h)}%` }}
                />
              );
            })}
          </div>
        )}

        {/* Dual Slider Container */}
        <div className="relative h-2 rounded-full bg-gray-200 mt-2">
          {/* Active Range Highlight */}
          <div
            className="absolute top-0 bottom-0 bg-black rounded-full"
            style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
          />

          {/* Ticks for real data points */}
          {ticks.length > 0 && (
            <div className="absolute top-3 left-0 right-0 h-2 pointer-events-none">
              {ticks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-1.5 bg-gray-300 transform -translate-x-1/2 rounded-full"
                  style={{ left: `${tick}%` }}
                />
              ))}
            </div>
          )}

          {/* Min Thumb */}
          <input
            type="range"
            min={min}
            max={max}
            value={localMin}
            onChange={handleMinChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="absolute top-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md"
            style={{ zIndex: activeThumb === 'min' ? 30 : 10 }}
          />

          {/* Max Thumb */}
          <input
            type="range"
            min={min}
            max={max}
            value={localMax}
            onChange={handleMaxChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="absolute top-0 w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md"
            style={{ zIndex: activeThumb === 'max' ? 30 : 20 }}
          />
        </div>
      </div>
    </div>
  );
}
