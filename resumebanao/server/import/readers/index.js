import { readDocx } from './docx.js'
import { readPdf } from './pdf.js'

/** @returns {Promise<import('../types.js').ParsedDocument>} */
export function readDocument(buffer, kind, ctx) {
  return kind === 'pdf' ? readPdf(buffer, ctx) : readDocx(buffer, ctx)
}
