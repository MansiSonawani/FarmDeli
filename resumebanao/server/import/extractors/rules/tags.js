import { stripBullet } from './text.js'
import { mergeWrapped } from './wrap.js'

// Short lists (T11): skills, languages, interests. They arrive as one item per line, as comma-separated
// paragraphs, as rows of "pills" (cells separated by tabs), or grouped under labels ("Tools: Tableau, Excel").

// The level a word stands for, in the order of the app's levels (see SECTION_TYPES in src/lib/defaults.js).
const LEVELS = {
  languages: [
    [4, /native|mother tongue|bilingual|first language/i],
    [3, /fluent|full professional|proficient|advanced|\bc[12]\b/i],
    [2, /professional working|conversational|intermediate|working proficiency|\bb[12]\b/i],
    [1, /limited|elementary|basic|beginner|\ba[12]\b|learning/i],
  ],
  skills: [
    [4, /expert|master/i],
    [3, /advanced|proficient|strong/i],
    [2, /intermediate|competent|working knowledge/i],
    [1, /beginner|basic|novice|familiar|learning/i],
  ],
}

// Is the whole text a level word ("Native", "(Fluent)") with nothing else in it? "research (Advanced)" is not.
function isLevelOnly(text, type) {
  for (const [, pattern] of LEVELS[type] ?? []) {
    const match = text.match(pattern)
    if (match && text.replace(match[0], '').replace(/[^\p{L}\d]/gu, '') === '') return true
  }
  return false
}

export function levelOf(text, type) {
  for (const [level, pattern] of LEVELS[type] ?? []) if (pattern.test(text)) return level
  return 0
}

// Splits on commas, semicolons, pipes, bullets and tabs, but not inside brackets: "Cloud (AWS, GCP), Docker".
function splitList(text) {
  const parts = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if ('([{'.includes(char)) depth++
    else if (')]}'.includes(char)) depth = Math.max(0, depth - 1)
    if (depth === 0 && /[,;|•·▪●\t]/.test(char)) {
      parts.push(current)
      current = ''
    } else current += char
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

// "Swedish (Native)", "English – Fluent", "Python: Expert", "Figma".
function parseItem(raw, type) {
  const item = { name: raw, info: '', level: 0 }
  const paren = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (paren && paren[1]) {
    item.name = paren[1]
    const level = levelOf(paren[2], type)
    if (level) item.level = level
    else item.info = paren[2].trim()
    return item
  }
  const dash = raw.match(/^(.+?)\s+[–—-]\s+(.+)$/) ?? raw.match(/^([^:]{1,40}):\s*(.+)$/)
  if (dash) {
    const level = levelOf(dash[2], type)
    if (level) {
      item.name = dash[1]
      item.level = level
    }
  }
  return item
}

/**
 * @param {object[]} lines
 * @param {string} type 'skills' | 'languages' | 'interests' | a custom list
 */
export function parseTags(lines, type, wrap) {
  const items = []
  const seen = new Set()
  const add = (item) => {
    const name = item.name.replace(/^[\s\-–—•*]+|[\s.]+$/g, '').trim()
    if (!name || name.length > 80 || !/\p{L}/u.test(name)) return
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    items.push({ ...item, name })
  }

  // A comma-separated paragraph wraps over several lines; join them before cutting it into items.
  // List items may start in lower case ("iOS", "jQuery"), so that clue is not used here.
  for (const { text: logical } of mergeWrapped(lines, { ...wrap, lowercaseJoins: false })) {
    let text = stripBullet(logical).trim()
    if (!text) continue

    // "Tools: Tableau, Excel" -> the label is dropped; "Python: Expert" is a skill with a level.
    const label = text.match(/^([\p{L}][\p{L} &/+.-]{1,30}):\s*(.+)$/u)
    if (label && !(levelOf(label[2], type) && !label[2].includes(','))) text = label[2]

    for (const raw of splitList(text)) {
      // A cell that is only a level ("Native") belongs to the item before it.
      const last = items[items.length - 1]
      if (last && last.level === 0 && isLevelOnly(raw, type)) {
        last.level = levelOf(raw, type)
        continue
      }
      add(parseItem(raw, type))
    }
  }
  return items.slice(0, 100)
}
