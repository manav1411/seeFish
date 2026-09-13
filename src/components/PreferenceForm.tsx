'use client';

import { ETHNICITIES, UserPreferences } from '@/lib/types';
import DualSlider from './DualSlider';
import CityMap from './CityMap';

interface PreferenceFormProps {
  prefs: UserPreferences;
  onChange: (prefs: UserPreferences) => void;
}

function cmToDisplay(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

function formatIncome(v: number): string {
  if (v >= 250000) return '$250k+';
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}

function bell(length: number, peak: number, spread: number): number[] {
  return Array.from({ length }, (_, i) =>
    Math.exp(-0.5 * Math.pow((i - peak) / spread, 2))
  );
}

const INCOME_DIST = [
  10, 16, 28, 44, 72, 92, 100, 94, 84, 72,
  62, 52, 42, 36, 30, 24, 20, 16, 13, 10,
   8,  7,  6,  5,  4,  3,  3,  2,  2,  1,
   1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
].map(v => v / 100);

export default function PreferenceForm({ prefs, onChange }: PreferenceFormProps) {
  const set = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) =>
    onChange({ ...prefs, [key]: value });

  const toggleEthnicity = (id: string) => {
    const next = prefs.ethnicities.includes(id)
      ? prefs.ethnicities.filter(e => e !== id)
      : [...prefs.ethnicities, id];
    set('ethnicities', next);
  };

  const isFemale = prefs.interestedInSex === 'female';
  // Age range 18–75 = 58 values; bell peaks near 25–30
  const ageDist = bell(58, isFemale ? 8 : 11, 12);
  // Height range 140–220 = 81 values
  const heightDist = bell(81, isFemale ? 21 : 35, 8);

  const genderOptions = [
    { value: 'female' as const, label: 'Women' },
    { value: 'male' as const, label: 'Men' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Gender interest ────────────────────────────────── */}
      <div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest block mb-2">
          Interested in
        </span>
        <div className="flex gap-2">
          {genderOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('interestedInSex', value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                prefs.interestedInSex === value
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 1: Age (left) + Location map (right) ──────── */}
      <div className="grid grid-cols-2 gap-x-6">
        <div className="flex flex-col justify-center h-full">
          <DualSlider
            label="Age"
            min={18}
            max={75}
            value={[prefs.ageMin, prefs.ageMax]}
            onChange={([min, max]) => onChange({ ...prefs, ageMin: min, ageMax: max })}
            formatValue={v => `${v}`}
            distribution={ageDist}
          />
        </div>
        <CityMap
          selectedCity={prefs.city}
          onSelectCity={city => set('city', city)}
        />
      </div>

      {/* ── Row 2: Height (left) + Income (right) ─────────── */}
      <div className="grid grid-cols-2 gap-x-6">
        <DualSlider
          label="Height"
          min={140}
          max={220}
          value={[prefs.heightMin, prefs.heightMax]}
          onChange={([min, max]) => onChange({ ...prefs, heightMin: min, heightMax: max })}
          formatValue={cmToDisplay}
          distribution={heightDist}
        />
        <DualSlider
          label="Income"
          min={0}
          max={250000}
          value={[prefs.incomeMin, prefs.incomeMax]}
          onChange={([min, max]) => onChange({ ...prefs, incomeMin: min, incomeMax: max })}
          formatValue={formatIncome}
          distribution={INCOME_DIST}
        />
      </div>

      {/* ── Ethnicity (full width) ─────────────────────────── */}
      <div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest block mb-2">
          Ethnicity preference
          <span className="normal-case font-normal text-gray-300 ml-1.5">(any if none selected)</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {ETHNICITIES.map(eth => (
            <button
              key={eth.id}
              type="button"
              onClick={() => toggleEthnicity(eth.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                prefs.ethnicities.includes(eth.id)
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {eth.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Single only — just the toggle + label inline ───── */}
      <div className="flex items-center gap-3">
        {/* The toggle IS the clickable button */}
        <button
          type="button"
          role="switch"
          aria-checked={prefs.singleOnly}
          onClick={() => set('singleOnly', !prefs.singleOnly)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none ${
            prefs.singleOnly ? 'bg-black border-black' : 'bg-gray-200 border-gray-200'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
              prefs.singleOnly ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span
          className="text-sm text-gray-600 cursor-pointer select-none"
          onClick={() => set('singleOnly', !prefs.singleOnly)}
        >
          Single people only
        </span>
      </div>
    </div>
  );
}
