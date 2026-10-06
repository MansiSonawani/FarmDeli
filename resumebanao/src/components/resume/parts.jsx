import { Mail, Phone, MapPin, Globe, Link as LinkIcon } from 'lucide-react'
import { SECTION_TYPES } from '../../lib/defaults'
import { useMemo } from 'react'
import { formatRange, hrefFor } from '../../lib/format'
import { isRichTextEmpty, sanitizeRichText } from '../../lib/richtext'

// Building blocks of the resume document. Rendered by blocks.jsx.

export function RichText({ text, links = true }) {
  const html = useMemo(() => (isRichTextEmpty(text) ? '' : sanitizeRichText(text, { links })), [text, links])
  if (!html) return null
  // Sanitized above: only formatting tags, safe links and text alignment survive.
  return <div className="cv-rich" dangerouslySetInnerHTML={{ __html: html }} />
}

export function Heading({ title, style }) {
  const classes = ['cv-heading', `cv-heading-${style.headingStyle}`]
  if (style.headingUppercase) classes.push('cv-heading-upper')
  return <div className={classes.join(' ')}>{title}</div>
}

const CONTACT_FIELDS = [
  ['email', Mail, 'email'],
  ['phone', Phone, 'phone'],
  ['location', MapPin, null],
  ['website', Globe, 'url'],
  ['linkedin', LinkIcon, 'url'],
]

export function ContactList({ personal, style, links, stacked = false }) {
  const items = CONTACT_FIELDS.filter(([field]) => personal[field])
  if (!items.length) return null
  return (
    <div className={`cv-contact ${stacked ? 'cv-contact-stack' : ''}`}>
      {items.map(([field, Icon, kind]) => {
        const value = personal[field]
        const content = (
          <>
            {style.showIcons && <Icon strokeWidth={2} aria-hidden="true" />}
            <span>{value}</span>
          </>
        )
        const href = links && kind ? hrefFor(value, kind) : null
        return href ? (
          <a key={field} className="cv-contact-item" href={href}>
            {content}
          </a>
        ) : (
          <span key={field} className="cv-contact-item">
            {content}
          </span>
        )
      })}
    </div>
  )
}

export function Photo({ personal, style }) {
  if (!style.showPhoto || !personal.photo) return null
  return <img className={`cv-photo cv-photo-${style.photoShape}`} src={personal.photo} alt="" />
}

export function FullHeader({ personal, style, links }) {
  const classes = ['cv-header']
  if (style.headerAlign === 'center') classes.push('cv-center')
  const band = style.colorMode === 'header'
  if (band) classes.push('cv-band')
  const bandStyle = band
    ? {
        margin: `-${style.margin}mm -${style.margin}mm 0`,
        padding: `${style.margin * 0.8}mm ${style.margin}mm`,
      }
    : undefined
  return (
    <div style={{ paddingBottom: `${style.sectionGap + 1}mm` }}>
      <div className={classes.join(' ')} style={bandStyle}>
        <Photo personal={personal} style={style} />
        <div style={{ minWidth: 0, flex: style.headerAlign === 'center' ? undefined : 1 }}>
          {personal.fullName && <div className="cv-name">{personal.fullName}</div>}
          {personal.jobTitle && <div className="cv-job-title">{personal.jobTitle}</div>}
          <ContactList personal={personal} style={style} links={links} />
        </div>
      </div>
    </div>
  )
}

export function Entry({ entry, style, links }) {
  const dates = formatRange(entry, style.dateFormat)
  return (
    <div>
      {(entry.title || dates) && (
        <div className="cv-entry-row">
          <span className="cv-entry-title">{entry.title}</span>
          {dates && <span className="cv-entry-meta">{dates}</span>}
        </div>
      )}
      {(entry.subtitle || entry.location) && (
        <div className="cv-entry-row">
          <span className="cv-entry-subtitle">{entry.subtitle}</span>
          {entry.location && <span className="cv-entry-meta">{entry.location}</span>}
        </div>
      )}
      {entry.link && (
        <div className="cv-entry-link">
          {links ? <a href={hrefFor(entry.link, 'url')}>{entry.link}</a> : entry.link}
        </div>
      )}
      <RichText text={entry.description} links={links} />
    </div>
  )
}

export function Tags({ section, style }) {
  const def = SECTION_TYPES[section.type] ?? {}
  const items = section.items.filter((t) => t.name)
  const levelLabel = (t) => (def.levels && t.level ? def.levels[t.level] : '')
  const detail = (t) => [t.info, levelLabel(t)].filter(Boolean).join(' · ')

  if (style.tagStyle === 'comma') {
    return (
      <div>
        {items.map((t, i) => (
          <span key={t.id}>
            <span className="cv-tag-name">{t.name}</span>
            {detail(t) && <span className="cv-pill-info"> ({detail(t)})</span>}
            {i < items.length - 1 && ', '}
          </span>
        ))}
      </div>
    )
  }

  if (style.tagStyle === 'pills') {
    return (
      <div className="cv-pills">
        {items.map((t) => (
          <span key={t.id} className="cv-pill">
            {t.name}
            {detail(t) && <span className="cv-pill-info"> · {detail(t)}</span>}
          </span>
        ))}
      </div>
    )
  }

  const showBars = style.tagStyle === 'bars' && def.levels
  return (
    <div className="cv-tag-list">
      {items.map((t) => (
        <div key={t.id}>
          <div className="cv-tag-row">
            <span className="cv-tag-name">{t.name}</span>
            {!showBars && levelLabel(t) && <span className="cv-entry-meta">{levelLabel(t)}</span>}
          </div>
          {t.info && <div className="cv-pill-info">{t.info}</div>}
          {showBars && t.level > 0 && (
            <div className="cv-bar">
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={n <= t.level ? 'on' : ''} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
