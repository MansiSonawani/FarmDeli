const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Dates are stored as "YYYY" or "YYYY-MM".
export function formatDate(value, format = 'MMM YYYY') {
  if (!value) return ''
  const [year, month] = value.split('-')
  if (!month || format === 'YYYY') return year
  if (format === 'MM/YYYY') return `${month}/${year}`
  return `${MONTHS[Number(month) - 1] ?? ''} ${year}`.trim()
}

export function formatRange(entry, format) {
  const start = formatDate(entry.startDate, format)
  const end = entry.current ? 'Present' : formatDate(entry.endDate, format)
  if (start && end) return `${start} – ${end}`
  return start || end
}

// Description text uses a tiny markup: lines starting with "-", "*" or "•"
// become bullet points and **text** becomes bold. Returns a list of blocks:
//   { type: 'p', spans } | { type: 'ul', items: [spans] }
export function parseRichText(text) {
  const blocks = []
  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trimEnd()
    if (!line.trim()) continue
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      const spans = parseInline(bullet[1])
      if (last?.type === 'ul') last.items.push(spans)
      else blocks.push({ type: 'ul', items: [spans] })
    } else {
      blocks.push({ type: 'p', spans: parseInline(line.trim()) })
    }
  }
  return blocks
}

export function parseInline(text) {
  const spans = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let match
  while ((match = re.exec(text))) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index), bold: false })
    spans.push({ text: match[1], bold: true })
    last = re.lastIndex
  }
  if (last < text.length) spans.push({ text: text.slice(last), bold: false })
  return spans
}

export function hrefFor(value, kind) {
  if (!value) return null
  if (kind === 'email') return `mailto:${value}`
  if (kind === 'phone') return `tel:${value.replace(/[^\d+]/g, '')}`
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    const n = Math.floor(seconds / size)
    if (n >= 1) return `${n} ${unit}${n > 1 ? 's' : ''} ago`
  }
  return 'just now'
}
