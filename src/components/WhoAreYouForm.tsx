'use client';

import { ETHNICITIES } from '@/lib/types';

interface WhoAreYouFormProps {
  myGender: string;
  setMyGender: (gender: string) => void;
  myAge: number;
  setMyAge: (age: number) => void;
  myEthnicity: string;
  setMyEthnicity: (ethnicity: string) => void;
  myHeight: number;
  setMyHeight: (height: number) => void;
  onCheckMyType: () => void;
  hasResult: boolean;
  interestedInSex: string;
}

function cmToDisplay(cm: number): string {
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const rem = Math.round(inches % 12);
  return `${feet}'${rem}"`;
}

export default function WhoAreYouForm({
  myGender,
  setMyGender,
  myAge,
  setMyAge,
  myEthnicity,
  setMyEthnicity,
  myHeight,
  setMyHeight,
  onCheckMyType,
  hasResult,
  interestedInSex,
}: WhoAreYouFormProps) {
  const allowedGender = interestedInSex === 'male' ? 'female' : 'male';

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Gender */}
      <div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest block mb-2.5">
          I am a
        </span>
        <div className="flex gap-2">
          {['male', 'female'].map(g => {
            const isAllowed = g === allowedGender;
            return (
              <button
                key={g}
                type="button"
                disabled={!isAllowed}
                onClick={() => setMyGender(g)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                  !isAllowed
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-100'
                    : myGender === g
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          Note: Currently only heterosexual matches are calculated.
        </p>
      </div>

      {/* Age */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">My age</span>
          <span className="text-sm font-semibold text-black tabular-nums">{myAge}</span>
        </div>
        <div className="relative h-[3px] rounded-full bg-gray-200">
          <div
            className="absolute top-0 left-0 h-full bg-black rounded-full"
            style={{ width: `${((myAge - 18) / (75 - 18)) * 100}%` }}
          />
          <input
            type="range"
            min={18}
            max={75}
            value={myAge}
            onChange={e => setMyAge(Number(e.target.value))}
            className="absolute inset-x-0 w-full h-[3px] bg-transparent appearance-none"
            style={{ top: 0 }}
          />
        </div>
      </div>

      {/* Height */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">My height</span>
          <span className="text-sm font-semibold text-black tabular-nums">{cmToDisplay(myHeight)}</span>
        </div>
        <div className="relative h-[3px] rounded-full bg-gray-200">
          <div
            className="absolute top-0 left-0 h-full bg-black rounded-full"
            style={{ width: `${((myHeight - 140) / (220 - 140)) * 100}%` }}
          />
          <input
            type="range"
            min={140}
            max={220}
            value={myHeight}
            onChange={e => setMyHeight(Number(e.target.value))}
            className="absolute inset-x-0 w-full h-[3px] bg-transparent appearance-none"
            style={{ top: 0 }}
          />
        </div>
      </div>

      {/* Ethnicity */}
      <div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest block mb-2.5">
          My ethnicity
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setMyEthnicity('any')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              myEthnicity === 'any'
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            Prefer not to say
          </button>
          {ETHNICITIES.map(eth => (
            <button
              key={eth.id}
              type="button"
              onClick={() => setMyEthnicity(eth.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                myEthnicity === eth.id
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {eth.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onCheckMyType}
        className="w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 shrink-0"
      >
        {hasResult ? 'Recalculate' : 'See my matches'}
      </button>
    </div>
  );
}
