// TODO(T5, T6): temporary stand-in until the real PDF and DOCX readers exist. It does not look at the
// file's contents; it returns one line made from the file name so the pipeline can run end to end.
export function placeholderDocument(kind, fileName = '') {
  const text = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  return {
    kind,
    pageCount: 1,
    lines: text ? [{ text, page: 1, bold: false }] : [],
    text,
  }
}
