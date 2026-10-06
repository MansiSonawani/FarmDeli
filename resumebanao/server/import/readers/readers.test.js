import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ImportError } from '../errors.js'
import { mapPdfError, readPdf } from './pdf.js'
import { readDocx } from './docx.js'
import { isSafeZip, zipSizes } from './zip.js'

const fixture = (name) => readFileSync(new URL(`../__fixtures__/${name}`, import.meta.url))

describe('readPdf', () => {
  it('reads a one-column PDF into ordered lines with size, boldness and cells', async () => {
    const doc = await readPdf(fixture('template-classic.pdf'))
    expect(doc.kind).toBe('pdf')
    expect(doc.columns).toBe(1)
    expect(doc.lines.every((l) => l.column === 0)).toBe(true)

    const name = doc.lines[0]
    expect(name.text).toBe('Maya Lindqvist')
    expect(name.bold).toBe(true)
    expect(name.fontSize).toBeGreaterThan(20)

    const heading = doc.lines.find((l) => l.text === 'PROFESSIONAL EXPERIENCE')
    expect(heading.bold).toBe(true)
    expect(heading.fontSize).toBeGreaterThan(10)
    // A right-aligned date becomes its own tab-separated cell.
    expect(doc.lines.map((l) => l.text)).toContain('Senior Product Designer\tMar 2021 – Present')
    expect(doc.text).toContain('Northwind Logistics')
  })

  it('detects a two-column layout and keeps each column together', async () => {
    const doc = await readPdf(fixture('template-modern.pdf'))
    expect(doc.columns).toBe(2)
    const at = (text) => doc.lines.findIndex((l) => l.text === text)
    const [skills, languages, name, experience] = [
      'SKILLS',
      'LANGUAGES',
      'Maya Lindqvist',
      'PROFESSIONAL EXPERIENCE',
    ].map(at)
    expect(doc.lines[skills].column).toBe(0)
    expect(doc.lines[name].column).toBe(1)
    // The whole sidebar comes before the main column, so a section never mixes the two.
    expect(Math.max(skills, languages)).toBeLessThan(Math.min(name, experience))
    expect(doc.lines[at('Swedish')].column).toBe(0)
  })

  it('reads every page of a multi-page PDF', async () => {
    const doc = await readPdf(fixture('template-minimal.pdf'))
    expect(doc.pageCount).toBe(2)
    expect(new Set(doc.lines.map((l) => l.page))).toEqual(new Set([1, 2]))
  })

  it('reports a PDF with no text as a scan', async () => {
    await expect(readPdf(fixture('scanned.pdf'))).rejects.toMatchObject({ status: 422, code: 'SCANNED_PDF' })
  })

  it('rejects PDFs over the page limit', async () => {
    await expect(readPdf(fixture('too-long.pdf'))).rejects.toMatchObject({ status: 422, code: 'TOO_MANY_PAGES' })
  })

  it('reports broken files as unreadable', async () => {
    await expect(readPdf(Buffer.from('%PDF-1.7\nthis is not really a pdf'))).rejects.toMatchObject({
      code: 'UNREADABLE',
    })
  })

  it('does not alter the buffer it was given', async () => {
    const buffer = fixture('template-classic.pdf')
    const copy = Buffer.from(buffer)
    await readPdf(buffer)
    expect(buffer.equals(copy)).toBe(true)
  })
})

describe('mapPdfError', () => {
  it('maps password errors, keeps import errors, and hides everything else', () => {
    expect(mapPdfError({ name: 'PasswordException' })).toMatchObject({ status: 422, code: 'ENCRYPTED' })
    const own = new ImportError(422, 'TOO_MANY_PAGES', 'x')
    expect(mapPdfError(own)).toBe(own)
    expect(mapPdfError(new Error('secret internal detail'))).toMatchObject({ code: 'UNREADABLE' })
  })
})

describe('readDocx', () => {
  it('keeps heading, list and bold information and joins tabbed cells', async () => {
    const doc = await readDocx(fixture('person-a.docx'))
    expect(doc.kind).toBe('docx')
    const line = (text) => doc.lines.find((l) => l.text === text)
    expect(line('Experience')).toMatchObject({ heading: true })
    expect(line('Senior Backend Engineer\tMar 2021 – Present')).toMatchObject({ bold: true, heading: false })
    expect(line('Kestrel Payments\tLondon')).toMatchObject({ bold: false })
    const bullet = line('Led a team of four engineers and introduced weekly incident reviews')
    expect(bullet).toMatchObject({ listItem: true })
    expect(doc.lines[0]).toMatchObject({ text: 'Daniel Okafor', bold: true })
  })

  it('reads documents without heading styles', async () => {
    const doc = await readDocx(fixture('person-b.docx'))
    expect(doc.lines.find((l) => l.text === 'WORK EXPERIENCE')).toMatchObject({ bold: true, heading: false })
    expect(doc.lines.map((l) => l.text)).toContain('• Built weekly sales dashboards used by 40 store managers')
  })

  it('rejects files that are not Word documents', async () => {
    await expect(readDocx(Buffer.from('PK\x03\x04 definitely not a docx'))).rejects.toMatchObject({
      code: 'UNREADABLE',
    })
  })
})

// A zip whose central directory declares a huge uncompressed size, like a zip bomb.
function zipDeclaring(bytes) {
  const name = Buffer.from('word/document.xml')
  const entry = Buffer.alloc(46 + name.length)
  entry.writeUInt32LE(0x02014b50, 0)
  entry.writeUInt32LE(bytes, 24)
  entry.writeUInt16LE(name.length, 28)
  name.copy(entry, 46)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(entry.length, 12)
  return Buffer.concat([entry, end])
}

describe('zip safety', () => {
  it('reads declared sizes from a real docx', () => {
    const sizes = zipSizes(fixture('person-a.docx'))
    expect(sizes.entries).toBeGreaterThan(3)
    expect(isSafeZip(fixture('person-a.docx'))).toBe(true)
  })

  it('refuses archives that declare a huge size, without unpacking them', async () => {
    const bomb = zipDeclaring(500 * 1024 * 1024)
    expect(isSafeZip(bomb)).toBe(false)
    await expect(readDocx(bomb)).rejects.toMatchObject({ code: 'UNREADABLE' })
  })

  it('refuses malformed archives', () => {
    expect(zipSizes(Buffer.from('PK\x03\x04 no directory here'))).toBeNull()
    expect(isSafeZip(Buffer.alloc(10))).toBe(false)
  })
})
