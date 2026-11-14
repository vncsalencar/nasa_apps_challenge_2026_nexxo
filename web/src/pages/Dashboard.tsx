import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Assistant } from '../components/Assistant.tsx'
import { Icon, type IconName } from '../components/Icon.tsx'
import { STATUS_LABEL, formatTime, missionDay, useCatalog, useMission, useSeries } from '../api.ts'
import { SHEET_LABEL, type Ctx, type SheetTab } from '../context.ts'
import { SHAPE, situation } from '../derive.ts'
import { LANGS, lang, setLang, t } from '../i18n.ts'
import { MODES, useMode, type Mode } from '../theme.ts'

// Each home mode and each sheet loads on its own. An error in one does not break the others.
const HOMES: Record<Mode, React.LazyExoticComponent<(ctx: Ctx) => ReactNode>> = {
  readiness: lazy(() => import('../homes/Readiness.tsx')),
  bridge: lazy(() => import('../homes/Bridge.tsx')),
  companion: lazy(() => import('../homes/Companion.tsx')),
}
const SHEETS: Record<SheetTab, React.LazyExoticComponent<(ctx: Ctx) => ReactNode>> = {
  body: lazy(() => import('../sheets/BodySheet.tsx')),
  cabin: lazy(() => import('../sheets/CabinSheet.tsx')),
  checkups: lazy(() => import('../sheets/CheckupsSheet.tsx')),
  alerts: lazy(() => import('../sheets/AlertsSheet.tsx')),
  history: lazy(() => import('../sheets/HistorySheet.tsx')),
  log: lazy(() => import('../sheets/LogSheet.tsx')),
}
const AlertOverlay = lazy(() => import('../sheets/AlertOverlay.tsx'))
const TABS = Object.keys(SHEET_LABEL) as SheetTab[]
// The top bar shows these screens. The mission log is in the menu.
const NAV_TABS: SheetTab[] = ['body', 'cabin', 'checkups', 'alerts', 'history']
// The bottom bar of the phone has room for five places. The log is in the menu there.
const PHONE_TABS: SheetTab[] = ['body', 'cabin', 'checkups', 'alerts']

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

class Guard extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return <p role="alert">{t('This part of the page ({name}) has an error. The other parts still work.', { name: this.props.name })}</p>
    return this.props.children
  }
}

export function Dashboard() {
  const { missionId = '', screen } = useParams()
  const navigate = useNavigate()
  const catalog = useCatalog()
  const { snapshot, error, version, send } = useMission(missionId, 'system')
  const [mode, setMode] = useMode()
  const [chosenCrewId, setChosenCrewId] = useState<number | null>(null)
  // Each detail screen is a page with its own address: /m/<mission>/<screen>. No screen name means the home page.
  const tab = TABS.find((item) => item === screen) ?? null
  // The indicator that the open screen must show, for example after a tap on a value of the home page.
  const [focus, setFocus] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const openSheet = (next: SheetTab, nextFocus?: string) => {
    setFocus(nextFocus ?? null)
    navigate(`/m/${missionId}/${next}`)
  }
  const closeSheet = () => {
    setFocus(null)
    navigate(`/m/${missionId}`)
  }
  // A new page starts at its top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  // The Escape key closes the menu.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // The presenter can choose from the simulator what this screen shows: the crew member,
  // the home view, and the open screen. The page follows each new choice.
  const stage = snapshot?.stage
  const [seenStage, setSeenStage] = useState(0)
  if (stage && stage.rev !== seenStage) {
    setSeenStage(stage.rev)
    if (stage.crewId !== null) setChosenCrewId(stage.crewId)
    if (stage.mode === 'readiness' || stage.mode === 'bridge' || stage.mode === 'companion') setMode(stage.mode)
    setFocus(null)
  }
  const stageRev = stage?.rev ?? 0
  const stageSheet = stage?.sheet ?? null
  useEffect(() => {
    if (stageRev === 0) return
    navigate(TABS.some((item) => item === stageSheet) ? `/m/${missionId}/${stageSheet}` : `/m/${missionId}`)
    // Only a new choice of the presenter moves the page.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRev])

  const crewId = chosenCrewId ?? snapshot?.crew[0]?.id ?? 0
  const subject = `crew:${crewId}`
  const crewSeries = useSeries(missionId, subject, 720, version)
  const cabinSeries = useSeries(missionId, 'env', 720, version)

  if (error && !snapshot) return <p className="page" role="alert">{error}</p>
  if (!snapshot || !catalog) return <p className="page muted">{t('Loading the mission…')}</p>

  const s = situation(snapshot, catalog, crewId)
  const ctx: Ctx = {
    snapshot,
    catalog,
    s,
    crewId,
    crewSeries,
    cabinSeries,
    // The person who uses the dashboard acts as the selected crew member.
    act: (path, body = {}) => send(path, body, subject),
    open: openSheet,
    // The page stays on the same screen and shows the other crew member there.
    selectCrew: (id) => {
      setChosenCrewId(id)
      setFocus(null)
      setMenuOpen(false)
    },
    focus,
  }
  const { mission } = snapshot
  const unreadList = snapshot.notifications.filter((notification) => notification.crewId === crewId && notification.readHour === null)
  const counts: Partial<Record<SheetTab, number>> = { checkups: s.pending.length, alerts: unreadList.length }
  const Home = HOMES[mode]
  const Sheet = tab ? SHEETS[tab] : null
  const me = snapshot.crew.find((member) => member.id === crewId)
  const myStatus = s.crewStatus(crewId)
  const roleLabel = (role: string) => catalog.roles.find((item) => item.id === role)?.label ?? role
  const activeTab = tab

  const viewSwitch = (
    <div className="segmented app-views" role="group" aria-label={t('View')}>
      {MODES.map((item) => (
        <button type="button" key={item.id} data-mode={item.id} aria-pressed={mode === item.id} title={item.about} onClick={() => setMode(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
  const tabButton = (tab: SheetTab, icon: IconName) => (
    <button type="button" key={tab} aria-pressed={activeTab === tab} onClick={() => openSheet(tab)}>
      <span className="app-tab-icon">
        <Icon name={icon} />
        {counts[tab] ? <span className="count">{counts[tab]}</span> : null}
      </span>
      {SHEET_LABEL[tab]}
    </button>
  )

  return (
    <div className="app">
      <header className="app-top">
        <div className="app-brand">
          <Link to="/" className="brand" aria-label={t('Nexxo, all missions')}>nexxo</Link>
          <span className="app-clock">
            {t('Flight day {day}', { day: missionDay(mission.hour - 1) })} · {formatTime(new Date(mission.now), false)} UTC
            {mission.autoRun && <span className="badge live">● {t('Live')}</span>}
          </span>
        </div>
        <nav className="app-nav" aria-label={t('Screens')}>
          <button type="button" className="pill" aria-pressed={activeTab === null} onClick={closeSheet}>{t('Home')}</button>
          {TABS.map((item) => (
            <button type="button" key={item} className="pill" data-sheet={item} hidden={!NAV_TABS.includes(item)} aria-pressed={activeTab === item} onClick={() => openSheet(item)}>
              {SHEET_LABEL[item]} {counts[item] ? <span className="count">{counts[item]}</span> : null}
            </button>
          ))}
        </nav>
        <div className="app-tools">
          {viewSwitch}
          <button type="button" className="app-me" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={t('Crew member: {name}. Open the menu.', { name: me?.name ?? '' })} onClick={() => setMenuOpen(!menuOpen)}>
            <span className={`avatar ring-${myStatus}`}>{initials(me?.name ?? '?')}</span>
            <span className="app-me-name">{me?.name.split(' ')[0]}</span>
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}

      {/* The view switch has its own line on a phone, so the crew member finds it. It belongs to the home page. */}
      <div className="app-views-row" hidden={tab !== null}>
        <span className="muted small">{t('View')}</span>
        {viewSwitch}
      </div>

      {Sheet && tab ? (
        <main className="app-screen sheet" aria-label={SHEET_LABEL[tab]}>
          <div className="sheet-body" key={`${tab}-${crewId}`}>
            <Guard name={tab}>
              <Suspense fallback={<p className="muted">{t('Loading…')}</p>}>
                <Sheet {...ctx} />
              </Suspense>
            </Guard>
          </div>
        </main>
      ) : (
        <main className="app-main">
          <Guard name={mode} key={mode}>
            <Suspense fallback={<p className="muted">{t('Loading…')}</p>}>
              <Home {...ctx} />
            </Suspense>
          </Guard>
        </main>
      )}

      <footer className="app-foot muted small">{t('Cabin values: NASA record. Body values: model. The app is a prototype and gives no medical advice.')}</footer>

      {/* The menu: the crew member, the view, and the other pages. It is always in the page, so a script can use it. */}
      {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="app-menu" role="menu" data-open={menuOpen} aria-hidden={!menuOpen}>
        <p className="app-menu-mission">
          <strong>{mission.name}</strong>
          <span className="muted small">{t('Flight day {day}', { day: missionDay(mission.hour - 1) })} · {formatTime(new Date(mission.now))} UTC</span>
        </p>
        <p className="app-menu-title">{t('Crew member')}</p>
        <div className="app-crew">
          {snapshot.crew.map((member) => {
            const status = s.crewStatus(member.id)
            return (
              <button type="button" key={member.id} role="menuitemradio" aria-checked={member.id === crewId} aria-pressed={member.id === crewId} tabIndex={menuOpen ? 0 : -1} onClick={() => ctx.selectCrew(member.id)}>
                <span className={`avatar ring-${status}`}>{initials(member.name)}</span>
                <span className="app-crew-name">
                  <strong>{member.name}</strong>
                  <span className="muted small">{roleLabel(member.role)}</span>
                </span>
                <span className={`badge status-${status}`}>
                  <span aria-hidden="true">{SHAPE[status]}</span> {STATUS_LABEL[status]}
                </span>
              </button>
            )
          })}
        </div>
        <p className="app-menu-title">{t('View')}</p>
        <div className="app-menu-views">
          {MODES.map((item) => (
            <button type="button" key={item.id} role="menuitemradio" aria-checked={mode === item.id} aria-pressed={mode === item.id} tabIndex={menuOpen ? 0 : -1} onClick={() => { setMode(item.id); setMenuOpen(false) }}>
              <strong>{item.label}</strong>
              <span className="muted small">{item.about}</span>
            </button>
          ))}
        </div>
        <p className="app-menu-title">{t('Language')}</p>
        <div className="segmented app-langs" role="group" aria-label={t('Language')}>
          {LANGS.map((item) => (
            <button type="button" key={item.id} aria-pressed={lang === item.id} lang={item.id} tabIndex={menuOpen ? 0 : -1} onClick={() => setLang(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="app-menu-links">
          <button type="button" role="menuitem" tabIndex={menuOpen ? 0 : -1} onClick={() => { openSheet('history'); setMenuOpen(false) }}>
            <Icon name="history" size={20} /> {t('My history')}
          </button>
          <button type="button" role="menuitem" tabIndex={menuOpen ? 0 : -1} onClick={() => { openSheet('log'); setMenuOpen(false) }}>
            <Icon name="log" size={20} /> {t('Mission log')}
          </button>
          <Link role="menuitem" tabIndex={menuOpen ? 0 : -1} className="btn" to={`/m/${mission.id}/admin`}>
            <Icon name="sliders" size={20} /> {t('Simulator')}
          </Link>
        </div>
      </div>

      {/* The navigation of the phone, at the bottom where the thumb is. */}
      <nav className="app-tabs" aria-label={t('Screens')}>
        <button type="button" aria-pressed={activeTab === null} onClick={closeSheet}>
          <span className="app-tab-icon"><Icon name="home" /></span>
          {t('Home')}
        </button>
        {PHONE_TABS.map((tab) => tabButton(tab, tab))}
      </nav>

      <Guard name="assistant">
        <Assistant
          missionId={mission.id}
          crewId={crewId}
          unread={unreadList}
          modelOn={snapshot.assistantModel}
          onShow={(show) => {
            if (show.mode === 'readiness' || show.mode === 'bridge' || show.mode === 'companion') setMode(show.mode)
            if (show.sheet === null) closeSheet()
            else if (show.sheet !== undefined) openSheet(show.sheet as SheetTab)
          }}
        />
      </Guard>

      <Guard name="alert">
        <Suspense fallback={null}>
          <AlertOverlay {...ctx} />
        </Suspense>
      </Guard>
    </div>
  )
}
