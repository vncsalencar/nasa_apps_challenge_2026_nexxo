// The links to the pages of the app, for the top bar of each page. The simulator page has no link:
// the presenter types /simulator in the address bar.
import { NavLink } from 'react-router-dom'
import { t } from '../i18n.ts'
import './pagetabs.css'

export function PageTabs() {
  // NavLink sets aria-current="page" on the link of the open page.
  return (
    <nav className="tabs" aria-label={t('Pages')}>
      <NavLink to="/" end>
        {t('CO2 exposure')}
      </NavLink>
      <NavLink to="/trip">{t('Trip forecast')}</NavLink>
      <NavLink to="/helmet">{t('Helmet')}</NavLink>
    </nav>
  )
}
