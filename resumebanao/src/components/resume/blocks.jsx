import { SECTION_TYPES } from '../../lib/defaults'
import { pageGeometry } from '../../lib/geometry'
import { ContactList, Entry, FullHeader, Heading, Photo, RichText, Tags } from './parts'

// Turns resume data + style into a flat list of unsplittable "blocks" per column.
// The paginator measures these blocks and distributes them over pages.

function hasEntryContent(entry) {
  return Boolean(entry.title || entry.subtitle || entry.description || entry.startDate || entry.endDate)
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
