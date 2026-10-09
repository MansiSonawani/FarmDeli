// Builds a minimal iCalendar (.ics) file for one event so a next step can be
// added to Google Calendar, Outlook or Apple Calendar.

const pad = (n) => String(n).padStart(2, '0')

function utcStamp(date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

function dateStamp(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

// RFC 5545 text escaping.
function escapeText(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`)
}

export function buildIcs({
  id,
  title,
  description = '',
  start,
  allDay = false,
  durationMinutes = 60,
  now = new Date(),
}) {
  const begin = new Date(start)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//resumebanao//Job tracker//EN', 'BEGIN:VEVENT']
  lines.push(`UID:${id}@resumebanao`, `DTSTAMP:${utcStamp(now)}`)
  if (allDay) {
    const next = new Date(begin)
    next.setDate(next.getDate() + 1)
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(begin)}`, `DTEND;VALUE=DATE:${dateStamp(next)}`)
  } else {
    lines.push(`DTSTART:${utcStamp(begin)}`, `DTEND:${utcStamp(new Date(begin.getTime() + durationMinutes * 60000))}`)
  }
  lines.push(`SUMMARY:${escapeText(title)}`)
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

export function downloadIcs(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
