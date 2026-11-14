import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, missionDay, useCatalog, type MissionSummary } from '../api.ts'
import { Icon } from '../components/Icon.tsx'
import { LANGS, lang, setLang, t, tn } from '../i18n.ts'
import './home.css'

export function Home() {
  const catalog = useCatalog()
  const navigate = useNavigate()
  const [missions, setMissions] = useState<MissionSummary[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () =>
    api<MissionSummary[]>('/missions')
      .then(setMissions)
      .catch((cause: Error) => setError(cause.message))
  useEffect(() => {
    load()
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const { id } = await api<{ id: string }>('/missions', { name })
      navigate(`/m/${id}`)
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  async function remove(mission: MissionSummary) {
    if (!window.confirm(t('Delete the mission "{name}" and all its data?', { name: mission.name }))) return
    await api(`/missions/${mission.id}`, undefined, 'DELETE').catch((cause: Error) => setError(cause.message))
    load()
  }

  const days = catalog ? Math.round(catalog.dataset.hours / 24) : 0
  // The sentence about the record has a link in it. The link goes where the translation has {link}.
  const [beforeLink, afterLink] = t('of real cabin data: the record of the NASA mission {mission} in the {link}', { mission: catalog?.dataset.source.mission ?? '' }).split('{link}')

  return (
    <div className="hm">
      <header className="hm-top">
        <span className="brand">nexxo</span>
        <span className="hm-top-side">
          <span className="muted small">{t('NASA Space Apps prototype')}</span>
          <span className="segmented hm-langs" role="group" aria-label={t('Language')}>
            {LANGS.map((item) => (
              <button type="button" key={item.id} aria-pressed={lang === item.id} lang={item.id} aria-label={item.label} title={item.label} onClick={() => setLang(item.id)}>
                {item.short}
              </button>
            ))}
          </span>
        </span>
      </header>

      <section className="hm-hero">
        <h1>{t('Health monitoring for crews in space.')}</h1>
        <p>{t('One clear thing to do for each crew member, from real cabin data of the International Space Station and a model of the body.')}</p>
      </section>

      {catalog && (
        <section className="hm-facts" aria-label={t('The data of the app')}>
          <div className="hm-fact">
            <strong>{tn(days, '1 day', '{count} days')}</strong>
            <span>
              {beforeLink}
              <a href={catalog.dataset.source.url} target="_blank" rel="noreferrer">{t('NASA Open Science Data Repository')}</a>
              {afterLink}
            </span>
          </div>
          <div className="hm-fact">
            <strong>{catalog.indicators.length}</strong>
            <span>{t('values of the cabin and the body, each with its limits and its source')}</span>
          </div>
          <div className="hm-fact">
            <strong>4</strong>
            <span>{t('crew members with roles. A model gives their body values.')}</span>
          </div>
        </section>
      )}
      {error && <p role="alert">{error}</p>}

      <section className="card-inverse hm-start">
        <h2>{t('Start a mission')}</h2>
        <form className="hm-form" onSubmit={create}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('Name of the mission')} aria-label={t('Name of the mission')} maxLength={60} />
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
            {busy ? t('Loading the NASA record…') : t('Start')}
          </button>
        </form>
        <p className="muted small">{t('A mission has its own address. Open the dashboard on one screen and the simulator on a phone.')}</p>
      </section>

      <section className="hm-list">
        <h2>{t('Missions')}</h2>
        {missions === null && <p className="muted">{t('Loading…')}</p>}
        {missions?.length === 0 && <p className="muted">{t('No mission yet. Start the first one above.')}</p>}
        {missions?.map((mission) => (
          <div key={mission.id} className="hm-mission">
            <span className="hm-mission-name">
              <strong>{mission.name}</strong>
              <span className="muted small">{t('Flight day {day}', { day: missionDay(mission.hour - 1) })}</span>
            </span>
            <span className="hm-mission-actions">
              <Link className="btn btn-primary" to={`/m/${mission.id}`}>
                {t('Dashboard')}
              </Link>
              <Link className="btn" to={`/m/${mission.id}/admin`}>
                {t('Simulator')}
              </Link>
              <button type="button" className="hm-delete" onClick={() => remove(mission)} aria-label={t('Delete {name}', { name: mission.name })} title={t('Delete the mission')}>
                <Icon name="close" size={18} />
              </button>
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
