import { placeholderDocument } from './placeholder.js'

// TODO(T6): replace with a mammoth based reader.
/** @returns {Promise<import('../types.js').ParsedDocument>} */
export async function readDocx(_buffer, { fileName } = {}) {
  return placeholderDocument('docx', fileName)
}
