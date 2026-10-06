import mammoth from 'mammoth'
import { parseDocument } from 'htmlparser2'
import { ImportError, MAX_PAGES } from '../errors.js'
import { isSafeZip } from './zip.js'

// DOCX reader (T6): Word -> HTML (mammoth) -> lines. Word does not store page breaks, so the page count is
// estimated from the amount of text. Each line keeps the flags extractors can use: `heading` (a Word heading
// style), `listItem` (a real bullet/numbered list) and `bold`. Table cells on one row become one line,
// separated by tabs, the same way the PDF reader writes wide gaps.
//
// Not read: text boxes, headers and footers. If contact details live there, the extractor warns about it.

const CHARS_PER_PAGE = 4_500
const TAG_HEADING = /^h[1-6]$/
const TAG_BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const TAG_BOLD = new Set(['strong', 'b'])

const unreadable = () =>
  new ImportError(
    422,
    'UNREADABLE',
    "We couldn't read that Word file. Try saving it again as .docx, then upload the new file.",
  )

/** @returns {Promise<import('../types.js').ParsedDocument>} */
export async function readDocx(buffer) {
  if (!isSafeZip(buffer)) throw unreadable()

  let html
  try {
    ;({ value: html } = await mammoth.convertToHtml(
      { buffer },
      { styleMap: ["p[style-name='Title'] => h1:fresh"], ignoreEmptyParagraphs: true },
    ))
  } catch {
    throw unreadable()
  }

  const lines = []
  walk(parseDocument(html).children, false, lines)

  const text = lines.map((l) => l.text).join('\n')
  if (text.replace(/\s/g, '').length < 20) {
    throw new ImportError(422, 'NO_CONTENT', "We couldn't find any text in that file.")
  }
  const pageCount = Math.max(1, Math.ceil(text.length / CHARS_PER_PAGE))
  if (pageCount > MAX_PAGES) {
    throw new ImportError(
      422,
      'TOO_MANY_PAGES',
      `That resume has more than ${MAX_PAGES} pages. Please upload a shorter version.`,
    )
  }
  return { kind: 'docx', pageCount, lines, text }
}

function walk(nodes, inList, lines) {
  for (const node of nodes) {
    if (node.type !== 'tag') continue
    if (TAG_BLOCK.has(node.name)) {
      pushBlock(node, { heading: TAG_HEADING.test(node.name), listItem: inList }, lines)
    } else if (node.name === 'ul' || node.name === 'ol') {
      walk(node.children, true, lines)
    } else if (node.name === 'li') {
      // A list item holds its own text (often inside a <p>); nested lists are separate items.
      pushBlock(node, { heading: false, listItem: true }, lines)
      walk(
        node.children.filter((c) => c.type === 'tag' && (c.name === 'ul' || c.name === 'ol')),
        true,
        lines,
      )
    } else if (node.name === 'table') {
      pushTable(node, lines)
    } else {
      walk(node.children ?? [], inList, lines)
    }
  }
}

// The text of an element as bold/regular runs; <br> becomes a "\n" run. Nested lists are skipped here.
function runs(node, bold = false, out = []) {
  for (const child of node.children ?? []) {
    if (child.type === 'text') out.push({ text: child.data, bold })
    else if (child.type === 'tag') {
      if (child.name === 'br') out.push({ text: '\n', bold })
      else if (child.name === 'ul' || child.name === 'ol') continue
      else runs(child, bold || TAG_BOLD.has(child.name), out)
    }
  }
  return out
}

function lineFrom(parts, flags) {
  const text = parts
    .map((p) => p.text)
    .join('')
    .replace(/[  ]+/g, ' ')
    .replace(/ ?\t ?/g, '\t')
    .trim()
  if (!text) return null
  // Bold describes the first cell (before any tab): the title, not a right-aligned date.
  const firstCell = []
  for (const part of parts) {
    const [before, ...rest] = part.text.split('\t')
    firstCell.push({ ...part, text: before })
    if (rest.length) break
  }
  const count = (list) => list.reduce((n, p) => n + p.text.replace(/\s/g, '').length, 0)
  const visible = count(firstCell)
  const boldChars = count(firstCell.filter((p) => p.bold))
  return { text, page: 1, column: 0, bold: visible > 0 && boldChars / visible >= 0.6, ...flags }
}

function pushBlock(node, flags, lines) {
  // Split on <br>: each visual line is its own line, with the same flags.
  let current = []
  const flush = () => {
    const line = lineFrom(current, flags)
    if (line) lines.push(line)
    current = []
  }
  for (const part of runs(node)) {
    if (part.text === '\n') flush()
    else current.push(part)
  }
  flush()
}

function pushTable(table, lines) {
  const rows = []
  const collect = (nodes) => {
    for (const node of nodes) {
      if (node.type !== 'tag') continue
      if (node.name === 'tr') rows.push(node)
      else collect(node.children ?? [])
    }
  }
  collect(table.children)
  for (const row of rows) {
    const cells = row.children
      .filter((c) => c.type === 'tag' && (c.name === 'td' || c.name === 'th'))
      .map((cell) => runs(cell, false).map((p) => (p.text === '\n' ? { ...p, text: ' ' } : p)))
    const parts = cells.flatMap((cell, i) => (i === 0 ? cell : [{ text: '\t', bold: false }, ...cell]))
    const line = lineFrom(parts, { heading: false, listItem: false })
    if (line) lines.push(line)
  }
}
