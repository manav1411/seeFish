import { useId } from 'react';
import type { DistributionBin } from '../model/types';
import Histogram from './histogram';
import { formatImperialHeight } from './CompactRange';

export interface SingleValueProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number | null;
  onChange: (value: number | null) => void;
  bins: DistributionBin[];
  unit?: string;
  money?: boolean;
  suggested?: number;
  imperialHeight?: boolean;
}

export default function SingleValue({ label, min, max, step = 1, value, onChange, bins, unit = '', money = false, suggested, imperialHeight = false }: SingleValueProps) {
  const id = useId();
  const displayScale = money ? 1000 : 1;
  const sliderValue = value ?? suggested ?? (min + max) / 2;
  const shown = value == null
    ? 'Not set'
    : `${money ? '$' : ''}${(value / displayScale).toLocaleString('en-AU')}${money ? `k${value === max ? '+' : ''}` : unit ? ` ${unit}` : ''}${imperialHeight ? ` · ${formatImperialHeight(value)}` : ''}`;
  return <div className={`compact-range single-value${value == null ? ' value-empty' : ''}`}>
    <div className="control-heading"><label htmlFor={id}>{label}</label><div className="range-inputs"><span>{shown}</span><button type="button" className="any-button" onClick={() => onChange(null)} aria-label={value == null ? `Skip ${label}` : `Clear ${label}`}>{value == null ? 'Skip' : 'Clear'}</button></div></div>
    <div className="range-visual"><Histogram min={min} max={max} bins={bins} start={sliderValue} end={sliderValue} /><div className="single-slider" data-empty={value == null} style={{ '--start': `${(sliderValue - min) / (max - min) * 100}%` } as React.CSSProperties}><input className="single-range-input" id={id} aria-label={label} type="range" min={min} max={max} step={step} value={sliderValue} onChange={e => onChange(Number(e.target.value))} onPointerUp={e => { if (value == null) onChange(Number(e.currentTarget.value)); }} /></div></div>
  </div>;
}
