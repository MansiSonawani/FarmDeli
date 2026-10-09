import { hasBulletGlyph, isAllCaps, titleCase, words } from './text.js'

// Splits a document's lines into sections (T8).
//
// 1. A line is a heading when it is a short line on its own whose text is a known section name
//    ("Work Experience", "Skills", ...). That is reliable, so formatting is not required.
// 2. The formatting of those headings (bold, capitals, size, Word heading style) is the document's heading
//    style. Other short lines in the same style are headings of sections we do not know, and become custom
//    sections. This keeps bold job titles and company names from being mistaken for headings.
// 3. Lines are grouped into sections, restarting at every heading and at every column change. The lines
//    before a column's first heading are its "zone": usually the name and contact details.

const SYNONYMS = {
  summary: [
    'summary',
    'professional summary',
    'career summary',
    'executive summary',
    'summary of qualifications',
    'profile',
    'professional profile',
    'personal profile',
    'about',
    'about me',
    'objective',
    'career objective',
    'professional objective',
    'personal statement',
    'overview',
    'introduction',
    'bio',
  ],
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment',
    'employment history',
    'work history',
    'career history',
    'relevant experience',
    'professional background',
    'work background',
    'career',
    'internships',
    'internship experience',
    'industry experience',
    'experience and achievements',
  ],
  education: [
    'education',
    'academic background',
    'education and training',
    'education and qualifications',
    'academic qualifications',
    'qualifications',
    'academics',
    'academic history',
    'educational background',
    'studies',
  ],
  projects: [
    'projects',
    'personal projects',
    'key projects',
    'selected projects',
    'side projects',
    'academic projects',
    'open source',
    'open source projects',
    'notable projects',
  ],
  certificates: [
    'certificates',
    'certifications',
    'licenses and certifications',
    'licences and certifications',
    'certifications and licenses',
    'courses',
    'certifications and courses',
    'professional certifications',
    'training',
    'training and certifications',
    'courses and certifications',
  ],
  awards: [
    'awards',
    'honors',
    'honours',
    'awards and honors',
    'awards and honours',
    'honors and awards',
    'honours and awards',
    'achievements',
    'accomplishments',
    'awards and achievements',
    'scholarships',
    'recognition',
  ],
  volunteering: [
    'volunteering',
    'volunteer',
    'volunteer experience',
    'volunteer work',
    'community involvement',
    'community service',
    'leadership',
    'leadership and volunteering',
  ],
  skills: [
    'skills',
    'technical skills',
    'key skills',
    'core skills',
    'core competencies',
    'competencies',
    'skills and tools',
    'tools and technologies',
    'technologies',
    'tech stack',
    'expertise',
    'areas of expertise',
    'strengths',
    'skills and expertise',
    'technical proficiencies',
    'hard skills',
    'soft skills',
    'skills and abilities',
    'professional skills',
    'it skills',
  ],
  languages: ['languages', 'language skills', 'language proficiency', 'spoken languages'],
  interests: [
    'interests',
    'hobbies',
    'hobbies and interests',
    'interests and hobbies',
    'personal interests',
    'activities',
  ],
  // Their lines feed the contact details but are not sections of their own.
  contact: [
    'contact',
    'contact details',
    'contact information',
    'personal details',
    'personal information',
    'details',
    'links',
    'social',
  ],
  ignore: ['references', 'referees', 'declaration', 'references available upon request', 'publications and references'],
}

const EXACT = new Map()
for (const [type, names] of Object.entries(SYNONYMS)) for (const name of names) EXACT.set(name, type)

// When the heading style has been learned, an unknown heading that contains one of these words still gets
// a sensible type. Order matters: more specific first.
const KEYWORDS = [
  ['volunteering', /\bvolunteer/],
  ['languages', /\blanguages?\b/],
  ['experience', /\b(experience|employment|work history|career history)\b/],
  ['education', /\b(education|academic|qualifications?)\b/],
  ['projects', /\bprojects?\b/],
  ['certificates', /\b(certificat|licen[cs]|courses?|training)/],
  ['awards', /\b(awards?|honou?rs?|achievements?|accomplishments?|scholarships?|recognition)\b/],
  ['skills', /\b(skills?|competenc|expertise|technologies|tools|proficienc)/],
  ['interests', /\b(interests?|hobbies)\b/],
  ['summary', /\b(summary|profile|objective|about|overview)\b/],
  ['contact', /\b(contact|personal (details|information))\b/],
  ['ignore', /\b(references?|declaration)\b/],
]

export function normalizeHeading(text) {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const exactType = (text) => EXACT.get(normalizeHeading(text)) ?? null
export function keywordType(text) {
  const normalized = normalizeHeading(text)
  return KEYWORDS.find(([, re]) => re.test(normalized))?.[0] ?? null
}

// A line that could be a heading at all: alone on its line, short, not a sentence, not a list item.
function headingShape(line) {
  const text = line.text
  if (text.includes('\t') || line.listItem || hasBulletGlyph(text)) return false
  const count = words(text).length
  return count >= 1 && count <= 6 && text.length <= 50 && !/[.,;]$/.test(text) && /\p{L}/u.test(text)
}

const round = (n) => Math.round((n ?? 0) * 2) / 2
const styleOf = (line) => ({
  heading: Boolean(line.heading),
  bold: Boolean(line.bold),
  upper: isAllCaps(line.text),
  size: round(line.fontSize),
})
const sameStyle = (a, b) =>
  a.heading === b.heading && a.bold === b.bold && a.upper === b.upper && Math.abs(a.size - b.size) <= 0.5

// Is this style one that stands out from body text? (If headings look like body text, we cannot learn from them.)
const distinctive = (style, bodyFont) =>
  style.heading || style.bold || style.upper || (bodyFont && style.size >= bodyFont * 1.05)

// "PROFESSIONAL EXPERIENCE" -> "Professional Experience"; "Skills:" -> "Skills".
export const headingTitle = (text) => {
  const clean = text.replace(/[:\s]+$/, '')
  return isAllCaps(clean) && clean.length > 3 ? titleCase(clean) : clean
}

/**
 * @param {import('../../types.js').Line[]} lines in reading order
 * @param {{ bodyFont?: number }} context
 * @returns {{ zones: { column: number, lines: object[] }[], sections: { type: string, title: string, column: number, lines: object[] }[] }}
 */
export function splitSections(lines, { bodyFont } = {}) {
  const headings = new Map() // line index -> { type, title }

  // 1. known section names
  lines.forEach((line, i) => {
    if (!headingShape(line)) return
    const type = exactType(line.text)
    if (type) headings.set(i, { type, title: headingTitle(line.text) })
  })

  // 2a. no known names at all: fall back to keywords in lines that stand out
  if (headings.size === 0) {
    lines.forEach((line, i) => {
      if (!headingShape(line) || !distinctive(styleOf(line), bodyFont)) return
      const type = keywordType(line.text)
      if (type) headings.set(i, { type, title: headingTitle(line.text) })
    })
  }

  // 2b. learn the heading style and find sections we do not know by name
  if (headings.size > 0) {
    const counts = []
    for (const i of headings.keys()) {
      const style = styleOf(lines[i])
      const entry = counts.find((c) => sameStyle(c.style, style))
      if (entry) entry.count++
      else counts.push({ style, count: 1 })
    }
    const learned = counts.sort((a, b) => b.count - a.count)[0].style
    if (distinctive(learned, bodyFont)) {
      const firstKnown = Math.min(...headings.keys())
      lines.forEach((line, i) => {
        if (headings.has(i) || i < firstKnown || !headingShape(line)) return
        if (words(line.text).length > 5 || /\d/.test(line.text)) return
        if (!sameStyle(styleOf(line), learned)) return
        headings.set(i, { type: keywordType(line.text) ?? 'custom', title: headingTitle(line.text) })
      })
    }
  }

  // 3. group lines
  const zones = []
  const sections = []
  let current = null
  let column = null
  lines.forEach((line, i) => {
    if (line.column !== column) {
      column = line.column
      current = { zone: true, column, lines: [] }
      zones.push(current)
    }
    const heading = headings.get(i)
    if (heading) {
      current = { type: heading.type, title: heading.title, column, lines: [] }
      sections.push(current)
    } else {
      current.lines.push(line)
    }
  })
  return { zones, sections }
}
