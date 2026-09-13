'use client';

import React from 'react';
import { CITIES } from '@/lib/types';

interface AustraliaMapProps {
  selectedCity: string;
  onSelectCity: (cityId: string) => void;
}

export default function AustraliaMap({ selectedCity, onSelectCity }: AustraliaMapProps) {
  // Approximate relative coordinates for Australian cities on a 0-100% scale
  // Adjusted to prevent overlap and match the SVG bounding box
  const cityPositions: Record<string, { x: number; y: number }> = {
    sydney: { x: 88, y: 68 },
    melbourne: { x: 79, y: 81 },
    brisbane: { x: 92, y: 53 },
    perth: { x: 14, y: 65 },
    adelaide: { x: 69, y: 72 },
    canberra: { x: 84, y: 74 }, // Moved away from Sydney
    hobart: { x: 82, y: 95 },
    darwin: { x: 50, y: 14 },
  };

  return (
    <div className="w-full flex flex-col items-center mb-6">
      <div className="flex justify-between w-full items-end mb-2">
        <label className="text-sm font-semibold text-black">Location</label>
        <button 
          onClick={() => onSelectCity('any')}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${selectedCity === 'any' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          Anywhere
        </button>
      </div>
      
      <div className="relative w-full aspect-[1.1] max-w-[280px] bg-gray-50 rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center">
        {/* Cleaner Australia Map SVG mapped to 0-100 coordinate space */}
        <svg viewBox="0 0 100 100" className="absolute w-[95%] h-[95%] opacity-20 fill-black pointer-events-none">
          {/* Mainland */}
          <path d="M 45,5 C 50,4 52,8 51,12 C 50,15 54,16 57,14 C 61,12 64,8 68,9 C 72,10 74,15 76,22 C 78,30 84,36 88,40 C 93,45 94,52 95,55 C 96,60 92,66 89,70 C 86,75 80,82 76,85 C 72,88 66,84 64,80 C 61,75 58,74 54,75 C 48,77 40,75 35,74 C 28,72 20,74 15,72 C 10,69 8,60 8,55 C 7,45 10,35 15,28 C 20,20 30,12 38,8 C 41,6 43,5 45,5 Z" />
          {/* Tasmania */}
          <path d="M 80,92 C 84,91 85,96 82,98 C 79,99 76,96 80,92 Z" />
        </svg>

        {Object.entries(cityPositions).map(([cityId, pos]) => {
          const isSelected = selectedCity === cityId;
          const cityInfo = CITIES.find((c) => c.id === cityId);
          return (
            <div
              key={cityId}
              className="absolute group flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: isSelected ? 20 : 10 }}
              onClick={() => onSelectCity(cityId)}
            >
              <div 
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                  isSelected 
                    ? 'bg-black border-black scale-125' 
                    : selectedCity === 'any'
                      ? 'bg-black border-black scale-100'
                      : 'bg-white border-gray-400 hover:border-black hover:scale-110'
                }`} 
              />
              <span className={`mt-1 text-[11px] font-semibold transition-opacity absolute top-3 ${isSelected ? 'opacity-100 text-black' : 'opacity-0 group-hover:opacity-100 text-gray-500'}`}>
                {cityInfo?.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
