import { runExtractor } from './extractors/index.js'
import { readDocument } from './readers/index.js'

// The import pipeline: file bytes -> ParsedDocument -> extractor -> ImportResult.
// TODO(T12): normalize and verify steps run between extraction and the response.
// Files are processed in memory only; nothing is written to disk or the database.
/** @returns {Promise<import('./types.js').ImportResult>} */
export async function importResume(buffer, { kind, user, config }) {
  const doc = await readDocument(buffer, kind)
  return runExtractor(doc, { user, config })
}
