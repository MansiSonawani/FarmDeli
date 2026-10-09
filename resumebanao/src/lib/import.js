import { apiUpload } from './api'

// Resume import: uploads a PDF or Word file; the server returns resume data to save as a new resume.

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024
export const IMPORT_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Quick checks so obvious mistakes fail without an upload; the server checks the real contents again.
export function checkImportFile(file) {
  if (!/\.(pdf|docx)$/i.test(file.name)) return "That file isn't a PDF or Word (.docx) document."
  if (file.size > IMPORT_MAX_BYTES) return 'That file is over 5 MB.'
  if (file.size === 0) return 'That file is empty.'
  return null
}

export const fileTitle = (file) =>
  file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim() || 'Imported resume'

// Resolves to { data, warnings, extractor }; rejects with an Error whose message is safe to show.
export const importResumeFile = (file) => apiUpload('/import', file)
