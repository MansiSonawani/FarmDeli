import { isLocation } from './contact.js'
import { findDateRange, findSingleDate, removeMatch } from './dates.js'
import { isKnownPlace } from './places.js'
import { continuesLine } from './wrap.js'
import {
  endsSentence,
  hasBulletGlyph,
  hasDegreeWord,
  hasOrgWord,
  hasSchoolWord,
  hasTitleWord,
  startsUpper,
  stripBullet,
  untab,
  words,
} from './text.js'

// Dated entries (T10): jobs, degrees, projects, certificates, awards, volunteering, custom sections.
//
// Entries are found by their dates (a range, or a single date for sections like education and certificates).
// An entry's "head" is the line holding the date plus the title/company/location lines beside it, in any of the
// usual arrangements:
//   Title <tab> dates          Company <tab> place                   (title and dates share a line)
//   Company / Title / dates | place                                  (dates last: the head is above)
//   Title, Company, City (dates)                                     (everything on one line)
// Everything after the head, up to the next entry, is the description.

const URL_ONLY = /^(?:https?:\/\/|www\.)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?$/i
const URL_ANYWHERE = /(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|org|io|dev|me|co|design|app|net)\/\S+/i

/**
 * Turns description lines into the app's text markup: "- " bullets and plain paragraphs, with wrapped lines
 * joined. In PDFs, bullets often have no glyph (they are drawn by the layout), so a line indented relative to
 * `baseX` is a bullet; whether an indented line starts a new bullet or continues the previous one depends on
 * whether its first word would have fitted on the previous line (see wrap.js).
 * @param {object[]} lines
 * @param {{ baseX?: number, wrap?: { rightEdge?: (line: object) => number | undefined, wrapGap?: number } }} options
 */
export function buildDescription(lines, { baseX, wrap } = {}) {
  const blocks = []
  let previous = null
  for (const line of lines) {
    const glyph = Boolean(line.listItem) || hasBulletGlyph(line.text)
    const text = untab(glyph ? stripBullet(line.text) : line.text)
    if (!text) continue
    const indented = !glyph && baseX !== undefined && line.x !== undefined && line.x > baseX + 5

    const last = blocks[blocks.length - 1]
    let continues = false
    if (last && previous && !glyph && line.page === previous.page && line.column === previous.column) {
      const sameIndent = last.glyph || last.indented === indented
      // Inside a bullet list a sentence that ends at the right edge still starts the next bullet.
      const newItem = last.bullet && endsSentence(previous.text) && startsUpper(text)
      continues = sameIndent && continuesLine(previous, line, wrap) && !newItem
    }
    if (continues) last.text += ` ${text}`
    else blocks.push({ text, bullet: glyph || indented, glyph, indented })
    previous = line
  }
  const escape = (t) => t.replace(/\*\*/g, '* *')
  return blocks.map((b) => (b.bullet ? `- ${escape(b.text)}` : escape(b.text))).join('\n')
}

// ---- cutting a head line into pieces ----

const placeLike = (text) =>
  !/\d/.test(text) &&
  words(text).length <= 3 &&
  !hasTitleWord(text) &&
  !hasOrgWord(text) &&
  !hasDegreeWord(text) &&
  !hasSchoolWord(text) &&
  /^\p{Lu}/u.test(text)

function splitChips(cell) {
  let parts = cell.split(/\s*[|•·▪●]\s*/)
  parts = parts.flatMap((part) => part.split(/\s+[–—-]\s+/))
  return parts
    .flatMap((part) => {
      const sides = part.split(/\s+(?:at|@)\s+/i)
      return sides.length === 2 && sides.every((s) => s.trim().length >= 2) ? sides : [part]
    })
    .map((p) => p.trim())
    .filter(Boolean)
}

// "Marketing Manager, Bleu Horizon Media, Lyon" -> three pieces, the last one a place.
function splitComma(chip) {
  const parts = chip.split(/\s*,\s*/).filter(Boolean)
  if (parts.length < 2 || isLocation(chip)) return [{ text: chip, place: isLocation(chip) }]
  const places = []
  while (parts.length > 2 && places.length < 2 && placeLike(parts[parts.length - 1])) places.unshift(parts.pop())
  // With only two pieces the second is usually the company, so it counts as a place only when it is a known one.
  if (parts.length === 2 && places.length === 0 && isKnownPlace(parts[1])) places.unshift(parts.pop())
  const result = parts.map((text) => ({ text, place: false }))
  if (places.length) result.push({ text: places.join(', '), place: true })
  return result
}

function piecesOf(text) {
  const pieces = []
  text.split('\t').forEach((cell, cellIndex) => {
    for (const chip of splitChips(cell)) {
      for (const piece of splitComma(chip)) {
        // A short plain word in a later cell ("Northwind Logistics <tab> Stockholm") is a place.
        const place = piece.place || (cellIndex > 0 && placeLike(piece.text))
        pieces.push({ text: piece.text, place })
      }
    }
  })
  return pieces
}

// Which of the pieces is the title (job title, degree, ...) and which the organisation.
function assign(pieces, type) {
  const fields = { title: '', subtitle: '', location: '' }
  const places = pieces.filter((p) => p.place).map((p) => p.text)
  fields.location = places.join(', ')
  const rest = pieces.filter((p) => !p.place).map((p) => p.text)
  if (rest.length === 0) return fields

  // A degree is the "title" of an education entry; a job title of everything else.
  const titleScore = (t) => ((type === 'education' ? hasDegreeWord(t) : hasTitleWord(t)) ? 2 : 0)
  // For a degree, "Software Engineering" is a subject, not a company: only school words count strongly.
  const orgScore = (t) => (hasSchoolWord(t) ? 3 : 0) + (hasOrgWord(t) ? (type === 'education' ? 1 : 2) : 0)
  const rank = (t) => titleScore(t) - orgScore(t)

  if (rest.length === 1) {
    const only = rest[0]
    if (orgScore(only) > titleScore(only)) fields.subtitle = only
    else fields.title = only
    return fields
  }
  let titleAt = 0
  rest.forEach((t, i) => {
    if (rank(t) > rank(rest[titleAt])) titleAt = i
  })
  fields.title = rest[titleAt]
  fields.subtitle = rest.filter((_, i) => i !== titleAt).join(', ')
  return fields
}

// ---- finding the entries ----

function prepare(lines, allowSingle) {
  const ys = []
  lines.forEach((line, i) => {
    const before = lines[i - 1]
    if (before && before.page === line.page && before.column === line.column && line.y > before.y)
      ys.push(line.y - before.y)
  })
  ys.sort((a, b) => a - b)
  const typicalGap = ys.length ? ys[Math.floor(ys.length / 2)] : null

  return lines.map((line, i) => {
    const bullet = Boolean(line.listItem) || hasBulletGlyph(line.text)
    const text = line.text
    const range = bullet ? null : findDateRange(text)
    const single = bullet || range || !allowSingle ? null : findSingleDate(text)
    const before = lines[i - 1]
    const breakBefore =
      i > 0 &&
      (!before || before.page !== line.page || before.column !== line.column
        ? true
        : typicalGap !== null && line.y - before.y > typicalGap * 1.45)
    return { line, text, bullet, range, single, breakBefore }
  })
}

const matchOf = (p) => p.range ?? p.single

// "Senior Designer <tab> Mar 2021 – Present" -> the text around the date.
const restOf = (p) => removeMatch(p.text, matchOf(p))

function isAnchor(p) {
  const match = matchOf(p)
  if (!match || p.bullet) return false
  const rest = untab(restOf(p))
  if (rest.length > 110 || words(rest).length > 14) return false
  if (p.range) return true
  // A single date only counts when it sits apart from the text: its own cell, or after a separator.
  const before = p.text.slice(0, match.index)
  const after = p.text.slice(match.index + match.length)
  const own = p.text.split('\t').some((cell) => cell.trim() === p.text.slice(match.index, match.index + match.length))
  const afterSeparator = /[-–—|,([]\s*$/.test(before) && !/[.!?]$/.test(rest)
  const atStart = before.trim() === '' && /^\s*[-–—|:,)]/.test(after)
  return own || afterSeparator || atStart
}

// Does the text next to the date hold anything besides a place? ("Jan 2022 – Present | Bengaluru" does not.)
function hasContent(p) {
  const match = matchOf(p)
  const left = p.text.slice(0, match.index)
  const right = p.text.slice(match.index + match.length)
  const content = (text, afterDate) =>
    splitChips(untab(text).replace(/^[\s,;:()\-–—|]+|[\s,;:()\-–—|]+$/g, '')).some(
      (chip) => !isLocation(chip) && !(afterDate && placeLike(chip)),
    )
  return content(left, false) || content(right, true)
}

// Where the text of a head line starts: its first cell that is not a date. (In a timeline layout the dates come
// first and the title starts further right; bullets are indented relative to the title, not to the dates.)
function contentX(p) {
  const cells = p.text.split('\t')
  const xs = p.line.cellX
  if (!xs || xs.length !== cells.length) return p.line.x
  const at = cells.findIndex((cell) => !findDateRange(cell) && !findSingleDate(cell))
  return at >= 0 ? xs[at] : p.line.x
}

const shortLine = (p) => untab(p.text).length <= 100 && words(p.text).length <= 14
// A period ends a sentence, except after an abbreviation: "Lakeshore Equipment Co." is a name.
const ABBREVIATION = /\b(?:Co|Inc|Ltd|Corp|Bros|Jr|Sr|St|Mt|Dr|Prof|Univ|Intl|Assn)\.$/
const headLike = (p) =>
  !p.bullet &&
  !p.range &&
  !p.single &&
  shortLine(p) &&
  (!/[.]$/.test(p.text) || ABBREVIATION.test(p.text)) &&
  /\p{L}/u.test(p.text)
const urlLine = (p) => !p.bullet && URL_ONLY.test(untab(p.text))

// Parse a list of lines belonging to one section into entries.
// `context` carries { bodyFont, wrap, type }.
export function parseEntries(lines, def, context) {
  const { type } = context
  const allowSingle = type !== 'experience' && type !== 'volunteering'
  const preps = prepare(lines, allowSingle)
  const special = (p) =>
    p.line.bold || (context.bodyFont && p.line.fontSize && Math.abs(p.line.fontSize - context.bodyFont) >= 0.5)

  const anchors = []
  preps.forEach((p, i) => {
    if (isAnchor(p)) anchors.push(i)
  })

  if (anchors.length === 0) return parseUndated(preps, def, context, special)

  // ---- head ranges ----
  const heads = []
  let floor = 0 // earliest line the next head may start at
  for (const a of anchors) {
    const p = preps[a]
    let start = a
    let end = a
    if (!hasContent(p)) {
      // Dates last: title and company sit above.
      let k = a - 1
      let taken = 0
      while (k >= floor && taken < 2 && headLike(preps[k])) {
        if (taken === 1 && !(special(preps[k]) || special(preps[k + 1]))) break
        start = k
        taken++
        if (preps[k].breakBefore) break
        k--
      }
    } else {
      // Title and dates share a line. The organisation is either on a bold line just above ("Company <tab> place"
      // then "Title <tab> dates") or on the next line. Indented lines are bullets of the previous entry.
      // "Aligned" means starting where the anchor line or one of its cells starts (in a timeline layout the
      // company sits under the title cell, not under the date).
      const aligned = (other) =>
        p.line.x === undefined ||
        other.line.x === undefined ||
        [p.line.x, ...(p.line.cellX ?? [])].some((x) => Math.abs(other.line.x - x) <= 3)
      const above = preps[a - 1]
      if (above && a - 1 >= floor && headLike(above) && special(above) && aligned(above) && !p.breakBefore) {
        start = a - 1
      } else {
        const next = preps[a + 1]
        if (next && a + 1 < (anchors[anchors.indexOf(a) + 1] ?? preps.length) && headLike(next) && !next.breakBefore) {
          if (aligned(next)) end = a + 1
        }
      }
    }
    // Link lines directly after the head.
    while (end + 1 < preps.length && urlLine(preps[end + 1]) && !anchors.includes(end + 1) && end - a < 3) end++
    heads.push({ start: Math.max(start, floor), anchor: a, end })
    floor = end + 1
  }

  // ---- build entries ----
  const items = []
  const first = heads[0].start
  const intro = preps.slice(0, first)
  if (intro.length && intro.map((p) => p.text).join(' ').length >= 25) {
    items.push({
      title: '',
      subtitle: '',
      location: '',
      link: '',
      startDate: '',
      endDate: '',
      current: false,
      description: buildDescription(
        intro.map((p) => p.line),
        context,
      ),
    })
  }

  heads.forEach((head, n) => {
    const stop = n + 1 < heads.length ? heads[n + 1].start : preps.length
    const headPreps = preps.slice(head.start, head.end + 1)
    const anchor = preps[head.anchor]

    const pieces = []
    let link = ''
    for (const hp of headPreps) {
      if (def.fields.link && (urlLine(hp) || (hp !== anchor && URL_ANYWHERE.test(hp.text)))) {
        link = link || untab(hp.text)
        continue
      }
      pieces.push(...piecesOf(hp === anchor ? restOf(hp) : hp.text))
    }
    const fields = assign(pieces, type)

    const match = matchOf(anchor)
    const dates = anchor.range
      ? { startDate: anchor.range.startDate, endDate: anchor.range.endDate, current: anchor.range.current }
      : type === 'education'
        ? { startDate: '', endDate: match.date, current: false }
        : { startDate: match.date, endDate: '', current: false }

    const xs = headPreps.map(contentX).filter((x) => x !== undefined)
    const baseX = xs.length ? Math.min(...xs) : undefined
    const description = buildDescription(
      preps.slice(head.end + 1, stop).map((p) => p.line),
      { baseX, wrap: context.wrap },
    )
    items.push({ ...fields, link, ...dates, description })
  })
  return items
}

// Sections without dates: split at styled title lines; certificates and awards are often just a list.
function parseUndated(preps, def, context, special) {
  const { type } = context
  const empty = { title: '', subtitle: '', location: '', link: '', startDate: '', endDate: '', current: false }
  const description = (list, baseX) =>
    buildDescription(
      list.map((p) => p.line),
      { baseX, wrap: context.wrap },
    )

  const titles = []
  preps.forEach((p, i) => {
    if (!p.bullet && special(p) && headLike(p)) titles.push(i)
  })

  if (titles.length > 0) {
    const items = []
    if (titles[0] > 0) {
      const intro = preps.slice(0, titles[0])
      if (intro.map((p) => p.text).join(' ').length >= 25) items.push({ ...empty, description: description(intro) })
    }
    titles.forEach((t, n) => {
      const stop = n + 1 < titles.length ? titles[n + 1] : preps.length
      let end = t
      const next = preps[t + 1]
      if (next && t + 1 < stop && headLike(next) && !special(next) && !next.breakBefore) end = t + 1
      let link = ''
      const pieces = []
      for (const hp of preps.slice(t, end + 1)) {
        if (def.fields.link && URL_ANYWHERE.test(hp.text)) link = untab(hp.text)
        else pieces.push(...piecesOf(hp.text))
      }
      const x = preps[t].line.x
      items.push({ ...empty, ...assign(pieces, type), link, description: description(preps.slice(end + 1, stop), x) })
    })
    return items
  }

  // A plain list: one entry per item (certificates, awards), otherwise one entry holding all the text.
  if ((type === 'certificates' || type === 'awards') && preps.length > 0) {
    const items = []
    for (const p of preps) {
      const pieces = piecesOf(stripBullet(p.text))
      if (pieces.length) items.push({ ...empty, ...assign(pieces, type) })
    }
    return items
  }
  const text = description(preps, Math.min(...preps.map((p) => p.line.x ?? Infinity).filter(Number.isFinite)))
  return text ? [{ ...empty, description: text }] : []
}
