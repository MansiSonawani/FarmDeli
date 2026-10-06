import { ImportError, MAX_BYTES } from './errors.js'

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])

// Decides the file type from its bytes, never from its name or the browser-reported MIME type.
// PDFs start with "%PDF-" (readers tolerate a little junk before it); DOCX files are zip
// archives that contain "word/document.xml" (file names are stored uncompressed in the zip).
export function sniffKind(buffer) {
  if (buffer.subarray(0, 4).equals(ZIP_MAGIC)) return buffer.includes('word/document.xml') ? 'docx' : null
  return buffer.subarray(0, 1024).includes('%PDF-') ? 'pdf' : null
}

// Throws an ImportError for empty, oversized or unsupported files; otherwise returns 'pdf' | 'docx'.
export function inspectUpload(buffer) {
  if (buffer.length === 0) throw new ImportError(400, 'UNSUPPORTED_TYPE', 'That file is empty.')
  if (buffer.length > MAX_BYTES) throw new ImportError(413, 'FILE_TOO_LARGE', 'That file is over 5 MB.')
  const kind = sniffKind(buffer)
  if (!kind) throw new ImportError(400, 'UNSUPPORTED_TYPE', "That file isn't a PDF or Word (.docx) document.")
  return kind
}
