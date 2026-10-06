import { describe, expect, it } from 'vitest'
import rules from './index.js'

const line = (text, extra = {}) => ({ text, page: 1, column: 0, bold: false, ...extra })
const heading = { bold: true, fontSize: 10.5 }
const body = { fontSize: 9.5 }
const doc = (lines, extra = {}) => ({
  kind: 'docx',
  pageCount: 1,
  lines,
  text: lines.map((l) => l.text).join('\n'),
  ...extra,
})

describe('rules extractor', () => {
  it('reads a small document end to end', async () => {
    const result = await rules.extract(
      doc([
        line('Ada Lovelace', { bold: true }),
        line('Engineer'),
        line('ada@example.com | +44 20 7946 0958 | London, UK'),
        line('Experience', { heading: true }),
        line('Analyst\tJan 2019 – Present'),
        line('Acme Corp\tLondon'),
        line('Built the first program', { listItem: true }),
        line('Skills', { heading: true }),
        line('Maths, Logic'),
      ]),
    )
    expect(result.extractor).toBe('rules')
    expect(result.warnings).toEqual([])
    expect(result.data.personal).toMatchObject({
      fullName: 'Ada Lovelace',
      jobTitle: 'Engineer',
      email: 'ada@example.com',
      location: 'London, UK',
    })
    expect(result.data.sections.map((s) => s.type)).toEqual(['experience', 'skills'])
    expect(result.data.sections[0].items[0]).toMatchObject({
      title: 'Analyst',
      subtitle: 'Acme Corp',
      startDate: '2019-01',
      current: true,
    })
    expect(result.data.sections[1].items.map((t) => t.name)).toEqual(['Maths', 'Logic'])
  })

  it('keeps the document order of a single-column file, including custom sections', async () => {
    const result = await rules.extract(
      doc([
        line('Ada Lovelace', { bold: true }),
        line('Education', { heading: true }),
        line('BSc Maths\t2010 – 2013'),
        line('Talks', { heading: true }),
        line('Spoke at a conference in 2015', {}),
        line('Experience', { heading: true }),
        line('Analyst\t2013 – 2020'),
      ]),
    )
    expect(result.data.sections.map((s) => s.type)).toEqual(['education', 'custom', 'experience'])
  })

  it('puts the sections of a two-column file in the usual resume order, not column by column', async () => {
    const result = await rules.extract(
      doc(
        [
          // sidebar (column 0) first, as the PDF reader emits it
          line('SKILLS', { column: 0, ...heading }),
          line('Figma', { column: 0, ...body }),
          line('LANGUAGES', { column: 0, ...heading }),
          line('Swedish', { column: 0, ...body }),
          // main column
          line('Maya Lindqvist', { column: 1, bold: true, fontSize: 24 }),
          line('PROFILE', { column: 1, ...heading }),
          line('A designer.', { column: 1, ...body }),
          line('EXPERIENCE', { column: 1, ...heading }),
          line('Designer\t2019 – 2021', { column: 1, ...body }),
        ],
        { kind: 'pdf', columns: 2 },
      ),
    )
    expect(result.data.sections.map((s) => s.type)).toEqual(['summary', 'experience', 'skills', 'languages'])
    expect(result.data.personal.fullName).toBe('Maya Lindqvist')
  })

  it('warns instead of guessing when there is no name or no recognisable section', async () => {
    const result = await rules.extract(doc([line('something unusual here')]))
    expect(result.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['NO_NAME', 'NO_SECTIONS', 'CONTACT_MISSING']),
    )
    expect(result.data.sections).toEqual([])
  })

  it('does not warn about missing contact details for PDFs, which are read in full', async () => {
    const result = await rules.extract(doc([line('Ada Lovelace')], { kind: 'pdf', columns: 1 }))
    expect(result.warnings.map((w) => w.code)).not.toContain('CONTACT_MISSING')
  })
})
