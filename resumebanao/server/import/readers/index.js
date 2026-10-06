import { readDocx } from './docx.js'
import { readPdf } from './pdf.js'

/** @returns {Promise<import('../types.js').ParsedDocument>} */
export function readDocument(buffer, kind) {
  return kind === 'pdf' ? readPdf(buffer) : readDocx(buffer)
}
