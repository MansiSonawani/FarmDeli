# 0001 – Resume import (upload an existing resume, pre-fill the editor)

**Status:** In progress (M1 done) · **Created:** 2026-10-06 · **Tasks:** [tasks.md](tasks.md)

## Summary

Users upload an existing resume (PDF or Word). The server reads it, extracts the details into resumebanao's resume data format and returns them; the browser creates a new resume from that data and opens it in the editor with a "please review" banner. Because templates are only style presets over the same data (`src/lib/templates.js`), an imported resume works with every template automatically.

Extraction is done by a **swappable extractor**. The first one is rule-based (free, no external services). An AI extractor for a future premium tier will implement the same interface and can replace or sit beside the rules one through configuration, without code changes elsewhere.

## Goals

- Upload PDF and DOCX, up to 5 MB and 4 pages.
- Pre-fill personal details and the common sections: profile, experience, education, projects, certificates, awards, volunteering, skills, languages, interests; unknown headings become custom sections.
- Extractors are hot-swappable via configuration, with a per-user hook for tiers.
- Accuracy is measured with a fixture set and a scoring test, so extractors can be compared objectively.
- The uploaded file is processed in memory and never stored.

## Non-goals (for this change)

- The AI extractor itself (premium tier, later; see "Future").
- OCR for scanned PDFs: detected and reported as unreadable instead.
- Import in demo mode (`VITE_DEMO_MODE=true`): needs the server, so the button is hidden there.
- Merging an import into an existing resume: an import always creates a new resume.

## Decisions

| Decision                    | Choice                                                                | Why                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First extractor             | Rule-based                                                            | Free; no data leaves our server. AI comes later for premium.                                                                                                                     |
| Formats                     | PDF and DOCX                                                          | DOCX is easier for rules (reading order is reliable).                                                                                                                            |
| Where extraction runs       | Server (`POST /api/import`)                                           | One place to choose the extractor; tier gating must be server-side anyway; the AI key can only live on the server.                                                               |
| How the extractor is chosen | `IMPORT_EXTRACTOR` env var, resolved per user by `extractorFor(user)` | Swap with a Railway variable change. Later: `free:rules,premium:ai`.                                                                                                             |
| Endpoint saves?             | No, it returns data; the client calls the existing `createResume`     | Keeps a single save path (`src/lib/store.js`) and lets the client pick the template.                                                                                             |
| Shared post-processing      | All extractors go through the same normalize + verify steps           | Dates, rich text, IDs, limits and "does this value appear in the file?" checks are written once; the AI extractor gets them for free.                                            |
| CSRF for the upload         | Require header `X-Requested-With: resumebanao` on this route          | The API normally rejects non-JSON writes (`server/app.js`), and multipart is not JSON. A custom header cannot be sent cross-site without a CORS preflight, which we never allow. |

## Architecture

```
Browser                                Server (server/import/)
───────                                ──────────────────────────────────────────────────────────
Dashboard "Upload resume"  ──file──▶  POST /api/import
                                         ├─ validate: auth, size, magic bytes, daily limit
                                         ├─ read:      readers/pdf.js | readers/docx.js ──▶ ParsedDocument
                                         ├─ extract:   extractors/index.js picks one   ──▶ ImportResult
                                         │               rules/ (now) · ai.js (later)
                                         ├─ normalize: normalize.js (dates, rich text, ids, limits)
                                         └─ verify:    verify.js (values must appear in the file)
createResume({ data }) ◀──JSON─────────  { data, warnings, extractor }
open editor + "Imported, please review" banner
```

### Planned file layout

```
server/import/
  index.js              # importResume(buffer, { user }) – the pipeline above
  types.js              # JSDoc typedefs for the contracts below
  limits.js             # MAX_BYTES, MAX_PAGES, file type sniffing
  readers/
    pdf.js              # pdfjs-dist → ParsedDocument (lines, fonts, columns)
    docx.js             # mammoth → HTML → ParsedDocument
  extractors/
    index.js            # registry, IMPORT_EXTRACTOR parsing, extractorFor(user), fallback
    rules/
      index.js          # rules extractor: orchestrates the steps below
      contact.js        # name, job title, email, phone, links, location
      sections.js       # heading detection + section type dictionary
      dates.js          # date range parsing
      entries.js        # dated entries: title/subtitle/location/bullets
      tags.js           # skills, languages, interests
  normalize.js
  verify.js
  __fixtures__/         # synthetic resumes (PDF/DOCX) + *.expected.json
  *.test.js
src/lib/richtext-html.js  # legacyToHtml + escaping, shared by browser and server
```

## Contracts

```js
/** One visual line of text. Positions are in PDF points from the top-left; DOCX lines have no positions. */
// Line = { text, page, x?, y?, width?, fontSize?, bold, heading?, listItem? }

/** What every reader produces. */
// ParsedDocument = { kind: 'pdf' | 'docx', pageCount, lines: Line[], text: string, columns?: 1 | 2 }

/** What every extractor returns (before normalize/verify). */
// ImportResult = {
//   data: { personal: {...}, sections: Section[] },   // same shape as resume.data (src/lib/defaults.js)
//   warnings: Warning[],
//   extractor: string,                                  // e.g. 'rules'
// }
// Warning = { code: string, message: string, field?: string }

/** An extractor. */
// Extractor = { name: string, extract(doc: ParsedDocument, ctx: { user }): Promise<ImportResult> }
```

Section and entry objects use the existing factories (`newSection`, `newEntry`, `newTag` in `src/lib/defaults.js`) so IDs and defaults match resumes created in the editor. Descriptions are HTML (see `src/lib/richtext.js`).

## API

`POST /api/import` (signed-in users only)

- Body: `multipart/form-data` with one field, `file`.
- Required header: `X-Requested-With: resumebanao`.
- `200` → `{ data, warnings, extractor }`
- Errors: `{ error, code }` with

| Status | `code`             | When                                             |
| ------ | ------------------ | ------------------------------------------------ |
| 400    | `UNSUPPORTED_TYPE` | Not a PDF or DOCX (by content, not by extension) |
| 401    | –                  | Not signed in                                    |
| 413    | `FILE_TOO_LARGE`   | Over 5 MB                                        |
| 422    | `TOO_MANY_PAGES`   | Over 4 pages                                     |
| 422    | `SCANNED_PDF`      | PDF has no text layer                            |
| 422    | `ENCRYPTED`        | Password-protected file                          |
| 422    | `NO_CONTENT`       | Nothing usable was extracted                     |
| 429    | `RATE_LIMITED`     | More than 5 imports per user per day             |

The global 2 MB `bodyLimit` in `server/app.js` must skip this route, which gets its own 5 MB limit.

## Configuration

| Variable           | Default | Meaning                                                                                             |
| ------------------ | ------- | --------------------------------------------------------------------------------------------------- |
| `IMPORT_EXTRACTOR` | `rules` | Extractor name, or a tier map such as `free:rules,premium:ai` (tiers arrive with the premium plan). |

If the chosen extractor throws, the pipeline falls back to `rules` and adds a warning.

## Expected accuracy (rules extractor)

Estimates, to be replaced by real numbers from the scoring test:

| Part                                     | Simple 1-column PDF / DOCX | 2-column / designed PDF | Scanned PDF  |
| ---------------------------------------- | -------------------------- | ----------------------- | ------------ |
| Name, email, phone, links                | ~95%                       | ~85%                    | ✗ (reported) |
| Section split                            | ~85–90%                    | ~60%                    | ✗            |
| Entries (title, company, dates, bullets) | ~70%                       | poor                    | ✗            |
| Skills / languages                       | ~80%                       | ~60%                    | ✗            |

The editor banner tells users to review the import; this is part of the feature, not an afterthought.

## Evaluation

- Fixtures are synthetic people only (never real resumes). Main source: the example resume (`sampleResume()` in `src/lib/defaults.js`) printed to PDF in all six templates, so the expected answer is known exactly; plus 3–4 hand-made DOCX files and one scanned (image-only) PDF.
- A scoring test compares any extractor's output with `*.expected.json` field by field, prints a per-fixture table, and fails if the score drops below the recorded baseline. The same test decides when the AI extractor is good enough to switch to.

## Privacy and limits

- Files are read from the request into memory and dropped after the response; nothing is written to disk or the database.
- Logs record extractor name, duration, page count and warning count only, never resume content.
- 5 imports per user per day (in-memory limiter for now; moves to the database with the premium plan).

## Future: premium AI extractor

- `server/import/extractors/ai.js` implements `Extractor`; for best accuracy it sends the original PDF (not just text) to the model and requests output matching the resume data schema (structured outputs). DOCX goes through `readers/docx.js` text.
- Add `plan` to `users`; `extractorFor(user)` maps the plan through `IMPORT_EXTRACTOR`.
- `verify.js` matters most here: it drops values the model invented.
- Switch only after the scoring test shows the gain.

## Changed during implementation

- **M1:** a missing `X-Requested-With` header returns **403** (not 415); a non-multipart body returns 415. A request with no file field returns 400 `NO_FILE` (added to the error table).
- **M1:** the daily limit counts files that passed the type and size checks. Files rejected for type or size do not count; files that fail later (for example a scanned PDF) do.
- **M1:** the server runs on plain Node, so any `src/` file it imports needs explicit `.js` extensions in its own imports (Vite and Vitest do not require this, which hid the problem in tests). `server/import/node-resolution.test.js` loads the shared file under Node to guard this.
- **M1:** until M2 and M3 land, `readers/pdf.js` and `readers/docx.js` delegate to `readers/placeholder.js` and the `rules` extractor is a stub (both marked with TODO comments).

## Risks and open questions

- Two-column PDFs: column detection may interleave text; measured by the template fixtures.
- Unusual date formats and non-English headings: extend `dates.js` / the heading dictionary as fixtures reveal gaps.
- pdfjs-dist in Node: use the legacy build; confirm it runs in Railway's container.
- Should a failed or empty import still create a resume? Current answer: no, show the error and let the user start blank.
