import { Mail, Phone, MapPin, Globe, Link as LinkIcon } from 'lucide-react'
import { SECTION_TYPES } from '../../lib/defaults'
import { formatRange, hrefFor, parseRichText } from '../../lib/format'
import { PAGE_SIZES } from '../../lib/paginate'

// Turns resume data + style into the page geometry and a flat list of
// unsplittable "blocks" per column. The paginator measures these blocks and
// distributes them over pages.

export function pageGeometry(style) {
  const page = PAGE_SIZES[style.pageSize] ?? PAGE_SIZES.A4
  const inner = page.width - 2 * style.margin
  const twoCol = style.layout !== 'one'
  const side = twoCol ? (inner * style.sidebarWidth) / 100 : 0
  const main = twoCol ? inner - side - style.columnGap : inner
  const columns = !twoCol
    ? [{ name: 'main', width: main }]
    : style.layout === 'left'
      ? [
          { name: 'side', width: side },
          { name: 'main', width: main },
        ]
      : [
          { name: 'main', width: main },
          { name: 'side', width: side },
        ]
  const sidebarFilled = twoCol && style.colorMode === 'sidebar'
  return { ...page, inner, columns, twoCol, sidebarFilled }
}

export function cssVars(style) {
  return {
    '--cv-font': `"${style.fontFamily}", Helvetica, Arial, sans-serif`,
    '--cv-heading-font': `"${style.headingFontFamily || style.fontFamily}", Helvetica, Arial, sans-serif`,
    '--cv-font-size': `${style.fontSize}pt`,
    '--cv-line-height': style.lineHeight,
    '--cv-accent': style.accentColor,
    '--cv-name-size': `${style.nameSize}pt`,
    '--cv-name-color': style.colorMode === 'accent' && style.headingStyle !== 'bar' ? '#111827' : undefined,
  }
}

function RichText({ text }) {
  const blocks = parseRichText(text)
  if (!blocks.length) return null
  const renderSpans = (spans) =>
    spans.map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))
  return (
    <div className="cv-rich">
      {blocks.map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i}>
            {block.items.map((spans, j) => (
              <li key={j}>{renderSpans(spans)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{renderSpans(block.spans)}</p>
        ),
      )}
    </div>
  )
}

function Heading({ title, style }) {
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

function ContactList({ personal, style, links, stacked = false }) {
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

function Photo({ personal, style }) {
  if (!style.showPhoto || !personal.photo) return null
  return <img className={`cv-photo cv-photo-${style.photoShape}`} src={personal.photo} alt="" />
}

function FullHeader({ personal, style, links }) {
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

function hasEntryContent(entry) {
  return Boolean(entry.title || entry.subtitle || entry.description || entry.startDate || entry.endDate)
}

function Entry({ entry, style, links }) {
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
      <RichText text={entry.description} />
    </div>
  )
}

function Tags({ section, style }) {
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

// Returns { header, columns: { main: [block], side: [block] } }
// where block = { key, node, gap } and gap is the trailing space in mm.
// `links: false` renders contact details as plain text (for thumbnails inside links).
export function buildBlocks(data, style, { links = true } = {}) {
  const geometry = pageGeometry(style)
  const personal = data.personal ?? {}
  const columns = Object.fromEntries(geometry.columns.map((c) => [c.name, []]))
  let header = null

  if (geometry.sidebarFilled) {
    // Name in the main column, photo + contact details at the top of the sidebar.
    columns.main.push({
      key: 'header-main',
      gap: style.sectionGap + 1,
      node: (
        <div className="cv-header">
          <div style={{ minWidth: 0 }}>
            {personal.fullName && <div className="cv-name">{personal.fullName}</div>}
            {personal.jobTitle && <div className="cv-job-title">{personal.jobTitle}</div>}
          </div>
        </div>
      ),
    })
    columns.side.push({
      key: 'header-side',
      gap: style.sectionGap + 1,
      node: (
        <div className="cv-side-header">
          <Photo personal={personal} style={style} />
          <ContactList personal={personal} style={style} links={links} stacked />
        </div>
      ),
    })
  } else {
    header = <FullHeader personal={personal} style={style} links={links} />
  }

  for (const section of data.sections ?? []) {
    if (!section.visible) continue
    const def = SECTION_TYPES[section.type]
    if (!def) continue
    const column = geometry.twoCol && section.column === 'side' ? 'side' : 'main'
    const heading = <Heading title={section.title} style={style} />
    const list = columns[column]

    if (def.kind === 'text') {
      if (!section.content?.trim()) continue
      list.push({
        key: section.id,
        gap: style.sectionGap,
        node: (
          <div>
            {heading}
            <RichText text={section.content} />
          </div>
        ),
      })
    } else if (def.kind === 'tags') {
      if (!section.items.some((t) => t.name)) continue
      list.push({
        key: section.id,
        gap: style.sectionGap,
        node: (
          <div>
            {heading}
            <Tags section={section} style={style} />
          </div>
        ),
      })
    } else {
      const entries = section.items.filter(hasEntryContent)
      entries.forEach((entry, index) => {
        const last = index === entries.length - 1
        list.push({
          key: `${section.id}:${entry.id}`,
          gap: last ? style.sectionGap : style.entryGap,
          node: (
            <div>
              {/* The heading stays glued to the first entry so it is never orphaned at a page bottom. */}
              {index === 0 && heading}
              <Entry entry={entry} style={style} links={links} />
            </div>
          ),
        })
      })
    }
  }

  return { geometry, header, columns }
}
