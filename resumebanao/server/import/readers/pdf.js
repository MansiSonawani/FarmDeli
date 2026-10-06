import { ImportError, MAX_PAGES } from '../errors.js'

// PDF reader (T5): turns a PDF into ordered text lines with their size, boldness and position.
//
// - Text is grouped into lines by baseline. A large horizontal gap inside a line (a right-aligned date,
//   a skill "pill") is written as a tab, so extractors can split a line into cells.
// - Two-column layouts are detected from an empty vertical gutter. Lines then come out column by column
//   (left column first, every page), each line carrying its `column`, so a section that continues on the
//   next page stays together.
// - There is no OCR: a PDF with no text layer is reported as SCANNED_PDF.

const MIN_TEXT_CHARS = 20 // fewer characters than this across the file means it is a picture of text
const MAX_ITEMS = 60_000 // a real resume has a few hundred; this stops abusive files early
const TIMEOUT_MS = 25_000
const BOLD_FONT = /bold|black|heavy|demi/i

let pdfjsPromise
const loadPdfjs = () => (pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs'))

const unreadable = () =>
  new ImportError(
    422,
    'UNREADABLE',
    "We couldn't read that PDF. Try saving or exporting it again, then upload the new file.",
  )

export function mapPdfError(error) {
  if (error instanceof ImportError) return error
  if (error?.name === 'PasswordException') {
    return new ImportError(422, 'ENCRYPTED', 'That PDF is password-protected. Remove the password and try again.')
  }
  return unreadable()
}

/** @returns {Promise<import('../types.js').ParsedDocument>} */
export async function readPdf(buffer) {
  const pdfjs = await loadPdfjs()
  let task
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(unreadable()), TIMEOUT_MS)
  })

  try {
    // pdf.js may take over the memory it is given, so it gets a copy rather than our Buffer.
    const data = new Uint8Array(buffer.length)
    data.set(buffer)
    task = pdfjs.getDocument({
      data,
      verbosity: 0,
      isEvalSupported: false, // never evaluate code from a file we do not trust
      useSystemFonts: false,
      disableFontFace: true,
      fontExtraProperties: true, // needed to see font names, which is how we tell bold from regular
    })
    return await Promise.race([readDocument(pdfjs, await Promise.race([task.promise, timeout])), timeout])
  } catch (error) {
    throw mapPdfError(error)
  } finally {
    clearTimeout(timer)
    task?.destroy().catch(() => {})
  }
}

async function readDocument(pdfjs, doc) {
  if (doc.numPages > MAX_PAGES) {
    throw new ImportError(
      422,
      'TOO_MANY_PAGES',
      `That resume has more than ${MAX_PAGES} pages. Please upload a shorter version.`,
    )
  }

  const pages = []
  let itemCount = 0
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await readPage(pdfjs, doc, n)
    itemCount += page.items.length
    if (itemCount > MAX_ITEMS) throw unreadable()
    pages.push(page)
  }

  const chars = pages.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.text.trim().length, 0), 0)
  if (chars < MIN_TEXT_CHARS) {
    throw new ImportError(
      422,
      'SCANNED_PDF',
      'This PDF looks like a scan or a picture, so there is no text to read. Export a PDF from Word or Google Docs instead, or start with a blank resume.',
    )
  }

  // One gutter for the whole document, found on the first page that has one and reused for the rest.
  const gutter = pages.map((p) => findGutter(p.items, p.width)).find((g) => g !== null) ?? null
  const lines = []
  for (const page of pages) {
    const split = gutter !== null && crossings(page.items, gutter) <= allowedCrossings(page.items)
    lines.push(...buildLines(page.items, page.number, split ? gutter : null))
  }
  // Column-major: every page of the left column, then every page of the right one.
  lines.sort((a, b) => a.column - b.column || a.page - b.page || a.y - b.y || a.x - b.x)

  return {
    kind: 'pdf',
    pageCount: pages.length,
    lines,
    text: lines.map((l) => l.text).join('\n'),
    columns: gutter === null ? 1 : 2,
  }
}

async function readPage(pdfjs, doc, number) {
  const page = await doc.getPage(number)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  await page.getOperatorList() // loads the page's fonts, which makes their names available

  const boldFonts = new Set()
  for (const id of Object.keys(content.styles)) {
    try {
      if (page.commonObjs.has(id) && BOLD_FONT.test(page.commonObjs.get(id).name ?? '')) boldFonts.add(id)
    } catch {
      // font not available: treated as regular
    }
  }

  const items = []
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const t = pdfjs.Util.transform(viewport.transform, item.transform) // to top-left page coordinates
    if (Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01) continue // rotated or vertical text
    items.push({
      text: item.str,
      x: t[4],
      y: t[5],
      width: item.width,
      size: Math.abs(t[0]),
      bold: boldFonts.has(item.fontName),
    })
  }
  page.cleanup()
  return { number, width: viewport.width, items }
}

// The widest empty vertical strip in the middle of the page, if there is real text on both sides of it.
function findGutter(items, pageWidth) {
  if (items.length < 8) return null
  const bins = new Int32Array(Math.ceil(pageWidth) + 2)
  for (const item of items) {
    for (let x = Math.max(0, Math.floor(item.x)); x <= Math.min(bins.length - 1, Math.ceil(item.x + item.width)); x++) {
      bins[x]++
    }
  }
  const allowed = allowedCrossings(items)
  const from = Math.floor(pageWidth * 0.2)
  const to = Math.ceil(pageWidth * 0.8)
  let best = null
  for (let x = from; x <= to;) {
    if (bins[x] > allowed) {
      x++
      continue
    }
    const start = x
    while (x <= to && bins[x] <= allowed) x++
    if (!best || x - start > best.end - best.start) best = { start, end: x }
  }
  if (!best || best.end - best.start < 8) return null

  const gutter = (best.start + best.end) / 2
  const left = items.filter((i) => i.x + i.width / 2 < gutter).length
  const right = items.length - left
  return left >= items.length * 0.12 && right >= items.length * 0.12 ? gutter : null
}

const allowedCrossings = (items) => Math.max(2, Math.floor(items.length * 0.02))
const crossings = (items, gutter) => items.filter((i) => i.x < gutter - 2 && i.x + i.width > gutter + 2).length

// Groups one page's items into lines. With a gutter, items that start left of it (including full-width
// banners that cross it) form column 0 and the rest column 1.
function buildLines(items, page, gutter) {
  const lines = []
  for (const column of gutter === null ? [0] : [0, 1]) {
    const mine = items.filter((i) => gutter === null || (i.x < gutter - 2 ? 0 : 1) === column)
    mine.sort((a, b) => a.y - b.y || a.x - b.x)

    let group = []
    const flush = () => {
      if (group.length) lines.push(toLine(group, page, column))
      group = []
    }
    for (const item of mine) {
      const first = group[0]
      if (first && Math.abs(item.y - first.y) > 0.4 * Math.min(item.size, first.size)) flush()
      group.push(item)
    }
    flush()
  }
  return lines
}

function toLine(group, page, column) {
  group.sort((a, b) => a.x - b.x)
  let text = ''
  let boldChars = 0
  let chars = 0
  const sizes = new Map()
  let firstCell = true // bold and size describe the first cell: the title, not a right-aligned date
  let previous = null
  for (const item of group) {
    if (previous) {
      const gap = item.x - (previous.x + previous.width)
      const size = Math.max(item.size, previous.size)
      if (gap > 1.0 * size) {
        text += '\t'
        firstCell = false
      } else if (gap > 0.15 * size && !/\s$/.test(text) && !/^\s/.test(item.text)) text += ' '
    }
    const piece = previous ? item.text.replace(/^\s+/, '') : item.text.trimStart()
    text += piece
    if (firstCell) {
      const length = piece.replace(/\s/g, '').length
      chars += length
      if (item.bold) boldChars += length
      const rounded = Math.round(item.size * 2) / 2
      sizes.set(rounded, (sizes.get(rounded) ?? 0) + length)
    }
    previous = item
  }
  const last = group[group.length - 1]
  const fontSize = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0]
  return {
    text: text.replace(/[ ]+\t[ ]*|\t[ ]+/g, '\t').trim(),
    page,
    column,
    x: group[0].x,
    y: group[0].y,
    width: last.x + last.width - group[0].x,
    fontSize,
    bold: chars > 0 && boldChars / chars >= 0.6,
  }
}
