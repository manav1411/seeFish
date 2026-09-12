'use client';

import { useState } from 'react';
import { CITIES, ETHNICITIES, INCOME_BRACKETS, UserPreferences } from '@/lib/types';

interface PreferenceFormProps {
  onSubmit: (prefs: UserPreferences) => void;
  isLoading: boolean;
}

/**
 * Convert cm to ft'in" display string.
 */
function cmToFtIn(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

export default function PreferenceForm({ onSubmit, isLoading }: PreferenceFormProps) {
  const [interestedInSex, setInterestedInSex] = useState<'male' | 'female' | 'any'>('any');
  const [ageMin, setAgeMin] = useState(22);
  const [ageMax, setAgeMax] = useState(35);
  const [heightMin, setHeightMin] = useState(150);
  const [heightMax, setHeightMax] = useState(200);
  const [minIncome, setMinIncome] = useState('any');
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);
  const [city, setCity] = useState('any');
  const [singleOnly, setSingleOnly] = useState(true);

  const toggleEthnicity = (id: string) => {
    setSelectedEthnicities((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      interestedInSex,
      ageMin,
      ageMax,
      heightMin,
      heightMax,
      minIncome,
      ethnicities: selectedEthnicities,
      city,
      singleOnly,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Gender Interest */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          I&apos;m interested in
        </label>
        <div className="flex gap-3">
          {[
            { value: 'female' as const, label: '👩 Women', emoji: '' },
            { value: 'male' as const, label: '👨 Men', emoji: '' },
            { value: 'any' as const, label: '👥 Everyone', emoji: '' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setInterestedInSex(value)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                interestedInSex === value
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 scale-[1.02]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Age Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Age range
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="number"
              min={18}
              max={100}
              value={ageMin}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 18;
                setAgeMin(Math.min(v, ageMax));
              }}
              className="w-full text-center font-medium"
            />
            <p className="text-xs text-gray-400 text-center mt-1">Min</p>
          </div>
          <span className="text-gray-400 font-medium mt-[-16px]">to</span>
          <div className="flex-1">
            <input
              type="number"
              min={18}
              max={100}
              value={ageMax}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 100;
                setAgeMax(Math.max(v, ageMin));
              }}
              className="w-full text-center font-medium"
            />
            <p className="text-xs text-gray-400 text-center mt-1">Max</p>
          </div>
        </div>
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          City
        </label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full"
        >
          <option value="any">🇦🇺 Anywhere in Australia</option>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ethnicity */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Ethnicity preference
          <span className="font-normal text-gray-400 ml-2">
            (leave unchecked for any)
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ETHNICITIES.map((eth) => (
            <label
              key={eth.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                selectedEthnicities.includes(eth.id)
                  ? 'bg-primary-50 border border-primary-200'
                  : 'bg-white border border-gray-100 hover:border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedEthnicities.includes(eth.id)}
                onChange={() => toggleEthnicity(eth.id)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">{eth.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Height Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Height range
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="number"
              min={100}
              max={250}
              value={heightMin}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 100;
                setHeightMin(Math.min(v, heightMax));
              }}
              className="w-full text-center font-medium"
            />
            <p className="text-xs text-gray-400 text-center mt-1">
              Min ({cmToFtIn(heightMin)})
            </p>
          </div>
          <span className="text-gray-400 font-medium mt-[-16px]">to</span>
          <div className="flex-1">
            <input
              type="number"
              min={100}
              max={250}
              value={heightMax}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 250;
                setHeightMax(Math.max(v, heightMin));
              }}
              className="w-full text-center font-medium"
            />
            <p className="text-xs text-gray-400 text-center mt-1">
              Max ({cmToFtIn(heightMax)})
            </p>
          </div>
        </div>
      </div>

      {/* Income */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Minimum yearly income
        </label>
        <select
          value={minIncome}
          onChange={(e) => setMinIncome(e.target.value)}
          className="w-full"
        >
          {INCOME_BRACKETS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {/* Single Only */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors">
          <input
            type="checkbox"
            checked={singleOnly}
            onChange={(e) => setSingleOnly(e.target.checked)}
            className="rounded"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Single people only</span>
            <p className="text-xs text-gray-400">Exclude those in registered or de facto relationships</p>
          </div>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg
          transition-all duration-200 shadow-lg
          ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.01] active:scale-[0.99]'
          }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Crunching the numbers...
          </span>
        ) : (
          '💘 See My Dating Pool'
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Based on ABS Census 2021 data and statistical estimates.
        Your preferences are stored anonymously for aggregate research.
      </p>
    </form>
  );
}
