import { describe, expect, it } from 'vitest'
import { exactType, headingTitle, keywordType, normalizeHeading, splitSections } from './sections.js'

const line = (text, extra = {}) => ({ text, page: 1, column: 0, bold: false, ...extra })

describe('heading recognition', () => {
  it.each([
    ['Work Experience', 'experience'],
    ['PROFESSIONAL EXPERIENCE', 'experience'],
    ['Employment History:', 'experience'],
    ['Education & Training', 'education'],
    ['Skills', 'skills'],
    ['Technical Skills', 'skills'],
    ['Languages', 'languages'],
    ['Hobbies and Interests', 'interests'],
    ['Certifications', 'certificates'],
    ['Honors & Awards', 'awards'],
    ['About Me', 'summary'],
    ['Professional Summary', 'summary'],
    ['Volunteer Experience', 'volunteering'],
    ['Personal Details', 'contact'],
    ['References', 'ignore'],
  ])('%s -> %s', (text, type) => {
    expect(exactType(text)).toBe(type)
  })

  it('does not treat other text as a heading', () => {
    expect(exactType('Senior Product Designer')).toBeNull()
    expect(exactType('Project Manager')).toBeNull()
    expect(exactType('Education First')).toBeNull()
  })

  it('finds a type from keywords, most specific first', () => {
    expect(keywordType('Volunteer Experience Abroad')).toBe('volunteering')
    expect(keywordType('Language Skills Overview')).toBe('languages')
    expect(keywordType('Teaching Experience')).toBe('experience')
    expect(keywordType('Publications')).toBeNull()
  })

  it('normalizes punctuation and case', () => {
    expect(normalizeHeading('SKILLS & TOOLS:')).toBe('skills and tools')
  })

  it('writes capitals as a title but leaves normal headings alone', () => {
    expect(headingTitle('PROFESSIONAL EXPERIENCE')).toBe('Professional Experience')
    expect(headingTitle('Skills & Tools:')).toBe('Skills & Tools')
    expect(headingTitle('IT')).toBe('IT')
  })
})

describe('splitSections', () => {
  const heading = { bold: true, fontSize: 10.5 }
  const body = { fontSize: 9.5 }

  it('splits at known headings and keeps the zone before the first one', () => {
    const { zones, sections } = splitSections([
      line('Maya Lindqvist', { bold: true, fontSize: 24 }),
      line('maya@example.com', body),
      line('PROFILE', heading),
      line('Designer.', body),
      line('EDUCATION', heading),
      line('MSc Design', body),
    ])
    expect(zones).toHaveLength(1)
    expect(zones[0].lines.map((l) => l.text)).toEqual(['Maya Lindqvist', 'maya@example.com'])
    expect(sections.map((s) => [s.type, s.title, s.lines.length])).toEqual([
      ['summary', 'Profile', 1],
      ['education', 'Education', 1],
    ])
  })

  it('learns the heading style and turns unknown headings in that style into custom sections', () => {
    const { sections } = splitSections([
      line('PROFILE', heading),
      line('Designer.', body),
      line('PUBLICATIONS', heading),
      line('A paper', body),
      line('Project Manager', { bold: true, fontSize: 9.5 }), // bold, but not the heading style
      line('SKILLS', heading),
      line('Figma', body),
    ])
    expect(sections.map((s) => [s.type, s.title])).toEqual([
      ['summary', 'Profile'],
      ['custom', 'Publications'],
      ['skills', 'Skills'],
    ])
    expect(sections[1].lines.map((l) => l.text)).toEqual(['A paper', 'Project Manager'])
  })

  it('does not call an unknown heading before the first known one a section (it is the name)', () => {
    const { zones, sections } = splitSections([
      line('MAYA LINDQVIST', heading),
      line('PROFILE', heading),
      line('Designer.', body),
    ])
    expect(zones[0].lines.map((l) => l.text)).toEqual(['MAYA LINDQVIST'])
    expect(sections).toHaveLength(1)
  })

  it('restarts at each column so a sidebar never runs into the main column', () => {
    const { zones, sections } = splitSections([
      line('Email me', { column: 0 }),
      line('SKILLS', { column: 0, ...heading }),
      line('Figma', { column: 0 }),
      line('Maya Lindqvist', { column: 1, bold: true, fontSize: 24 }),
      line('EXPERIENCE', { column: 1, ...heading }),
      line('Designer', { column: 1 }),
    ])
    expect(zones.map((z) => [z.column, z.lines.map((l) => l.text)])).toEqual([
      [0, ['Email me']],
      [1, ['Maya Lindqvist']],
    ])
    expect(sections.map((s) => [s.type, s.column, s.lines.map((l) => l.text)])).toEqual([
      ['skills', 0, ['Figma']],
      ['experience', 1, ['Designer']],
    ])
  })

  it('ignores list items and sentences that look like headings', () => {
    const { sections } = splitSections([
      line('SKILLS', heading),
      line('Education', { listItem: true }),
      line('Education.', {}),
    ])
    expect(sections).toHaveLength(1)
    expect(sections[0].lines).toHaveLength(2)
  })
})
