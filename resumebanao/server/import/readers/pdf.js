import { placeholderDocument } from './placeholder.js'

// TODO(T5): replace with a pdfjs-dist based reader.
/** @returns {Promise<import('../types.js').ParsedDocument>} */
export async function readPdf(_buffer, { fileName } = {}) {
  return placeholderDocument('pdf', fileName)
}
