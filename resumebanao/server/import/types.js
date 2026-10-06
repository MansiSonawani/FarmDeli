// Contracts for resume import. See changes/0001-resume-import/plan.md.
// Every reader produces a ParsedDocument; every extractor consumes one and returns an ImportResult.

/**
 * One visual line of text. For PDFs, x/y/width/fontSize are in points, y measured from the top of the page.
 * DOCX lines carry no positions; they have `heading` / `listItem` flags instead.
 * @typedef {object} Line
 * @property {string} text
 * @property {number} page 1-based page number
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [width]
 * @property {number} [fontSize]
 * @property {boolean} bold
 * @property {boolean} [heading] DOCX only: the paragraph uses a heading style
 * @property {boolean} [listItem] DOCX only: the paragraph is a list item
 */

/**
 * @typedef {object} ParsedDocument
 * @property {'pdf' | 'docx'} kind
 * @property {number} pageCount
 * @property {Line[]} lines in reading order
 * @property {string} text all line text joined with newlines
 * @property {1 | 2} [columns] detected column count (PDF only)
 */

/**
 * @typedef {object} Warning
 * @property {string} code machine-readable, e.g. 'NOT_IN_SOURCE'
 * @property {string} message shown to the user
 * @property {string} [field]
 */

/**
 * `data` has the same shape as `resume.data` in src/lib/defaults.js: { personal, sections }.
 * @typedef {object} ImportResult
 * @property {{ personal: object, sections: object[] }} data
 * @property {Warning[]} warnings
 * @property {string} extractor name of the extractor that produced the data, e.g. 'rules'
 */

/**
 * @typedef {object} Extractor
 * @property {string} name
 * @property {(doc: ParsedDocument, ctx: { user?: { id: string, plan?: string } }) => Promise<ImportResult>} extract
 */

export {}
