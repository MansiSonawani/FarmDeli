import { describe, expect, it } from 'vitest'
import { buildDescription, parseEntries } from './entries.js'

const DEF = { fields: { title: 'Job title', subtitle: 'Employer', location: 'City', link: 'Link' }, dates: true }
const NO_LINK = { ...DEF, fields: { title: 'Job title', subtitle: 'Employer', location: 'City' } }
let y = 100
const line = (text, extra = {}) => ({ text, page: 1, column: 0, bold: false, y: (y += 13), ...extra })
const run = (lines, type = 'experience', def = NO_LINK) => parseEntries(lines, def, { type, bodyFont: 10 })

describe('buildDescription', () => {
  it('turns glyph and list-item lines into bullets and leaves paragraphs alone', () => {
    const text = buildDescription([
      line('Led the team.'),
      line('• Cut costs by 20%'),
      line('Shipped v2', { listItem: true }),
      line('- Hired five people'),
    ])
    expect(text).toBe('Led the team.\n- Cut costs by 20%\n- Shipped v2\n- Hired five people')
  })

  it('joins wrapped lines, using geometry where a PDF has it', () => {
    const wrap = { rightEdge: () => 500, wrapGap: undefined }
    const text = buildDescription(
      [
        line('Reduced the time needed to settle', { x: 50, width: 440, firstWordWidth: 30 }), // nothing fits after it
        line('payments by half', { x: 50, width: 90, firstWordWidth: 40 }),
        line('Introduced reviews', { x: 50, width: 100, firstWordWidth: 50 }), // "Introduced" would have fitted
      ],
      { baseX: 50, wrap },
    )
    expect(text).toBe('Reduced the time needed to settle payments by half\nIntroduced reviews')
  })

  it('treats lines indented under the title as bullets even without a glyph (PDF)', () => {
    const text = buildDescription(
      [line('First point', { x: 62 }), line('Second point', { x: 62 }), line('Plain note', { x: 50 })],
      {
        baseX: 50,
      },
    )
    expect(text).toBe('- First point\n- Second point\nPlain note')
  })

  it('neutralises ** so source text cannot become bold by accident', () => {
    expect(buildDescription([line('5 ** 2 equals 25')])).toBe('5 * * 2 equals 25')
  })
})

describe('parseEntries: arrangements of an entry head', () => {
  it('title and dates on one line, company and place on the next', () => {
    const [entry] = run([
      line('Senior Designer\tMar 2021 – Present'),
      line('Northwind Logistics\tStockholm'),
      line('Redesigned the app', { listItem: true }),
    ])
    expect(entry).toMatchObject({
      title: 'Senior Designer',
      subtitle: 'Northwind Logistics',
      location: 'Stockholm',
      startDate: '2021-03',
      current: true,
      description: '- Redesigned the app',
    })
  })

  it('company, title, then dates and place on the last line', () => {
    const [entry] = run([
      line('Lumen Retail Analytics', { bold: true }),
      line('Senior Data Analyst'),
      line('Jan 2022 – Present | Bengaluru, India'),
      line('Built dashboards', { listItem: true }),
    ])
    expect(entry).toMatchObject({
      title: 'Senior Data Analyst',
      subtitle: 'Lumen Retail Analytics',
      location: 'Bengaluru, India',
      startDate: '2022-01',
      current: true,
    })
  })

  it('company on a bold line above a "title <tab> dates" line', () => {
    const [entry] = run([
      line('Alpenwerk GmbH\tMunich, Germany', { bold: true, x: 57 }),
      line('Mechanical Engineer\tMar 2020 – Present', { x: 57 }),
      line('Redesigned a press line', { x: 75 }),
    ])
    expect(entry).toMatchObject({
      title: 'Mechanical Engineer',
      subtitle: 'Alpenwerk GmbH',
      location: 'Munich, Germany',
    })
    expect(entry.description).toBe('- Redesigned a press line')
  })

  it('everything on one line, dates in brackets', () => {
    const [entry] = run([line('Marketing Manager, Bleu Horizon Media, Lyon (Jun 2019 – Present)')])
    expect(entry).toMatchObject({
      title: 'Marketing Manager',
      subtitle: 'Bleu Horizon Media',
      location: 'Lyon',
      startDate: '2019-06',
    })
  })

  it('"Title | Company | dates" and "Title at Company"', () => {
    const [a] = run([line('Operations Manager | Northern Rail Services | 03/2019 – Current')])
    expect(a).toMatchObject({
      title: 'Operations Manager',
      subtitle: 'Northern Rail Services',
      startDate: '2019-03',
      current: true,
    })
    const [b] = run([line('Designer at Acme Corp, 2018 – 2020')])
    expect(b).toMatchObject({ title: 'Designer', subtitle: 'Acme Corp', startDate: '2018', endDate: '2020' })
  })

  it('does not take a company for a place when only two pieces are given', () => {
    const [entry] = run([line('Product Manager, Orbit Apps (2021 – Present)')])
    expect(entry).toMatchObject({ title: 'Product Manager', subtitle: 'Orbit Apps', location: '' })
    const [other] = run([line('Backend Engineer, London (2021 – Present)')])
    expect(other).toMatchObject({ title: 'Backend Engineer', location: 'London' })
  })

  it('dates first, then the title', () => {
    const [entry] = run([
      line('2021 – Present\tProduct Manager, Orbit Apps'),
      line('Launched the app', { listItem: true }),
    ])
    expect(entry).toMatchObject({ title: 'Product Manager', subtitle: 'Orbit Apps', startDate: '2021', current: true })
  })

  it('splits several entries and keeps each description with its own entry', () => {
    const items = run([
      line('Designer\t2019 – 2021'),
      line('Acme'),
      line('Did A', { listItem: true }),
      line('Writer\t2016 – 2019'),
      line('Beta'),
      line('Did B', { listItem: true }),
    ])
    expect(items.map((i) => [i.title, i.subtitle, i.description])).toEqual([
      ['Designer', 'Acme', '- Did A'],
      ['Writer', 'Beta', '- Did B'],
    ])
  })

  it('keeps text before the first entry as its own entry instead of losing it', () => {
    const items = run([
      line('Ten years of experience leading product teams across three countries.'),
      line('Designer\t2019 – 2021'),
    ])
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ title: '', description: expect.stringContaining('Ten years') })
  })
})

describe('parseEntries: single dates and undated sections', () => {
  it('an education year is the end date; other single dates are the start date', () => {
    const [edu] = run([line('MSc Marketing, EM Example Business School, Lyon — 2016')], 'education')
    expect(edu).toMatchObject({
      title: 'MSc Marketing',
      subtitle: 'EM Example Business School',
      location: 'Lyon',
      startDate: '',
      endDate: '2016',
    })
    const [cert] = run([line('Certified Analyst — Example Institute\t2021')], 'certificates')
    expect(cert).toMatchObject({ title: 'Certified Analyst', subtitle: 'Example Institute', startDate: '2021' })
  })

  it('degree names with company-like words ("Software Engineering") stay the title', () => {
    const [edu] = run([line('Universidad Ejemplo — BSc Software Engineering'), line('2012 – 2016')], 'education')
    expect(edu).toMatchObject({ title: 'BSc Software Engineering', subtitle: 'Universidad Ejemplo' })
  })

  it('does not treat a year inside a sentence as an entry', () => {
    const items = run([line('Launched the product in 2019')], 'projects', DEF)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('')
    expect(items[0].description).toContain('Launched')
  })

  it('splits undated sections at bold titles and reads links', () => {
    const items = run(
      [
        line('Open Tokens', { bold: true }),
        line('github.com/me/open-tokens'),
        line('A small CLI.'),
        line('Habit App', { bold: true }),
        line('A tracker.'),
      ],
      'projects',
      DEF,
    )
    expect(items.map((i) => [i.title, i.link, i.description])).toEqual([
      ['Open Tokens', 'github.com/me/open-tokens', 'A small CLI.'],
      ['Habit App', '', 'A tracker.'],
    ])
  })

  it('reads a certificate list, one entry per line', () => {
    const items = run([line('• AWS Certified Developer'), line('• Scrum Master')], 'certificates')
    expect(items.map((i) => i.title)).toEqual(['AWS Certified Developer', 'Scrum Master'])
  })

  it('puts a plain custom section into one entry', () => {
    const items = run([line('Spoke at three conferences.'), line('Wrote two papers.')], 'custom')
    expect(items).toHaveLength(1)
    expect(items[0].description).toContain('conferences')
  })
})
