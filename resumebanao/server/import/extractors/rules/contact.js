import { findDateRange } from './dates.js'
import { exactType } from './sections.js'
import { hasOrgWord, hasTitleWord, isAllCaps, titleCase, words } from './text.js'

// Contact details and the name block at the top of a resume (T7).
//
// They come from the "zones": the lines before each column's first section heading. Each zone line is cut into
// chips at tabs and separators (| • · and wide gaps), so "Lyon, France | +33 6 12 34 56 78 | me@x.fr" gives three.

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/u
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub|company)\/[^\s,;|)]+/i
const TLDS =
  'com|org|io|dev|me|co|design|app|tech|site|online|xyz|info|blog|page|ai|in|uk|se|de|fr|nl|ca|au|us|eu|ch|no|dk|fi|es|it|pt|br|jp|cn|nz|ie|pl|cz|at|be|za|studio|work|codes|cloud'
const URL_LIKE = new RegExp(
  `(?:https?:\\/\\/|www\\.)[^\\s,;|)]+|(?<![\\p{L}\\p{N}@.-])[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:${TLDS})(?:\\/[^\\s,;|)]*)?(?![\\p{L}\\p{N}@])`,
  'iu',
)
const LABEL =
  /^(?:e-?mail|phone|tel(?:ephone)?|mobile|mob|cell|linkedin|website|web|site|portfolio|github|address|location)\s*[:\-–]\s*/i
const NOT_A_NAME = new Set([
  'curriculum vitae',
  'resume',
  'résumé',
  'cv',
  'curriculum',
  'personal details',
  'contact',
  'profile',
])

const firstCell = (text) => text.split('\t')[0].trim()

export function findEmail(text) {
  return text.match(EMAIL)?.[0] ?? null
}

export function findPhone(text) {
  for (const match of text.matchAll(/(?:\+|00)?\(?\d[\d\s().-]{6,}\d/g)) {
    const raw = match[0].trim()
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) continue
    if (findDateRange(raw) || /^\d{4}\s*[-–]\s*\d{4}$/.test(raw)) continue
    if (digits.length === 8 && !/^[+(]|^00/.test(raw)) continue
    return raw.replace(/\s+/g, ' ')
  }
  return null
}

export function findLinkedIn(text) {
  const match = text.match(LINKEDIN)?.[0]
  return match ? cleanUrl(match) : null
}

// A personal website: something with a protocol or www, or a domain from a list of common endings
// (so "Node.js" and "ASP.NET" are not mistaken for one).
export function findWebsite(text) {
  const match = text.match(URL_LIKE)?.[0]
  return match ? cleanUrl(match) : null
}

const cleanUrl = (url) =>
  url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/.]+$/, '')

// "Stockholm, Sweden", "Austin, TX 78701", "Remote": a place, not a sentence, title or company.
export function isLocation(text) {
  const t = text.trim()
  if (!t || t.length > 60) return false
  if (/^(remote|hybrid|on-?site)\b/i.test(t)) return true
  if (EMAIL.test(t) || /\d{4}/.test(t.replace(/\b\d{4,6}$/, ''))) return false
  if (hasTitleWord(t) || hasOrgWord(t)) return false
  const parts = t.split(/,\s*/)
  if (parts.length < 2 || parts.length > 3) return false
  return parts.every((part) => /^[\p{L}][\p{L}.'’ -]*(?: \d{4,6})?$/u.test(part) && words(part).length <= 4)
}

function isNameLike(text) {
  if (!/^[\p{L}][\p{L}.'’-]*(?: [\p{L}][\p{L}.'’-]*){1,4}$/u.test(text)) return false
  if (NOT_A_NAME.has(text.toLowerCase()) || exactType(text)) return false
  // Every word starts with a capital, except small name particles (van, de, bin, ...).
  return words(text).every(
    (w, i) =>
      /^\p{Lu}/u.test(w) || (i > 0 && /^(?:de|da|di|van|von|der|den|bin|al|el|la|le|du|dos|das|del|ibn)$/i.test(w)),
  )
}

// "MAYA LINDQVIST" -> "Maya Lindqvist"
const displayName = (text) => (isAllCaps(text) ? titleCase(text) : text)

const chipsOf = (text) =>
  text
    .split(/\t|\s*[|•·▪●◦]\s*|\s{3,}/)
    .map((chip) => chip.replace(LABEL, '').trim())
    .filter(Boolean)

/**
 * @param {{ column: number, lines: object[] }[]} zones lines before each column's first heading
 * @param {object[]} contactLines lines of "Contact"/"Personal details" sections
 * @param {string} wholeText the entire document text, searched only when the zones hold no email or phone
 */
export function extractContact(zones, contactLines, wholeText) {
  const personal = {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    photo: '',
  }
  const zoneLines = zones.flatMap((z) => z.lines)

  // ---- name: the biggest name-like line (PDF), or the first one (Word) ----
  let nameAt = null // { zone, index, consumed }
  const candidates = []
  const single = /^\p{Lu}[\p{L}.'’-]+$/u
  for (const zone of zones) {
    zone.lines.forEach((line, index) => {
      const text = firstCell(line.text)
      if (isNameLike(text)) candidates.push({ zone, index, line, name: text, consumed: 0 })
      // A first name and a last name set on two lines in the same big size.
      const next = zone.lines[index + 1]
      if (
        next &&
        line.fontSize &&
        Math.abs((next.fontSize ?? 0) - line.fontSize) < 0.5 &&
        single.test(text) &&
        single.test(firstCell(next.text)) &&
        !exactType(text) &&
        !exactType(firstCell(next.text))
      ) {
        candidates.push({ zone, index, line, name: `${text} ${firstCell(next.text)}`, consumed: 1 })
      }
    })
  }
  if (candidates.length) {
    const sized = candidates.some((c) => c.line.fontSize)
    const best = sized
      ? [...candidates].sort(
          (a, b) =>
            b.line.fontSize - a.line.fontSize ||
            a.line.column - b.line.column ||
            a.line.y - b.line.y ||
            b.consumed - a.consumed,
        )[0]
      : candidates[0]
    nameAt = { zone: best.zone, index: best.index, consumed: best.consumed }
    personal.fullName = displayName(best.name)
  }

  // ---- job title: the line right after the name ----
  let titleLine = null
  if (nameAt) {
    const after = nameAt.zone.lines[nameAt.index + 1 + (nameAt.consumed ?? 0)]
    const text = after ? firstCell(after.text) : ''
    const nameSize = nameAt.zone.lines[nameAt.index].fontSize
    if (
      text &&
      words(text).length <= 8 &&
      text.length <= 70 &&
      !findEmail(text) &&
      !findPhone(text) &&
      !findWebsite(text) &&
      !isLocation(text) &&
      !exactType(text) &&
      !/[.]$/.test(text) &&
      (!nameSize || !after.fontSize || after.fontSize <= nameSize)
    ) {
      personal.jobTitle = text
      titleLine = after
    }
  }

  // ---- contact chips ----
  const chips = []
  for (const line of [...zoneLines, ...contactLines]) {
    const parts = chipsOf(line.text)
    parts.forEach((chip, i) => {
      const isNameLine = nameAt && line === nameAt.zone.lines[nameAt.index]
      const isTitleCell = line === titleLine && i === 0
      if (!isNameLine && !isTitleCell) chips.push(chip)
    })
  }

  // One chip can hold several details ("sofiareyes.dev  linkedin.com/in/sofiareyes"), so each match is taken out
  // of the chip and the rest is looked at again.
  for (const chip of chips) {
    let rest = chip
    const take = (field, found, raw) => {
      if (!found || personal[field]) return
      personal[field] = found
      rest = rest.replace(raw ?? found, ' ')
    }
    take('email', findEmail(rest))
    const linkedin = findLinkedIn(rest)
    if (linkedin && !personal.linkedin) take('linkedin', linkedin, rest.match(LINKEDIN)[0])
    else if (linkedin) rest = rest.replace(rest.match(LINKEDIN)[0], ' ')
    const phone = findPhone(rest)
    if (phone && !personal.phone) take('phone', phone, rest.match(/(?:\+|00)?\(?\d[\d\s().-]{6,}\d/)?.[0])
    const site = findWebsite(rest)
    if (site && !personal.website && !/github\.com/i.test(site)) take('website', site, rest.match(URL_LIKE)?.[0])
    rest = rest.trim()
    if (!personal.location && rest && isLocation(rest)) personal.location = rest
  }
  if (!personal.website) {
    // A GitHub page is better than nothing.
    const github = chips.map((c) => findWebsite(c)).find((site) => site && /github\.com/i.test(site))
    if (github) personal.website = github
  }

  // ---- nothing in the header: look anywhere (contact details are sometimes in a footer) ----
  if (!personal.email) personal.email = findEmail(wholeText) ?? ''
  if (!personal.phone)
    personal.phone =
      findPhone(
        wholeText
          .split('\n')
          .filter((l) => !findDateRange(l))
          .join('\n'),
      ) ?? ''
  return personal
}
