// Scores an import against the known answer for a fixture, field by field (T14). Used by score.test.js and
// the fixture report; it works on any extractor's output, so it is also how a new extractor is compared.

const strip = (html) =>
  html
    .replace(/<\/(p|li)>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

const squash = (text) =>
  String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const wordsOf = (text) => squash(text).split(' ').filter(Boolean)

// How alike two texts are, 0..1 (shared words over all words).
function similarity(a, b) {
  const x = wordsOf(a)
  const y = wordsOf(b)
  if (!x.length && !y.length) return 1
  const counts = new Map()
  for (const w of x) counts.set(w, (counts.get(w) ?? 0) + 1)
  let shared = 0
  for (const w of y) {
    if ((counts.get(w) ?? 0) > 0) {
      shared++
      counts.set(w, counts.get(w) - 1)
    }
  }
  return (2 * shared) / (x.length + y.length)
}

const bulletCount = (text) => text.split('\n').filter((l) => /^\s*(?:- |•)/.test(l)).length
const plainFromMarkup = (text) => (text ?? '').replace(/\*\*/g, '')

// A date at the precision the printed resume kept (a template may show only the year).
const dateAt = (date, dateFormat) => (dateFormat === 'YYYY' ? String(date ?? '').slice(0, 4) : (date ?? ''))

/**
 * @param {{ personal: object, sections: object[] }} actual output of the importer
 * @param {{ personal: object, sections: object[] }} expected the answer
 * @param {{ dateFormat?: string }} options
 * @returns {{ matched: number, total: number, score: number, failures: string[] }}
 */
export function scoreImport(actual, expected, { dateFormat = 'MMM YYYY' } = {}) {
  let matched = 0
  let total = 0
  const failures = []
  const check = (label, ok, got, want) => {
    total++
    if (ok) matched++
    else failures.push(`${label}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`)
  }
  const same = (label, got, want) => check(label, squash(got) === squash(want), got, want)

  for (const field of ['fullName', 'jobTitle', 'email', 'phone', 'location', 'website', 'linkedin']) {
    same(`personal.${field}`, actual.personal[field], expected.personal[field])
  }

  for (const want of expected.sections) {
    const got = actual.sections.find((s) => s.type === want.type)
    check(`${want.type}: present`, Boolean(got), got ? 'yes' : 'no', 'yes')

    if (want.content !== undefined && want.content !== '' && want.type === 'summary') {
      const text = got ? strip(got.content ?? '') : ''
      check(
        `${want.type}: text`,
        similarity(text, plainFromMarkup(want.content)) >= 0.9,
        text.slice(0, 80),
        want.content.slice(0, 80),
      )
      continue
    }

    const wantItems = want.items ?? []
    const gotItems = got?.items ?? []
    const isTags = wantItems.length > 0 && 'name' in wantItems[0]

    if (isTags) {
      const gotNames = new Set(gotItems.map((t) => squash(t.name)))
      const wantNames = new Set(wantItems.map((t) => squash(t.name)))
      for (const t of wantItems) check(`${want.type}: "${t.name}"`, gotNames.has(squash(t.name)), [...gotNames], t.name)
      // Extra items count against the score too.
      for (const t of gotItems)
        if (!wantNames.has(squash(t.name))) check(`${want.type}: unexpected "${t.name}"`, false, t.name, '(nothing)')
      continue
    }

    check(`${want.type}: entry count`, gotItems.length === wantItems.length, gotItems.length, wantItems.length)
    wantItems.forEach((w, i) => {
      const g = gotItems[i] ?? {}
      const where = `${want.type}[${i}] ${w.title || w.subtitle}`
      same(`${where} title`, g.title, w.title)
      same(`${where} subtitle`, g.subtitle, w.subtitle)
      same(`${where} location`, g.location, w.location)
      check(
        `${where} start`,
        dateAt(g.startDate, dateFormat) === dateAt(w.startDate, dateFormat),
        g.startDate,
        w.startDate,
      )
      check(`${where} end`, dateAt(g.endDate, dateFormat) === dateAt(w.endDate, dateFormat), g.endDate, w.endDate)
      check(`${where} current`, Boolean(g.current) === Boolean(w.current), g.current, w.current)
      const gotText = strip(g.description ?? '')
      const wantText = plainFromMarkup(w.description)
      check(`${where} description`, similarity(gotText, wantText) >= 0.9, gotText.slice(0, 100), wantText.slice(0, 100))
      const gotBullets = ((g.description ?? '').match(/<li>/g) ?? []).length
      check(
        `${where} bullets`,
        gotBullets === bulletCount(w.description ?? ''),
        gotBullets,
        bulletCount(w.description ?? ''),
      )
    })
  }

  return { matched, total, score: total ? matched / total : 1, failures }
}
