import { SOURCE_LABEL, STATUS_LABEL, type Status } from '../api.ts'
import { t } from '../i18n.ts'

// Each status has a shape and a word, so the color is never the only sign.
const SHAPE: Record<Status, string> = { normal: '●', caution: '▲', alert: '■' }

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status}`}>
      <span aria-hidden="true">{SHAPE[status]}</span> {STATUS_LABEL[status]}
    </span>
  )
}

export function SourceTag({ source }: { source: string }) {
  const real = source.startsWith('nasa')
  return (
    <span className={`source ${real ? 'source-real' : ''}`} title={t('Where this value comes from')}>
      {SOURCE_LABEL[source] ?? source}
    </span>
  )
}
