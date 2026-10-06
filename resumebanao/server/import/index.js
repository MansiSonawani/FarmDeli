import { runExtractor } from './extractors/index.js'
import { normalize } from './normalize.js'
import { readDocument } from './readers/index.js'
import { verify } from './verify.js'

// The import pipeline: file bytes -> ParsedDocument -> extractor -> normalize -> verify -> ImportResult.
// Normalize and verify are the same for every extractor, so a new one (for example an AI extractor) only has
// to turn a ParsedDocument into rough data. Files are processed in memory only; nothing is written to disk or
// the database.
//
// One line is logged per import with what happened, never what the resume said: no names, no text, no file name.
const defaultLog = (entry) => {
  if (process.env.NODE_ENV !== 'test') console.log(JSON.stringify({ event: 'import', ...entry }))
}

/** @returns {Promise<import('./types.js').ImportResult>} */
export async function importResume(buffer, { kind, user, config, log = defaultLog }) {
  const started = Date.now()
  const doc = await readDocument(buffer, kind)
  const extracted = await runExtractor(doc, { user, config })
  const result = verify(normalize(extracted), doc)
  log({
    kind,
    extractor: result.extractor,
    pages: doc.pageCount,
    ms: Date.now() - started,
    warnings: result.warnings.length,
  })
  return result
}
