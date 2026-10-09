import { describe, expect, it } from 'vitest'
import { normalize } from './normalize.js'
import { verify } from './verify.js'

const result = (data, warnings = []) => ({ data, warnings, extractor: 'test' })
const personal = {
  fullName: 'Ada Lovelace',
  jobTitle: '',
  email: 'ada@example.com',
  phone: '',
  location: '',
  website: '',
  linkedin: '',
}
const entry = (extra) => ({
  title: '',
  subtitle: '',
  location: '',
  link: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  ...extra,
})

describe('normalize', () => {
  it('gives sections and entries ids and the same defaults as the editor', () => {
    const { data } = normalize(
      result({ personal, sections: [{ type: 'experience', title: 'Work', items: [entry({ title: 'Engineer' })] }] }),
    )
    const [section] = data.sections
    expect(section).toMatchObject({ type: 'experience', title: 'Work', visible: true, column: 'main' })
    expect(section.id).toBeTruthy()
    expect(section.items[0].id).toBeTruthy()
    expect(data.personal.photo).toBe('')
  })

  it('turns the description markup into the HTML the rich text editor stores', () => {
    const { data } = normalize(
      result({
        personal,
        sections: [
          {
            type: 'experience',
            items: [entry({ title: 'A', description: 'Intro\n- Cut costs by **30%**\n- Hired <b>five</b>' })],
          },
        ],
      }),
    )
    expect(data.sections[0].items[0].description).toBe(
      '<p>Intro</p><ul><li><p>Cut costs by <strong>30%</strong></p></li><li><p>Hired &lt;b&gt;five&lt;/b&gt;</p></li></ul>',
    )
  })

  it('merges repeated built-in sections but keeps each custom section', () => {
    const { data } = normalize(
      result({
        personal,
        sections: [
          { type: 'skills', title: 'Skills', items: [{ name: 'Go' }, { name: 'Python' }] },
          { type: 'skills', title: 'Tools', items: [{ name: 'go' }, { name: 'Figma' }] },
          { type: 'custom', title: 'Talks', items: [entry({ title: 'A' })] },
          { type: 'custom', title: 'Papers', items: [entry({ title: 'B' })] },
        ],
      }),
    )
    expect(data.sections.map((s) => s.type)).toEqual(['skills', 'custom', 'custom'])
    expect(data.sections[0].items.map((t) => t.name)).toEqual(['Go', 'Python', 'Figma'])
  })

  it('treats unknown section types as custom sections', () => {
    const { data } = normalize(
      result({
        personal,
        sections: [{ type: 'publications', title: 'Publications', items: [entry({ title: 'A paper' })] }],
      }),
    )
    expect(data.sections[0]).toMatchObject({ type: 'custom', title: 'Publications' })
  })

  it('keeps only valid dates and clears the end date of a current job', () => {
    const { data } = normalize(
      result({
        personal,
        sections: [
          {
            type: 'experience',
            items: [
              entry({ title: 'A', startDate: '2021-03', endDate: '2022-03', current: true }),
              entry({ title: 'B', startDate: '03/2021', endDate: '2021-13' }),
            ],
          },
        ],
      }),
    )
    const [a, b] = data.sections[0].items
    expect(a).toMatchObject({ startDate: '2021-03', endDate: '', current: true })
    expect(b).toMatchObject({ startDate: '', endDate: '' })
  })

  it('drops empty entries, empty sections and clamps levels to the section', () => {
    const { data } = normalize(
      result({
        personal,
        sections: [
          { type: 'experience', items: [entry({}), entry({ title: 'Kept' })] },
          { type: 'education', items: [entry({})] },
          { type: 'languages', items: [{ name: 'French', level: 99 }, { name: '' }] },
          { type: 'interests', items: [{ name: 'Chess', level: 3 }] },
        ],
      }),
    )
    expect(data.sections.map((s) => s.type)).toEqual(['experience', 'languages', 'interests'])
    expect(data.sections[0].items).toHaveLength(1)
    expect(data.sections[1].items[0].level).toBe(4) // the top of the languages scale
    expect(data.sections[2].items[0].level).toBe(0) // interests have no levels
  })

  it('limits lengths and strips control characters', () => {
    const { data } = normalize(
      result({
        personal: { ...personal, fullName: `Ada\u0000 ${'x'.repeat(500)}` },
        sections: [{ type: 'summary', content: 'a'.repeat(9000) }],
      }),
    )
    expect(data.personal.fullName).not.toContain('\u0000')
    expect(data.personal.fullName.length).toBeLessThanOrEqual(120)
    expect(data.sections[0].content.length).toBeLessThan(5_200) // 5,000 characters plus the tags
  })

  it('refuses a result with no name and no content', () => {
    expect(() =>
      normalize(result({ personal: { ...personal, fullName: '' }, sections: [{ type: 'experience', items: [] }] })),
    ).toThrow(expect.objectContaining({ status: 422, code: 'NO_CONTENT' }))
  })

  it('tolerates a malformed result', () => {
    expect(() => normalize(result({ personal: null, sections: 'nope' }))).toThrow(
      expect.objectContaining({ code: 'NO_CONTENT' }),
    )
  })
})

describe('verify', () => {
  const doc = {
    kind: 'pdf',
    pageCount: 1,
    lines: [],
    text: 'Ada Lovelace\nada@example.com | +44 20 7946 0958\nEngineer at Acme Corp, London\nJan 2019 – Mar 2021',
  }
  const data = (overrides = {}) =>
    normalize(
      result({
        personal: { ...personal, phone: '+44 20 7946 0958', ...overrides.personal },
        sections: [
          {
            type: 'experience',
            items: [
              entry({
                title: 'Engineer',
                subtitle: 'Acme Corp',
                location: 'London',
                startDate: '2019-01',
                endDate: '2021-03',
                ...overrides.entry,
              }),
            ],
          },
        ],
      }),
    )

  it('keeps values that appear in the file, whatever the spacing or case', () => {
    const out = verify(data(), doc)
    expect(out.warnings).toEqual([])
    expect(out.data.personal).toMatchObject({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+44 20 7946 0958',
    })
    expect(out.data.sections[0].items[0]).toMatchObject({
      title: 'Engineer',
      subtitle: 'Acme Corp',
      location: 'London',
      startDate: '2019-01',
    })
  })

  it('blanks and reports values that are not in the file', () => {
    const out = verify(
      data({
        personal: { email: 'invented@example.com', phone: '+1 555 000 1111' },
        entry: { subtitle: 'Globex', startDate: '2012-05' },
      }),
      doc,
    )
    expect(out.data.personal).toMatchObject({ email: '', phone: '' })
    expect(out.data.sections[0].items[0]).toMatchObject({ subtitle: '', startDate: '' })
    expect(out.warnings.map((w) => w.code)).toEqual([
      'NOT_IN_SOURCE',
      'NOT_IN_SOURCE',
      'NOT_IN_SOURCE',
      'NOT_IN_SOURCE',
    ])
  })

  it('checks each comma-separated part and compares phone numbers by their digits', () => {
    const joined = verify(data({ entry: { location: 'London, Paris' } }), doc)
    expect(joined.data.sections[0].items[0].location).toBe('')
    const spaced = verify(data({ personal: { phone: '+442079460958' } }), doc)
    expect(spaced.data.personal.phone).toBe('+442079460958')
  })

  it('keeps the warnings the extractor already produced', () => {
    const out = verify(normalize(result({ personal, sections: [] }, [{ code: 'NO_NAME', message: 'x' }])), doc)
    expect(out.warnings[0].code).toBe('NO_NAME')
  })
})
