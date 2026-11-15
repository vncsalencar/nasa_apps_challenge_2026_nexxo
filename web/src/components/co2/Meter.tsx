// A thin bar from 1 to 5 mmHg with a mark at the reference of one average and a dot at the value.
import type { Status } from './status.ts'
import './cards.css'

const METER = { low: 1, high: 5 }

export function Meter({ value, reference, status, label }: { value: number; reference: number; status: Status | 'none'; label: string }) {
  const at = (x: number) => `${Math.min(100, Math.max(0, ((x - METER.low) / (METER.high - METER.low)) * 100))}%`
  return (
    <div className="meter" role="img" aria-label={label}>
      <span className="meter-track" />
      <span className="meter-ok" style={{ width: at(reference) }} />
      <span className="meter-mark" style={{ left: at(reference) }} />
      <span className={`meter-dot meter-${status}`} style={{ left: at(value) }} />
    </div>
  )
}
