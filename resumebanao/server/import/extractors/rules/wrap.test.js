import { describe, expect, it } from 'vitest'
import { continuesLine, mergeWrapped, wrapGapOf } from './wrap.js'

const EDGE = 500
const context = { rightEdge: () => EDGE }
const at = (text, { x = 50, width, y = 100, firstWordWidth = 30 } = {}) => ({
  text,
  page: 1,
  column: 0,
  x,
  width: width ?? 100,
  y,
  firstWordWidth,
})

describe('continuesLine (with geometry)', () => {
  it('continues when the next line first word would not have fitted', () => {
    expect(continuesLine(at('long line', { width: 440 }), at('Built', { y: 113, firstWordWidth: 30 }), context)).toBe(
      true,
    )
  })

  it('starts something new when the first word would have fitted', () => {
    expect(continuesLine(at('short line', { width: 200 }), at('Built', { y: 113 }), context)).toBe(false)
  })

  it('does not use the lower-case clue when geometry says the word would have fitted', () => {
    expect(continuesLine(at('iOS', { width: 50 }), at('python', { y: 113 }), context)).toBe(false)
  })

  it('never joins a row of cells', () => {
    expect(continuesLine(at('Designer\tMar 2021', { width: 440 }), at('Built', { y: 113 }), context)).toBe(false)
  })

  it('breaks a tie at the margin by spacing: list items sit further apart than wrapped lines', () => {
    const full = at('ends exactly at the margin', { width: 450, y: 100 }) // right edge 500
    const tight = at('Mentored', { y: 113.2, firstWordWidth: 40 })
    const loose = at('Mentored', { y: 114.4, firstWordWidth: 40 })
    expect(continuesLine(full, tight, { ...context, wrapGap: 13.2 })).toBe(true)
    expect(continuesLine(full, loose, { ...context, wrapGap: 13.2 })).toBe(false)
    expect(continuesLine(full, loose, context)).toBe(true) // no spacing known: assume it wrapped
  })
})

describe('continuesLine (without geometry, as in Word files)', () => {
  it('joins a line that starts in lower case, unless told not to', () => {
    expect(continuesLine({ text: 'Led the team of' }, { text: 'five engineers' })).toBe(true)
    expect(continuesLine({ text: 'Led the team' }, { text: 'Hired five' })).toBe(false)
    expect(continuesLine({ text: 'Skills' }, { text: 'iOS' }, { lowercaseJoins: false })).toBe(false)
  })
})

describe('mergeWrapped', () => {
  it('merges wrapped lines and keeps separate items apart', () => {
    const lines = [
      at('Python, Go, Machine', { width: 445, y: 100 }),
      at('learning, SQL', { width: 80, y: 113, firstWordWidth: 55 }),
      at('Figma', { width: 40, y: 126, firstWordWidth: 40 }),
    ]
    expect(mergeWrapped(lines, context).map((l) => l.text)).toEqual(['Python, Go, Machine learning, SQL', 'Figma'])
  })

  it('does not merge across pages or columns', () => {
    const a = at('A line that runs to the edge', { width: 450 })
    const b = { ...at('continues', { y: 113 }), page: 2 }
    expect(mergeWrapped([a, b], context)).toHaveLength(2)
  })
})

describe('wrapGapOf', () => {
  it('learns the spacing of wrapped lines from lines that start in lower case', () => {
    const lines = [
      at('first part of a sentence', { y: 100 }),
      at('and the rest of it', { y: 113.3 }),
      at('Another long sentence that', { y: 140 }),
      at('wraps here as well', { y: 153.2 }),
      at('Again one more that', { y: 180 }),
      at('wraps over two lines', { y: 193.4 }),
    ]
    expect(wrapGapOf(lines)).toBeCloseTo(13.3, 1)
    expect(wrapGapOf(lines.slice(0, 2))).toBeUndefined() // too little evidence
  })
})
