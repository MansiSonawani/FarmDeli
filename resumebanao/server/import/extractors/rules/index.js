import { SECTION_TYPES } from '../../../../src/lib/defaults.js'
import { extractContact } from './contact.js'
import { buildDescription, parseEntries } from './entries.js'
import { splitSections } from './sections.js'
import { parseTags } from './tags.js'
import { wrapGapOf } from './wrap.js'

// The rule-based extractor: no external services, no AI. It finds the sections of the resume, the contact
// details, and the dated entries, using how the document is laid out. Accuracy is best on simple one-column
// files and drops with unusual designs; the editor tells users to review what was imported.

const ORDER = [
  'summary',
  'experience',
  'education',
  'projects',
  'skills',
  'languages',
  'certificates',
  'awards',
  'volunteering',
  'interests',
]

const weightedMedian = (pairs) => {
  const sorted = [...pairs].sort((a, b) => a[0] - b[0])
  const half = sorted.reduce((sum, [, weight]) => sum + weight, 0) / 2
  let seen = 0
  for (const [value, weight] of sorted) {
    seen += weight
    if (seen >= half) return value
  }
  return undefined
}

// Typical body text size, and the right-hand edge of text in each column. A line that stops short of that
// edge was not wrapped, so the next line starts something new.
function analyze(lines) {
  const sized = lines.filter((l) => l.fontSize)
  const bodyFont = sized.length ? weightedMedian(sized.map((l) => [l.fontSize, l.text.length])) : undefined

  const edges = new Map()
  for (const line of lines) {
    if (line.x === undefined || line.text.includes('\t') || line.text.length < 30) continue
    const list = edges.get(line.column) ?? []
    list.push(line.x + line.width)
    edges.set(line.column, list)
  }
  const observed = new Map(
    [...edges].map(([column, list]) => [column, list.sort((a, b) => a - b)[Math.floor((list.length - 1) * 0.98)]]),
  )
  const leftOf = new Map()
  for (const line of lines) {
    if (line.x !== undefined) leftOf.set(line.column, Math.min(leftOf.get(line.column) ?? Infinity, line.x))
  }

  // The longest lines show where the margin is, but only if some line really reaches it. When all lines are
  // short (one-line bullets), the reader's estimate from the page width is the better guide.
  const rightEdge = (line) => {
    const seen = observed.get(line.column)
    const limit = line.rightLimit
    if (limit === undefined) return seen
    if (seen === undefined) return limit
    const left = leftOf.get(line.column) ?? 0
    return seen >= limit - 0.15 * (limit - left) ? seen : limit
  }
  return { bodyFont, wrap: { rightEdge, wrapGap: wrapGapOf(lines) } }
}

function buildSection(section, context) {
  const type = SECTION_TYPES[section.type] ? section.type : 'custom'
  const def = SECTION_TYPES[type]
  const lines = section.lines

  if (def.kind === 'text') {
    const xs = lines.map((l) => l.x).filter((x) => x !== undefined)
    const content = buildDescription(lines, {
      baseX: xs.length ? Math.min(...xs) : undefined,
      wrap: context.wrap,
    })
    return content ? { type, title: section.title, content } : null
  }
  if (def.kind === 'tags') {
    const items = parseTags(lines, type, context.wrap)
    return items.length ? { type, title: section.title, items } : null
  }
  const items = parseEntries(lines, def, { ...context, type })
  return items.length ? { type, title: section.title, items } : null
}

/** @type {import('../../types.js').Extractor} */
export default {
  name: 'rules',
  async extract(doc) {
    const context = analyze(doc.lines)
    const { zones, sections } = splitSections(doc.lines, context)

    const contactLines = sections.filter((s) => s.type === 'contact').flatMap((s) => s.lines)
    const personal = extractContact(zones, contactLines, doc.text)

    let built = sections
      .filter((s) => s.type !== 'contact' && s.type !== 'ignore')
      .map((s) => buildSection(s, context))
      .filter(Boolean)
    // In a two-column file the sections come out column by column (the whole sidebar first), which is not
    // the order a reader sees them in. Use the usual resume order instead; custom sections keep their order.
    if (doc.columns === 2) {
      const rank = (type) => (ORDER.includes(type) ? ORDER.indexOf(type) : ORDER.length)
      built = built
        .map((s, i) => ({ s, i }))
        .sort((a, b) => rank(a.s.type) - rank(b.s.type) || a.i - b.i)
        .map(({ s }) => s)
    }

    const warnings = []
    if (!personal.fullName) {
      warnings.push({ code: 'NO_NAME', message: "We couldn't find your name. Please add it.", field: 'fullName' })
    }
    if (built.length === 0) {
      warnings.push({
        code: 'NO_SECTIONS',
        message:
          "We couldn't recognise sections such as experience or education in this file. Please add your details.",
      })
    }
    if (doc.kind === 'docx' && !personal.email && !personal.phone) {
      warnings.push({
        code: 'CONTACT_MISSING',
        message:
          "We couldn't find your email or phone. In Word files they are sometimes in the page header, which can't be read. Please add them.",
      })
    }
    return { data: { personal, sections: built }, warnings, extractor: 'rules' }
  },
}
