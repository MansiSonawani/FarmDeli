import { describe, expect, it } from 'vitest'
import { levelOf, parseTags } from './tags.js'

const line = (text, extra = {}) => ({ text, page: 1, column: 0, bold: false, ...extra })
const names = (items) => items.map((i) => i.name)

describe('levelOf', () => {
  it.each([
    ['Native', 'languages', 4],
    ['Native or bilingual proficiency', 'languages', 4],
    ['Fluent', 'languages', 3],
    ['C1', 'languages', 3],
    ['Professional working proficiency', 'languages', 2],
    ['B2', 'languages', 2],
    ['Basic', 'languages', 1],
    ['A2', 'languages', 1],
    ['Expert', 'skills', 4],
    ['Advanced', 'skills', 3],
    ['Intermediate', 'skills', 2],
    ['Beginner', 'skills', 1],
    ['something else', 'skills', 0],
  ])('%s (%s) -> %i', (text, type, level) => {
    expect(levelOf(text, type)).toBe(level)
  })
})

describe('parseTags', () => {
  it('reads one item per line and comma-separated lists', () => {
    expect(names(parseTags([line('Figma'), line('Prototyping, User research; HTML & CSS')], 'skills'))).toEqual([
      'Figma',
      'Prototyping',
      'User research',
      'HTML & CSS',
    ])
  })

  it('reads rows of pills, which arrive as tab-separated cells', () => {
    expect(names(parseTags([line('Python\tGo\tSQL')], 'skills'))).toEqual(['Python', 'Go', 'SQL'])
  })

  it('drops the label of "Label: a, b" lines but keeps "Skill: Level"', () => {
    const tools = parseTags([line('Tools: Tableau, Power BI, Excel')], 'skills')
    expect(names(tools)).toEqual(['Tableau', 'Power BI', 'Excel'])
    const level = parseTags([line('Python: Expert')], 'skills')
    expect(level).toEqual([{ name: 'Python', info: '', level: 4 }])
  })

  it('reads levels written in brackets, after a dash, or in the next cell', () => {
    const items = parseTags([line('Swedish (Native), English – Fluent'), line('German\tBasic')], 'languages')
    expect(items.map((i) => [i.name, i.level])).toEqual([
      ['Swedish', 4],
      ['English', 3],
      ['German', 1],
    ])
  })

  it('keeps other brackets as details and does not split inside them', () => {
    const items = parseTags([line('Cloud (AWS, GCP), Docker (5 years)')], 'skills')
    expect(items.map((i) => [i.name, i.info])).toEqual([
      ['Cloud', 'AWS, GCP'],
      ['Docker', '5 years'],
    ])
  })

  it('does not mistake "research (Advanced)" for a level of the item before it', () => {
    const items = parseTags(
      [
        line('Prototyping (Advanced), User', { x: 0, width: 395, firstWordWidth: 30, y: 10 }),
        line('research (Advanced)', { x: 0, width: 90, firstWordWidth: 55, y: 23 }),
      ],
      'skills',
      { rightEdge: () => 400 },
    )
    expect(items.map((i) => [i.name, i.level])).toEqual([
      ['Prototyping', 3],
      ['User research', 3],
    ])
  })

  it('removes duplicates and bullet glyphs', () => {
    expect(names(parseTags([line('• Python'), line('python'), line('- Go')], 'skills'))).toEqual(['Python', 'Go'])
  })

  it('joins a comma-separated paragraph that wraps over lines before splitting it', () => {
    const wrap = { rightEdge: () => 400 }
    const items = parseTags(
      [
        line('Python, Go, Machine', { x: 0, width: 395, firstWordWidth: 30, y: 10 }),
        line('learning, SQL', { x: 0, width: 80, firstWordWidth: 40, y: 23 }),
      ],
      'skills',
      wrap,
    )
    expect(names(items)).toEqual(['Python', 'Go', 'Machine learning', 'SQL'])
  })
})
