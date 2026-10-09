// Errors the import pipeline raises on purpose. `message` is shown to the user as-is,
// `code` lets the client react (see the table in changes/0001-resume-import/plan.md).
export class ImportError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const MAX_BYTES = 5 * 1024 * 1024
export const MAX_PAGES = 4
export const MAX_IMPORTS_PER_DAY = 5
