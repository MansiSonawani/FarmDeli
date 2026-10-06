// Checks extracted values against the file they came from (T12c). A value that does not appear in the source
// text was invented or mangled, so it is blanked and reported instead of being handed to the user as fact. The
// rules extractor copies text and rarely trips this; an AI extractor is the reason it exists.

const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b)

// Compare without caring about case, spacing, accents of quotes and dashes.
const squash = (text) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll(ZERO_WIDTH_SPACE, '')
    .replace(/\s+/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')

/**
 * @param {import('./types.js').ImportResult} result already normalized
 * @param {import('./types.js').ParsedDocument} doc
 */
export function verify(result, doc) {
  const text = squash(doc.text)
  const digits = doc.text.replace(/\D/g, '')
  const warnings = [...result.warnings]
  const dropped = new Set()

  // A value passes when each comma-separated part appears somewhere in the file.
  const found = (value) => value.split(/\s*,\s*/).every((part) => !part || text.includes(squash(part)))
  const keep = (value, field, label, ok = found(value)) => {
    if (!value || ok) return value
    if (!dropped.has(label)) {
      dropped.add(label)
      warnings.push({
        code: 'NOT_IN_SOURCE',
        message: `We couldn't confirm the ${label} in your file, so it was left blank.`,
        field,
      })
    }
    return ''
  }

  const personal = { ...result.data.personal }
  for (const [field, label] of [
    ['fullName', 'name'],
    ['jobTitle', 'job title'],
    ['email', 'email'],
    ['website', 'website'],
    ['linkedin', 'LinkedIn address'],
    ['location', 'location'],
  ]) {
    personal[field] = keep(personal[field], field, label)
  }
  personal.phone = keep(personal.phone, 'phone', 'phone number', digits.includes(personal.phone.replace(/\D/g, '')))

  const yearFound = (date) => !date || doc.text.includes(date.slice(0, 4))
  const sections = result.data.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if ('name' in item) return { ...item, name: keep(item.name, 'name', 'skill or language') }
      const checked = {
        ...item,
        title: keep(item.title, 'title', 'job, degree or project title'),
        subtitle: keep(item.subtitle, 'subtitle', 'company or school'),
        location: keep(item.location, 'location', 'location'),
      }
      checked.startDate = keep(item.startDate, 'startDate', 'date', yearFound(item.startDate))
      checked.endDate = keep(item.endDate, 'endDate', 'date', yearFound(item.endDate))
      return checked
    }),
  }))
  return { ...result, data: { personal, sections }, warnings }
}
