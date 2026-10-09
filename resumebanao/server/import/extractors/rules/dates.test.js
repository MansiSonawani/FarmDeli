import { describe, expect, it } from 'vitest'
import { findDateRange, findSingleDate, parseDate, removeMatch } from './dates.js'

describe('parseDate', () => {
  it.each([
    ['Mar 2021', '2021-03'],
    ['March 2021', '2021-03'],
    ['Sept. 2019', '2019-09'],
    ['sep 2019', '2019-09'],
    ["Jan '21", '2021-01'],
    ["Jan '98", '1998-01'],
    ['03/2020', '2020-03'],
    ['3-2020', '2020-03'],
    ['2020/03', '2020-03'],
    ['2020-3', '2020-03'],
    ['2021', '2021'],
    ['13/2020', null],
    ['hello', null],
    ['1850', null],
  ])('%s -> %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected)
  })
})

describe('findDateRange', () => {
  it.each([
    ['Jan 2020 – Present', '2020-01', '', true],
    ['Jan 2020 - Present', '2020-01', '', true],
    ['January 2020 — Mar 2022', '2020-01', '2022-03', false],
    ['01/2020 – 03/2022', '2020-01', '2022-03', false],
    ['2019–2021', '2019', '2021', false],
    ['2019 - 2021', '2019', '2021', false],
    ['2019 to 2021', '2019', '2021', false],
    ['2019 - now', '2019', '', true],
    ['2019 – Current', '2019', '', true],
    ['Mar. 2021 to current', '2021-03', '', true],
    ['Sep 2014 until Jun 2016', '2014-09', '2016-06', false],
    ['Jun 2019 till date', '2019-06', '', true],
    ['Mar 2021 – 2022', '2021-03', '2022', false],
    ['Senior Designer (2018 – 2020)', '2018', '2020', false],
    ['Designer | Jan 2018 – Feb 2021 | Berlin', '2018-01', '2021-02', false],
  ])('%s', (text, startDate, endDate, current) => {
    expect(findDateRange(text)).toMatchObject({ startDate, endDate, current })
  })

  it('does not read other numbers as ranges', () => {
    expect(findDateRange('Call +44 7700 900123')).toBeNull()
    expect(findDateRange('Grew revenue by 120 - 150%')).toBeNull()
    expect(findDateRange('Built 2019 features')).toBeNull()
    expect(findDateRange('Senior Designer')).toBeNull()
  })

  it('reports where the match is', () => {
    const text = 'Engineer | Jan 2018 – Feb 2021 | Berlin'
    const match = findDateRange(text)
    expect(text.slice(match.index, match.index + match.length)).toBe('Jan 2018 – Feb 2021')
  })
})

describe('findSingleDate', () => {
  it('finds a lone year or month', () => {
    expect(findSingleDate('Certified Analyst — Example Institute, 2021')).toMatchObject({ date: '2021' })
    expect(findSingleDate('Awarded Mar 2022')).toMatchObject({ date: '2022-03' })
    expect(findSingleDate('No date here')).toBeNull()
  })
})

describe('removeMatch', () => {
  it('removes the date with its brackets and separators', () => {
    const t1 = 'Marketing Manager, Bleu Horizon Media, Lyon (Jun 2019 – Present)'
    expect(removeMatch(t1, findDateRange(t1))).toBe('Marketing Manager, Bleu Horizon Media, Lyon')
    const t2 = 'MSc Marketing, EM Example Business School, Lyon — 2016'
    expect(removeMatch(t2, findSingleDate(t2))).toBe('MSc Marketing, EM Example Business School, Lyon')
    const t3 = 'Jan 2022 – Present | Bengaluru, India'
    expect(removeMatch(t3, findDateRange(t3))).toBe('Bengaluru, India')
    const t4 = 'Senior Product Designer\tMar 2021 – Present'
    expect(removeMatch(t4, findDateRange(t4))).toBe('Senior Product Designer')
  })
})
