// Date parsing for resume text (T9). Dates come out in the stored format used by the app:
// "YYYY" or "YYYY-MM" (see src/lib/format.js).

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const MONTH =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const YEAR = '(?:19|20)\\d{2}'
// A single date: "Mar 2021", "March, 2021", "Mar '21", "03/2021", "2021-03", "2021".
const DATE = `(?:${MONTH}\\.?,?\\s*(?:'\\d{2}\\b|${YEAR}\\b)|\\d{1,2}\\s*[/.-]\\s*${YEAR}\\b|${YEAR}\\s*[/.-]\\s*(?:0?[1-9]|1[0-2])(?!\\d)|${YEAR}\\b)`
const PRESENT = '(?:present|current(?:ly)?|now|ongoing|today|till\\s+date|to\\s+date)'
const SEPARATOR = '(?:\\s*[-–—−]+\\s*|\\s+(?:to|until|till|through|thru)\\s+)'

// "Jun 2019 till date" has no separator of its own: "till date" is the whole end of the range.
const RANGE = new RegExp(`(${DATE})(?:${SEPARATOR}(${DATE}|${PRESENT}\\b)|\\s+((?:till|to)\\s+date)\\b)`, 'i')
const SINGLE = new RegExp(DATE, 'i')

const pad = (n) => String(n).padStart(2, '0')

function expandYear(text) {
  if (text.startsWith("'")) {
    const yy = Number(text.slice(1))
    return yy < 50 ? 2000 + yy : 1900 + yy
  }
  return Number(text)
}

// "Mar 2021" -> "2021-03"; "2021" -> "2021"; anything else -> null.
export function parseDate(token) {
  const t = token.trim()
  let m = t.match(new RegExp(`^(${MONTH})\\.?,?\\s*('\\d{2}|${YEAR})$`, 'i'))
  if (m) return `${expandYear(m[2])}-${pad(MONTHS[m[1].slice(0, 3).toLowerCase()])}`
  m = t.match(new RegExp(`^(\\d{1,2})\\s*[/.-]\\s*(${YEAR})$`))
  if (m) return Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${m[2]}-${pad(Number(m[1]))}` : null
  m = t.match(new RegExp(`^(${YEAR})\\s*[/.-]\\s*(\\d{1,2})$`))
  if (m) return Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${m[1]}-${pad(Number(m[2]))}` : null
  m = t.match(new RegExp(`^(${YEAR})$`))
  return m ? m[1] : null
}

/**
 * First date range in `text`: "Jan 2020 – Present", "2019-2021", "03/2020 to 05/2022".
 * Returns { startDate, endDate, current, index, length } or null; `index`/`length` locate the matched text.
 */
export function findDateRange(text) {
  const m = RANGE.exec(text)
  if (!m) return null
  const startDate = parseDate(m[1])
  if (!startDate) return null
  const end = (m[2] ?? m[3]).trim()
  const current = new RegExp(`^${PRESENT}$`, 'i').test(end)
  const endDate = current ? '' : parseDate(end)
  if (!current && !endDate) return null
  return { startDate, endDate: endDate ?? '', current, index: m.index, length: m[0].length }
}

/** First single date in `text`, as { date, index, length }, or null. */
export function findSingleDate(text) {
  const m = SINGLE.exec(text)
  if (!m) return null
  const date = parseDate(m[0])
  return date ? { date, index: m.index, length: m[0].length } : null
}

// Removes a matched date from `text` along with the brackets and separators that surrounded it, so
// "Marketing Manager, Bleu Horizon Media, Lyon (Jun 2019 – Present)" leaves the three comma-separated parts.
export function removeMatch(text, { index, length }) {
  const before = text.slice(0, index).replace(/[\s([|•·,;:\-–—]+$/, '')
  const after = text.slice(index + length).replace(/^[\s)\]|•·,;:\-–—]+/, '')
  return [before, after].filter(Boolean).join(' | ')
}
