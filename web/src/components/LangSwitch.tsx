// The language switch: one button for each language. A choice saves the language and loads the page again.
import { LANGS, lang, setLang, t } from '../i18n.ts'

// short: show the short name of each language, for a place with little room.
export function LangSwitch({ className = '', short = false }: { className?: string; short?: boolean }) {
  return (
    <div className={`segmented lang-switch ${className}`} role="group" aria-label={t('Language')}>
      {LANGS.map((item) => (
        <button type="button" key={item.id} aria-pressed={lang === item.id} aria-label={item.label} onClick={() => setLang(item.id)}>
          {short ? item.short : item.label}
        </button>
      ))}
    </div>
  )
}
