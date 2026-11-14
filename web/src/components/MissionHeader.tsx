import { Link } from 'react-router-dom'
import { formatTime, missionDay, type Snapshot } from '../api.ts'
import { t } from '../i18n.ts'

export function MissionHeader({ snapshot, page }: { snapshot: Snapshot; page: 'dashboard' | 'admin' }) {
  const { mission } = snapshot
  return (
    <header className="mission-header">
      <div>
        <Link to="/" className="muted small">
          ← {t('All missions')}
        </Link>
        <h1>{mission.name}</h1>
      </div>
      <div className="clock">
        <strong>{t('Day {day}', { day: missionDay(mission.hour - 1) })}</strong>
        <span>{formatTime(new Date(mission.now))} UTC</span>
        {mission.autoRun && <span className="badge live">● {t('Clock runs')}</span>}
      </div>
      <nav className="row">
        <Link to={`/m/${mission.id}`} className={`tab ${page === 'dashboard' ? 'active' : ''}`}>
          {t('Dashboard')}
        </Link>
        <Link to={`/m/${mission.id}/admin`} className={`tab ${page === 'admin' ? 'active' : ''}`}>
          {t('Simulator')}
        </Link>
      </nav>
    </header>
  )
}
