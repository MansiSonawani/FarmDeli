import { SECTION_TYPES, newEntry, newSection, newTag } from '../../src/lib/defaults.js'
import { legacyToHtml } from '../../src/lib/richtext-html.js'
import { ImportError } from './errors.js'

// Turns whatever an extractor produced into data the editor can use (T12b). Every extractor goes through this:
// valid dates, the HTML the rich text editor stores, ids and defaults from the app's own factories, merged
// duplicate sections, and length limits. Extractors can therefore stay simple.

const LIMITS = { name: 120, line: 200, link: 300, sectionTitle: 80, text: 5_000, entries: 50, tags: 100, sections: 20 }
const DATE = /^\d{4}(-(0[1-9]|1[0-2]))?$/

// Drops control characters (keeping newlines and tabs) and trims.
const clean = (value, max) => {
  if (typeof value !== 'string') return ''
  let out = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code >= 32 || code === 10 || code === 9) out += ch
  }
  return out.trim().slice(0, max)
}

const html = (text) => (text ? legacyToHtml(clean(text, LIMITS.text)) : '')
const hasText = (htmlText) => htmlText.replace(/<[^>]*>/g, '').trim() !== ''

function entryFrom(raw, def) {
  const entry = {
    ...newEntry(),
    title: clean(raw.title, LIMITS.line),
    subtitle: clean(raw.subtitle, LIMITS.line),
    location: clean(raw.location, LIMITS.line),
    link: def.fields.link ? clean(raw.link, LIMITS.link) : '',
    startDate: DATE.test(raw.startDate ?? '') ? raw.startDate : '',
    endDate: DATE.test(raw.endDate ?? '') ? raw.endDate : '',
    current: raw.current === true,
    description: html(raw.description),
  }
  if (entry.current) entry.endDate = ''
  if (!def.dates) Object.assign(entry, { startDate: '', endDate: '', current: false })
  const empty = !(entry.title || entry.subtitle || hasText(entry.description) || entry.startDate || entry.endDate)
  return empty ? null : entry
}

function tagFrom(raw, def) {
  const name = clean(raw.name, LIMITS.line)
  if (!name) return null
  const maxLevel = def.levels ? def.levels.length - 1 : 0
  const level = Number.isInteger(raw.level) ? Math.min(Math.max(raw.level, 0), maxLevel) : 0
  return { ...newTag(), name, info: clean(raw.info, LIMITS.line), level }
}

/**
 * @param {import('./types.js').ImportResult} result
 * @returns {import('./types.js').ImportResult}
 */
export function normalize(result) {
  const raw = result.data ?? {}
  const p = raw.personal ?? {}
  const personal = {
    fullName: clean(p.fullName, LIMITS.name),
    jobTitle: clean(p.jobTitle, LIMITS.line),
    email: clean(p.email, LIMITS.line),
    phone: clean(p.phone, 40),
    location: clean(p.location, LIMITS.line),
    website: clean(p.website, LIMITS.link),
    linkedin: clean(p.linkedin, LIMITS.link),
    photo: '',
  }

  const sections = []
  const byType = new Map() // each built-in section type appears once; duplicates are merged
  for (const rawSection of Array.isArray(raw.sections) ? raw.sections.slice(0, LIMITS.sections) : []) {
    const type = SECTION_TYPES[rawSection?.type] ? rawSection.type : 'custom'
    const def = SECTION_TYPES[type]
    const title = clean(rawSection.title, LIMITS.sectionTitle) || def.label

    let section = type === 'custom' ? null : byType.get(type)
    if (!section) {
      section = { ...newSection(type), title, items: [] }
      sections.push(section)
      if (type !== 'custom') byType.set(type, section)
    }

    if (def.kind === 'text') {
      const content = html(rawSection.content)
      section.content = section.content ? section.content + content : content
    } else if (def.kind === 'tags') {
      const items = (rawSection.items ?? []).map((t) => tagFrom(t, def)).filter(Boolean)
      section.items.push(
        ...items.filter((t) => !section.items.some((s) => s.name.toLowerCase() === t.name.toLowerCase())),
      )
      section.items = section.items.slice(0, LIMITS.tags)
    } else {
      section.items.push(...(rawSection.items ?? []).map((e) => entryFrom(e, def)).filter(Boolean))
      section.items = section.items.slice(0, LIMITS.entries)
    }
  }

  const usable = sections.filter((s) =>
    SECTION_TYPES[s.type].kind === 'text' ? hasText(s.content) : s.items.length > 0,
  )
  if (!personal.fullName && usable.length === 0) {
    throw new ImportError(422, 'NO_CONTENT', "We couldn't find any resume content in that file.")
  }
  return { ...result, data: { personal, sections: usable } }
}
