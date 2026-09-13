'use client';

import React from 'react';
import Image from 'next/image';
import { CITIES } from '@/lib/types';

interface CityMapProps {
  selectedCity: string;
  onSelectCity: (cityId: string) => void;
}

// City dot positions as % of the 800×648 PNG image dimensions
// Calibrated to the actual australia.png silhouette
const CITY_POSITIONS: Record<string, { x: number; y: number; name: string }> = {
  darwin:    { x: 47,   y: 12,  name: 'Darwin' },
  brisbane:  { x: 83,   y: 51,  name: 'Brisbane' },
  perth:     { x: 17,   y: 62,  name: 'Perth' },
  adelaide:  { x: 57,   y: 70,  name: 'Adelaide' },
  sydney:    { x: 84,   y: 65,  name: 'Sydney' },
  canberra:  { x: 80.5, y: 71,  name: 'Canberra' },
  melbourne: { x: 72,   y: 77,  name: 'Melbourne' },
  hobart:    { x: 73.5, y: 92,  name: 'Hobart' },
};

export default function CityMap({ selectedCity, onSelectCity }: CityMapProps) {
  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Location</span>
      </div>

      {/* Map container — uses the actual PNG */}
      <div className="relative w-full" style={{ aspectRatio: '1.23' }}>
        {/* Australia silhouette */}
        <img
          src="/australia.png"
          alt="Australia map"
          className="absolute inset-0 w-full h-full object-contain opacity-[0.09] pointer-events-none select-none"
          draggable={false}
        />

        {/* City dots */}
        {Object.entries(CITY_POSITIONS).map(([id, pos]) => {
          const isSelected = selectedCity === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectCity(id)}
              className="absolute group flex flex-col items-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 20 : 10,
              }}
            >
              {/* Dot */}
              <div
                className={`rounded-full border-2 transition-all duration-200 ${
                  isSelected
                    ? 'w-4 h-4 bg-black border-white shadow-md'
                    : 'w-3 h-3 bg-gray-300 border-transparent hover:bg-gray-600 hover:scale-110'
                }`}
              />
              {/* Label */}
              <span
                className={`absolute top-full mt-1 text-[10px] font-semibold whitespace-nowrap transition-all duration-200 leading-none ${
                  isSelected
                    ? 'opacity-100 text-black'
                    : 'opacity-0 group-hover:opacity-100 text-gray-500'
                }`}
              >
                {pos.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
