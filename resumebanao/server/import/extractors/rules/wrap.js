import { startsLower } from './text.js'

// Telling a wrapped line from a new item. Text wraps because the next word does not fit on the line, so a line
// is a continuation when its first word would not have fitted at the end of the previous line.
//  - A line that ends exactly at the margin makes that test inconclusive (nothing would fit after it). Then the
//    spacing decides: list items sit slightly further apart than wrapped lines of the same text.
//  - Without geometry (Word files: a paragraph is one line, a line break inside it is a continuation) the only
//    clue is a lower-case start. With geometry that clue is not used: "iOS", "jQuery" and "npm" start lists too.

const GAP_MARGIN = 0.6 // points: how much wider than a wrapped line's spacing counts as "a new item"

/** The usual distance between a wrapped line and the line above it, learned from lines that start in lower case. */
export function wrapGapOf(lines) {
  const gaps = []
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1]
    const b = lines[i]
    if (a.y === undefined || b.y === undefined || a.page !== b.page || a.column !== b.column) continue
    if (startsLower(b.text) && !a.text.includes('\t') && b.y > a.y && Math.abs((b.x ?? 0) - (a.x ?? 0)) < 3) {
      gaps.push(b.y - a.y)
    }
  }
  if (gaps.length < 3) return undefined
  gaps.sort((x, y) => x - y)
  return gaps[Math.floor(gaps.length / 2)]
}

/**
 * Does `line` continue `previous` (it is the wrapped rest of the same sentence or item)?
 * @param {object} previous the line above
 * @param {object} line the line being decided
 * @param {{ rightEdge?: (line: object) => number | undefined, wrapGap?: number, lowercaseJoins?: boolean }} context
 *   `lowercaseJoins: false` turns off the lower-case clue, for lists whose items may start in lower case.
 */
export function continuesLine(previous, line, { rightEdge, wrapGap, lowercaseJoins = true } = {}) {
  const edge = rightEdge?.(line)
  const geometry = edge !== undefined && previous.x !== undefined && line.firstWordWidth !== undefined
  if (!geometry) return lowercaseJoins && startsLower(line.text)
  if (previous.text.includes('\t')) return false // a row of cells, not prose
  const end = previous.x + previous.width
  if (end + line.firstWordWidth <= edge + 1) return false // its first word would have fitted: a new item
  const atMargin = end >= edge - 3
  if (atMargin && wrapGap !== undefined && line.y - previous.y > wrapGap + GAP_MARGIN && !startsLower(line.text))
    return false
  return true
}

/** Merges wrapped lines into logical lines: [{ text, first, last }]. */
export function mergeWrapped(lines, context) {
  const out = []
  for (const line of lines) {
    const previous = out[out.length - 1]
    const sameBlock = previous && previous.last.page === line.page && previous.last.column === line.column
    if (previous && sameBlock && continuesLine(previous.last, line, context)) {
      previous.text += ` ${line.text.replace(/\s*\t\s*/g, ' ').trim()}`
      previous.last = line
    } else {
      out.push({ text: line.text, first: line, last: line })
    }
  }
  return out
}
