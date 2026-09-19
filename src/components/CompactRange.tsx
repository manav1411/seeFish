import { useId } from 'react';
import type { DistributionBin } from '../model/types';

interface Props {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  bins: DistributionBin[];
  unit?: string;
  any?: boolean;
  onAny?: () => void;
  money?: boolean;
}

export default function CompactRange({ label, min, max, step = 1, value, onChange, bins, unit = '', any, onAny, money = false }: Props) {
  const id = useId();
  const maxWeight = Math.max(1, ...bins.map(b => b.weight));
  const displayScale = money ? 1000 : 1;
  return <div className={`compact-range ${any ? 'range-any' : ''}`}>
    <div className="control-heading"><label htmlFor={`${id}-low`}>{label}</label><div className="range-inputs">
      {money && <span>$</span>}<input aria-label={`Minimum ${label.toLowerCase()} value`} id={`${id}-low`} type="number" min={min / displayScale} max={(value[1] - step) / displayScale} value={value[0] / displayScale} onChange={e => { const n = Number(e.target.value) * displayScale; if (n >= min && n <= value[1] - step) onChange([n, value[1]]); }} /><span>{money ? 'k' : ''}</span><span className="range-dash">—</span>{money && <span>$</span>}<input aria-label={`Maximum ${label.toLowerCase()} value`} type="number" min={(value[0] + step) / displayScale} max={max / displayScale} value={value[1] / displayScale} onChange={e => { const n = Number(e.target.value) * displayScale; if (n >= value[0] + step && n <= max) onChange([value[0], n]); }} /><span>{money ? `k${value[1] === max ? '+' : ''}` : unit}</span>
      {onAny && <button className={`any-button ${any ? 'selected' : ''}`} type="button" onClick={onAny} aria-pressed={any}>Any</button>}
    </div></div>
    <div className="range-visual"><div className="range-histogram" aria-hidden="true">{bins.map((bin, i) => <i key={i} className={any || bin.value >= value[0] && bin.value <= value[1] ? 'inside-range' : ''} style={{ height: `${Math.max(6, bin.weight / maxWeight * 100)}%` }} />)}</div><div className="dual-slider" style={{ '--start': `${(value[0] - min) / (max - min) * 100}%`, '--end': `${(value[1] - min) / (max - min) * 100}%` } as React.CSSProperties}><span /><input aria-label={`Minimum ${label.toLowerCase()}`} type="range" min={min} max={max} step={step} value={value[0]} onChange={e => onChange([Math.min(Number(e.target.value), value[1] - step), value[1]])} /><input aria-label={`Maximum ${label.toLowerCase()}`} type="range" min={min} max={max} step={step} value={value[1]} onChange={e => onChange([value[0], Math.max(Number(e.target.value), value[0] + step)])} /></div></div>
  </div>;
}
