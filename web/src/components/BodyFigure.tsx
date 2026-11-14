import type { BodyPart, Status } from '../api.ts'
import { t, tn } from '../i18n.ts'
import { BODY_PART_LABEL } from '../symptoms.ts'

// A calm, solid figure of the body. A part with a problem takes the status color.
// A normal part keeps the neutral color, so the eye goes to the problem.
// Each point of an axis is [height, center, radius] in a drawing of 300 by 560.
type Axis = [number, number, number][]
const C = 150
const mirror = (axis: Axis): Axis => axis.map(([y, x, r]) => [y, 2 * C - x, r])
function at(axis: Axis, y: number): [number, number, number] {
  for (let i = 0; i < axis.length - 1; i++) {
    const a = axis[i]
    const b = axis[i + 1]
    if (y >= a[0] && y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0] || 1)
      return [y, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    }
  }
  return axis[axis.length - 1]
}
function outline(axes: Axis[]) {
  return axes
    .map((axis) => {
      const left: string[] = []
      const right: string[] = []
      for (let y = axis[0][0]; y <= axis[axis.length - 1][0]; y += 2) {
        const [, x, r] = at(axis, y)
        left.push(`${(x - r).toFixed(1)} ${y}`)
        right.unshift(`${(x + r).toFixed(1)} ${y}`)
      }
      return `M${left.join('L')}L${right.join('L')}Z`
    })
    .join('')
}

const head: Axis = []
for (let y = 20; y <= 92; y += 2) {
  const t = (y - 56) / 37
  const jaw = y > 62 ? 1 - ((y - 62) / 30) * 0.3 : 1
  head.push([y, C, Math.max(3, 28 * Math.sqrt(Math.max(0.02, 1 - t * t)) * jaw)])
}
head.push([94, C, 11.5], [108, C, 12.5])
const arm: Axis = [[116, C - 60, 8], [122, C - 63, 15], [150, C - 67, 13.5], [202, C - 72, 10.5], [222, C - 74, 11], [284, C - 80, 7.5], [294, C - 81, 9], [311, C - 82, 8], [321, C - 82, 3.5]]
const leg: Axis = [[266, C - 25, 24], [284, C - 26, 25.5], [330, C - 26, 21], [396, C - 24, 15], [410, C - 24, 14.5], [440, C - 24, 16], [500, C - 22, 9], [520, C - 22, 8.5], [530, C - 23, 12], [538, C - 23, 11]]

const PATH: Record<BodyPart, string> = {
  legs: outline([leg, mirror(leg)]),
  arms: outline([arm, mirror(arm)]),
  abdomen: outline([[[196, C, 42], [216, C, 40], [234, C, 43], [252, C, 49], [266, C, 50], [278, C, 45]]]),
  chest: outline([[[106, C, 13], [113, C, 36], [120, C, 51], [130, C, 56], [150, C, 54], [172, C, 48], [198, C, 42]]]),
  head: outline([head]),
}
const MARK: Record<BodyPart, [number, number]> = { head: [150, 56], chest: [150, 150], abdomen: [150, 236], arms: [224, 250], legs: [176, 400] }
const ORDER: BodyPart[] = ['legs', 'arms', 'abdomen', 'chest', 'head']
// The status word in small letters, for the text that a screen reader reads.
const STATUS_WORD: Record<Status, string> = { normal: t('normal'), caution: t('caution'), alert: t('alert') }

type Props = {
  statuses: Record<BodyPart, Status>
  symptomCounts: Partial<Record<BodyPart, number>>
  selected: BodyPart | null
  onSelect: (part: BodyPart) => void
}

export function BodyFigure({ statuses, symptomCounts, selected, onSelect }: Props) {
  const describe = (part: BodyPart) => {
    const names = { part: t(BODY_PART_LABEL[part]), status: STATUS_WORD[statuses[part]] }
    const count = symptomCounts[part]
    return count ? tn(count, '{part}: {status}, {count} open symptom', '{part}: {status}, {count} open symptoms', names) : t('{part}: {status}', names)
  }
  return (
    <svg className="body-figure" viewBox="0 0 300 560" role="group" aria-label={t('Body of the crew member')}>
      {ORDER.map((part) => (
        <path
          key={part}
          d={PATH[part]}
          className={`body-part body-${statuses[part]} ${selected === part ? 'selected' : ''}`}
          role="button"
          tabIndex={0}
          aria-pressed={selected === part}
          aria-label={describe(part)}
          onClick={() => onSelect(part)}
          onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onSelect(part)}
        />
      ))}
      {ORDER.filter((part) => statuses[part] !== 'normal').map((part) => (
        <g key={part} className={`body-ring status-${statuses[part]}`} aria-hidden="true">
          <circle cx={MARK[part][0]} cy={MARK[part][1]} r={part === 'head' ? 48 : 40} />
          <circle cx={MARK[part][0]} cy={MARK[part][1]} r={part === 'head' ? 62 : 54} opacity="0.45" />
        </g>
      ))}
    </svg>
  )
}
