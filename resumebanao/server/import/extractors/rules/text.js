// Small text helpers shared by the rules extractor.

const hasLower = (text) => /\p{Ll}/u.test(text)
const hasUpper = (text) => /\p{Lu}/u.test(text)

// "PROFESSIONAL EXPERIENCE" -> true; "Professional Experience" -> false; "2019" -> false.
export const isAllCaps = (text) => hasUpper(text) && !hasLower(text)

export const words = (text) => text.split(/\s+/).filter(Boolean)
export const startsLower = (text) => /^\p{Ll}/u.test(text)
export const startsUpper = (text) => /^\p{Lu}/u.test(text)
export const endsSentence = (text) => /[.!?;:]["')\]]?$/.test(text)

const SMALL_WORDS = new Set(['and', 'of', 'the', 'for', 'in', 'at', 'to', 'a', 'an', 'on', 'with', 'or', 'de', 'la'])

// "SKILLS & TOOLS" -> "Skills & Tools"; used for headings and names that were typed in capitals.
export function titleCase(text) {
  const lowered = text.toLowerCase()
  let first = true
  return lowered.replace(/[\p{L}][\p{L}'’]*/gu, (word) => {
    const small = !first && SMALL_WORDS.has(word)
    first = false
    return small ? word : word[0].toUpperCase() + word.slice(1)
  })
}

// Bullet glyphs Word and designers use, with or without a following space; and "- item" / "– item".
const GLYPH = /^\s*(?:[•▪◦‣∙●■□▸▹►○◆◇➢➤✓✔]\s*|[-–—−*]\s+)/
export const hasBulletGlyph = (text) => GLYPH.test(text)
export const stripBullet = (text) => text.replace(GLYPH, '')

// Large gaps inside a line are tabs (see readers); prose does not need them.
export const untab = (text) =>
  text
    .replace(/\s*\t\s*/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()

// Words that suggest a piece of text is a job title, a degree, or an organisation. Used to decide which
// part of "Senior Designer, Northwind Logistics" is which.
const TITLE_WORDS =
  'engineer|developer|designer|manager|analyst|consultant|intern|internship|director|lead|architect|specialist|associate|officer|administrator|scientist|coordinator|assistant|head|president|founder|co-?founder|owner|technician|representative|executive|programmer|tester|writer|editor|accountant|advisor|adviser|supervisor|researcher|teacher|nurse|clerk|agent|trainee|apprentice|volunteer|member|chair|secretary|treasurer|strategist|planner|operator|support|partner|principal|fellow|instructor|tutor|lecturer|professor|cto|ceo|cfo|coo|vp|marketer|recruiter|generalist|representative|freelancer|contractor|tutor|mentor|coach|trainer|buyer|cashier|barista|waiter|driver|pharmacist|physician|therapist|paralegal|attorney|lawyer|auditor|controller|bookkeeper|copywriter|producer|animator|illustrator|photographer|translator|interpreter|librarian|counsel|manager|lecturer|engineering|developer'
const DEGREE_WORDS =
  'bsc|msc|ba|ma|bs|ms|phd|mba|mphil|bba|beng|meng|bfa|mfa|llb|llm|b\\.?tech|m\\.?tech|b\\.?e|m\\.?e|b\\.?com|m\\.?com|bachelor|bachelors|master|masters|doctorate|doctor|diploma|degree|associate|baccalaureate|gcse|a-levels?|high school|secondary|certificate|bootcamp|honou?rs'
const ORG_WORDS =
  'inc|llc|ltd|limited|gmbh|ag|sa|srl|plc|corp|corporation|company|co|group|studio|studios|labs?|technologies|technology|tech|solutions|systems|software|consulting|consultants|agency|partners|media|logistics|payments|bank|university|college|school|institute|academy|foundation|association|society|hospital|clinic|council|ministry|department|office|network|services|industries|enterprises|holdings|analytics|insights|retail|messaging|ventures|international|global|polytechnic|hochschule|faculty|press|labs|collective|centre|center|club|trust|charity|bureau|motors|airlines|airways|foods|stores|capital|finance|insurance|assurance|pharma|therapeutics|robotics|dynamics|networks|awards|award|prize|prizes'
const SCHOOL_WORDS =
  'university|college|school|institute|academy|polytechnic|hochschule|hogeschool|faculty|facultad|universit[aeéy]t?|universidad|universidade|escuela|colegio|instituto|école|ecole|lycée|lycee|gymnasium'

const wordRe = (list) => new RegExp(`(?:^|[^\\p{L}])(?:${list})(?=$|[^\\p{L}])`, 'iu')
export const hasTitleWord = (text) => wordRe(TITLE_WORDS).test(text)
export const hasDegreeWord = (text) => wordRe(DEGREE_WORDS).test(text)
export const hasOrgWord = (text) => wordRe(ORG_WORDS).test(text)
export const hasSchoolWord = (text) => wordRe(SCHOOL_WORDS).test(text)
