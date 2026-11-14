import type { Indicator, Status } from '../api.ts'
import { t } from '../i18n.ts'

// A thin line with the normal zone marked and a dot for the value.
// It answers "is this value normal, and how far is it from normal?" in one look.
export function RangeBar({ indicator, value, status, baseline }: { indicator: Indicator; value: number; status: Status; baseline?: number }) {
  const bounds = [...indicator.normal, ...indicator.caution].filter((bound): bound is number => bound !== null)
  const low0 = Math.min(...bounds)
  const high0 = Math.max(...bounds)
  const span = high0 - low0 || Math.abs(high0) * 0.5 || 1
  // A value with only an upper limit, such as CO2, starts its scale at 0. So the normal zone is wide and the dot shows how far the value is above it.
  const onlyUpper = indicator.normal[0] === null && indicator.caution[0] === null && low0 > 0
  const low = Math.min(value, onlyUpper ? 0 : low0 - span * 0.35)
  const high = Math.max(value, high0 + span * 0.35)
  const at = (x: number) => Math.min(100, Math.max(0, ((x - low) / (high - low)) * 100))
  const zoneStart = at(indicator.normal[0] ?? low)
  const zoneEnd = at(indicator.normal[1] ?? high)
  return (
    <span className="range" aria-hidden="true">
      <span className="range-track" />
      <span className="range-zone" style={{ left: `${zoneStart}%`, width: `${zoneEnd - zoneStart}%` }} />
      {baseline !== undefined && <span className="range-usual" style={{ left: `${at(baseline)}%` }} title={t('Your usual value')} />}
      <span className={`range-dot status-bg-${status}`} style={{ left: `${at(value)}%` }} />
    </span>
  )
}
