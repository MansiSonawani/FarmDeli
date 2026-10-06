import { describe, expect, it } from 'vitest'
import { formatDate, formatRange, parseRichText } from './format'

describe('formatDate', () => {
  it('formats month dates', () => {
    expect(formatDate('2021-03')).toBe('Mar 2021')
    expect(formatDate('2021-03', 'MM/YYYY')).toBe('03/2021')
    expect(formatDate('2021-03', 'YYYY')).toBe('2021')
  })

  it('handles year-only and empty values', () => {
    expect(formatDate('2019')).toBe('2019')
    expect(formatDate('')).toBe('')
  })
})

describe('formatRange', () => {
  it('shows Present for current roles', () => {
    expect(formatRange({ startDate: '2020-01', current: true })).toBe('Jan 2020 – Present')
  })

  it('falls back to a single date', () => {
    expect(formatRange({ startDate: '', endDate: '2018' })).toBe('2018')
  })
})

describe('parseRichText', () => {
  it('groups consecutive bullet lines into one list', () => {
    expect(parseRichText('Intro\n- one\n* two\n\nOutro')).toEqual([
      { type: 'p', spans: [{ text: 'Intro', bold: false }] },
      {
        type: 'ul',
        items: [[{ text: 'one', bold: false }], [{ text: 'two', bold: false }]],
      },
      { type: 'p', spans: [{ text: 'Outro', bold: false }] },
    ])
  })

  it('parses bold spans', () => {
    expect(parseRichText('Cut costs by **30%** fast')[0].spans).toEqual([
      { text: 'Cut costs by ', bold: false },
      { text: '30%', bold: true },
      { text: ' fast', bold: false },
    ])
  })
})
