import { useEffect, useId, useRef, useState } from 'react';
import type { DistributionBin } from '../model/types';
import Histogram from './histogram';

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
  imperialHeight?: boolean;
}

export function formatImperialHeight(centimetres: number) {
  const totalInches = Math.round(centimetres / 2.54);
  return `${Math.floor(totalInches / 12)}′${totalInches % 12}″`;
}

export default function CompactRange({ label, min, max, step = 1, value, onChange, bins, unit = '', any, onAny, money = false, imperialHeight = false }: Props) {
  const id = useId();
  const sliderRef = useRef<HTMLDivElement>(null);
  const lowInputRef = useRef<HTMLInputElement>(null);
  const highInputRef = useRef<HTMLInputElement>(null);
  const [activeHandle, setActiveHandle] = useState<'low' | 'high' | null>(null);
  const displayScale = money ? 1000 : 1;
  const dragRef = useRef<{
    handle: 'low' | 'high';
    startX: number;
    startVal: number;
    hasMoved: boolean;
  } | null>(null);

  const startDrag = (clientX: number) => {
    const bounds = sliderRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    const touchVal = min + ratio * (max - min);
    const lowDistance = Math.abs(touchVal - value[0]);
    const highDistance = Math.abs(touchVal - value[1]);
    const handle = lowDistance <= highDistance ? 'low' : 'high';
    setActiveHandle(handle);
    dragRef.current = {
      handle,
      startX: clientX,
      startVal: value[handle === 'low' ? 0 : 1],
      hasMoved: false,
    };
    (handle === 'low' ? lowInputRef : highInputRef).current?.focus({ preventScroll: true });
  };

  const moveDrag = (clientX: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const bounds = sliderRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    const deltaX = clientX - drag.startX;
    if (!drag.hasMoved && Math.abs(deltaX) < 1) return;
    drag.hasMoved = true;
    const deltaVal = Math.round(((deltaX / bounds.width) * (max - min)) / step) * step;
    let nextVal = drag.startVal + deltaVal;
    if (drag.handle === 'low') {
      nextVal = Math.max(min, Math.min(nextVal, value[1] - step));
      onChange([nextVal, value[1]]);
    } else {
      nextVal = Math.min(max, Math.max(nextVal, value[0] + step));
      onChange([value[0], nextVal]);
    }
  };

  const endDrag = (clientX?: number) => {
    const drag = dragRef.current;
    if (drag && !drag.hasMoved && clientX !== undefined) {
      const bounds = sliderRef.current?.getBoundingClientRect();
      if (bounds && bounds.width > 0) {
        const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
        const raw = min + ratio * (max - min);
        const tapVal = min + Math.round((raw - min) / step) * step;
        if (drag.handle === 'low') {
          onChange([Math.max(min, Math.min(tapVal, value[1] - step)), value[1]]);
        } else {
          onChange([value[0], Math.min(max, Math.max(tapVal, value[0] + step))]);
        }
      }
    }
    dragRef.current = null;
  };

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startDrag(touch.clientX);
      e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return;
      const touch = e.touches[0];
      moveDrag(touch.clientX);
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      endDrag(touch?.clientX);
    };
    const onTouchCancel = () => {
      endDrag();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchCancel);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [min, max, step, value, onChange]);

  const lowIsHigher = activeHandle === 'low' || (activeHandle !== 'high' && (value[0] > (min + max) / 2 || value[1] === max));

  return <div className={`compact-range ${any ? 'range-any' : ''}`}>
    <div className="control-heading"><label htmlFor={`${id}-low`}>{label}</label><div className="range-controls">
      <div className="range-value-group">
        <div className="range-inputs">
          {money && <span>$</span>}<input aria-label={`Minimum ${label.toLowerCase()} value`} id={`${id}-low`} type="number" min={min / displayScale} max={(value[1] - step) / displayScale} value={value[0] / displayScale} onChange={e => { const n = Number(e.target.value) * displayScale; if (n >= min && n <= value[1] - step) onChange([n, value[1]]); }} /><span>{money ? 'k' : ''}</span><span className="range-dash">—</span>{money && <span>$</span>}<input aria-label={`Maximum ${label.toLowerCase()} value`} type="number" min={(value[0] + step) / displayScale} max={max / displayScale} value={value[1] / displayScale} onChange={e => { const n = Number(e.target.value) * displayScale; if (n >= value[0] + step && n <= max) onChange([value[0], n]); }} /><span>{money ? `k${value[1] === max ? '+' : ''}` : unit}</span>
        </div>
        {imperialHeight && <span className="range-equivalent">{formatImperialHeight(value[0])}–{formatImperialHeight(value[1])}</span>}
      </div>
      {onAny && <button className={`any-button ${any ? 'selected' : ''}`} type="button" onClick={onAny} aria-pressed={any}>Any</button>}
    </div></div>
    <div className="range-visual"><Histogram min={min} max={max} bins={bins} start={value[0]} end={value[1]} any={any} /><div
      className="dual-slider"
      ref={sliderRef}
      style={{ '--start': `${(value[0] - min) / (max - min) * 100}%`, '--end': `${(value[1] - min) / (max - min) * 100}%` } as React.CSSProperties}
      onPointerDown={e => {
        if (!e.isPrimary || e.button !== 0 || e.pointerType === 'touch') return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        startDrag(e.clientX);
      }}
      onPointerMove={e => {
        if (e.pointerType === 'touch') return;
        if (dragRef.current) {
          e.preventDefault();
          moveDrag(e.clientX);
        }
      }}
      onPointerUp={e => {
        if (e.pointerType === 'touch') return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
        }
        endDrag(e.clientX);
      }}
      onPointerCancel={e => {
        if (e.pointerType === 'touch') return;
        endDrag();
      }}
    ><span /><input
      ref={lowInputRef}
      className="range-handle range-handle-low"
      aria-label={`Minimum ${label.toLowerCase()}`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      style={{ zIndex: lowIsHigher ? 5 : 3 }}
      onChange={e => onChange([Math.min(Number(e.target.value), value[1] - step), value[1]])}
    /><input
      ref={highInputRef}
      className="range-handle range-handle-high"
      aria-label={`Maximum ${label.toLowerCase()}`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[1]}
      style={{ zIndex: lowIsHigher ? 3 : 5 }}
      onChange={e => onChange([value[0], Math.max(Number(e.target.value), value[0] + step)])}
    /></div></div>
  </div>;
}
