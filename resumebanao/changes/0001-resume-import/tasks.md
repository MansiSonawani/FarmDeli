# 0001 – Resume import: tasks

Design and contracts: [plan.md](plan.md). Tick a box when a task is merged and add the commit hash after it, e.g. `- [x] T3 … (abc1234)`.

**Order:** M1 (T1–T4) first, so the whole flow works end to end with a stub extractor. Then M2, then M3 + M4 while watching the scores from M5 (T13–T14 can start alongside M3). Estimated total: ~3–3.5 days.

## M1 – End-to-end skeleton (~0.5 day) ✅ done

- [x] **T1 Contracts** (9e447b4) – `server/import/types.js`
  - JSDoc typedefs for `Line`, `ParsedDocument`, `ImportResult`, `Warning`, `Extractor` exactly as in plan.md.
  - _Done when:_ later modules import only these shapes.

- [x] **T2 Extractor registry** (9e447b4) – `server/import/extractors/index.js`
  - `getExtractor(name)`, parse `IMPORT_EXTRACTOR` (plain name or `tier:name,...` map), `extractorFor(user)` (no tiers yet → default), fallback to `rules` with a `EXTRACTOR_FALLBACK` warning when the chosen one throws.
  - Start with a stub extractor that returns only the first line as the name.
  - _Done when:_ changing the env var swaps the extractor with no code change (unit test).

- [x] **T3 Upload endpoint** (9e447b4) – `server/app.js`, `server/import/index.js`, `server/import/limits.js`
  - `POST /api/import`: `requireUser`, header `X-Requested-With: resumebanao` (replaces the JSON-only CSRF rule for this route), skip the global 2 MB `bodyLimit`, own 5 MB limit, `c.req.parseBody()` for the `file` field.
  - Sniff type by magic bytes: PDF starts with `%PDF-`; DOCX is a zip (`PK\x03\x04`) containing `word/document.xml`.
  - Per-user limiter: 5 per 24 h (`server/rate-limit.js`).
  - Error responses `{ error, code }` per the table in plan.md.
  - _Done when:_ API tests cover 200, 400, 401, 403 (missing header), 413, 415 (not multipart), 429. _(A missing header is 403, not 415: see plan.md "Changed during implementation".)_

- [x] **T4 Dashboard import flow** (9e447b4) – `src/pages/Dashboard.jsx`, `src/lib/api.js`, `src/pages/Editor.jsx`
  - "Upload existing resume" option in the New resume dialog: file picker + drag-and-drop, accepts `.pdf,.docx`, loading state, friendly messages for each error `code`.
  - `api()` needs a multipart variant (no JSON body, sends the custom header).
  - On success: `createResume({ title: <file name without extension>, data })`, navigate to the editor with router state `{ imported: { fileName, warnings } }`; editor shows a dismissable banner ("Imported from X – please review", warnings listed).
  - Hidden when `isLocalMode`.
  - _Implemented in:_ `src/pages/Dashboard.jsx` (CreateForm, FileDrop), `src/lib/import.js`, `src/lib/api.js` (`apiUpload`), `src/components/editor/ImportBanner.jsx`.
  - _Done when:_ uploading a file opens a new resume in the editor (verified in the browser).

> **State after M1:** the pipeline runs end to end, but reading and extraction are placeholders. `readers/placeholder.js` returns one line made from the file name and the stub `rules` extractor puts it in the name field with a `STUB_EXTRACTOR` warning. T5/T6 replace the placeholder reader (delete `placeholder.js`), T7–T11 replace the stub. **Do not deploy to production before M3**, or users would get empty resumes.

## M2 – Readers (~0.5 day)

- [ ] **T5 PDF reader** – `server/import/readers/pdf.js` (dependency: `pdfjs-dist`, legacy build for Node)
  - `getTextContent()` per page → items with `transform` (x, y, font size) and `fontName` (bold if `/bold|black|heavy|semibold/i`).
  - Group items into lines by y (tolerance ≈ 0.5 × font size), sort by x within a line, insert spaces by gap.
  - Column detection: if most lines on a page cluster into two x-ranges with a clear gutter, emit the left column, then the right.
  - Errors: no text items on any page → `SCANNED_PDF`; password → `ENCRYPTED`; pages > 4 → `TOO_MANY_PAGES`.
  - _Done when:_ tests on fixture PDFs produce ordered lines with fonts (1- and 2-column).

- [ ] **T6 DOCX reader** – `server/import/readers/docx.js` (dependencies: `mammoth`, `htmlparser2`)
  - `mammoth.convertToHtml` → walk the HTML: each `p`/`h1–h6`/`li` becomes a `Line` with `bold` (all text in `strong`/`b`), `heading`, `listItem`.
  - _Done when:_ tests on fixture DOCX files produce lines with heading/bold/list flags.

## M3 – Rules extractor (~1.5 days)

- [ ] **T7 Contact details** – `server/import/extractors/rules/contact.js`
  - Name: largest-font line in the top third of page 1 that is not an email/phone/URL (DOCX: first heading or first line).
  - Job title: next non-contact line under the name, if short.
  - Regexes: email, phone (international formats), LinkedIn URL, other URL → website; location: `City, Country`-like short line in the header block.
  - _Done when:_ unit tests pass for varied header layouts.

- [ ] **T8 Section splitting** – `server/import/extractors/rules/sections.js`
  - Dictionary of heading synonyms → section type (e.g. experience: "experience", "work experience", "professional experience", "employment history", "work history", "career history"; summary: "summary", "profile", "about me", "professional summary", "objective"; …).
  - Heading signals: dictionary match on a short line, plus bold / ALL CAPS / larger than body font / DOCX heading.
  - Unrecognised headings with strong signals → `custom` section titled with the heading text.
  - _Done when:_ unit tests classify headings, including case and punctuation variants.

- [ ] **T9 Dates** – `server/import/extractors/rules/dates.js`
  - Parse ranges: `Jan 2020 – Present`, `January 2020 - Mar 2022`, `01/2020 – 03/2022`, `2019–2021`, `2019 - now`, `Mar. 2021 to current`, single dates.
  - Output `{ startDate, endDate, current }` in stored format (`YYYY` / `YYYY-MM`, `src/lib/format.js`).
  - _Done when:_ table-driven unit tests pass.

- [ ] **T10 Dated entries** – `server/import/extractors/rules/entries.js`
  - New entry starts at a line containing a date range or at a bold short line followed by one.
  - Title/organisation: patterns "Title at Company", "Company | Title", "Title, Company", "Title — Company", or two consecutive lines (bold line = title).
  - Location: short `City, Country` / "Remote" near the date.
  - Remaining lines → description; bullet glyphs (`•▪◦‣-*–` and numbers) start new bullets, wrapped lines join the previous bullet.
  - _Done when:_ unit tests pass on extracted line sets from the fixtures.

- [ ] **T11 Tags and summary** – `server/import/extractors/rules/tags.js`, `rules/index.js`
  - Split on commas, pipes, bullets, semicolons; "Label: a, b, c" lines → tags `a`, `b`, `c` (label dropped).
  - Language levels: native/mother tongue → 4, fluent/proficient/C1/C2 → 3, conversational/intermediate/B1/B2 → 2, basic/beginner/A1/A2 → 1.
  - Summary section text → one paragraph (or bullets if the source had them).
  - `rules/index.js` wires T7–T11 into an `Extractor` named `rules`; replace the stub from T2.
  - _Done when:_ the rules extractor returns full `ImportResult`s for all fixtures.

## M4 – Shared post-processing (~0.5 day)

- [ ] **T12a Shared rich text helper** – `src/lib/richtext-html.js`
  - Server-side imports of `src/` files must use explicit `.js` extensions (plain Node cannot resolve `./id`); `server/import/node-resolution.test.js` guards this, so extend it to cover the new file.
  - Move `legacyToHtml` and HTML escaping out of `src/lib/richtext.js` (which imports DOMPurify, browser-only) so the server can use it; `richtext.js` re-exports it. Existing tests keep passing.

- [ ] **T12b Normalize** – `server/import/normalize.js`
  - Build sections with `newSection` / `newEntry` / `newTag`; section order and `column` from `SECTION_TYPES`; at most one section per non-custom type (merge duplicates).
  - Descriptions: bullets → HTML via `legacyToHtml`-style conversion.
  - Trim whitespace; cap lengths (title 200, description 5,000, 50 entries per section, 100 tags).
  - Raise `NO_CONTENT` (422) when nothing usable remains (no name and no sections with content).
  - _Done when:_ output passes the same validation as resumes created in the editor.

- [ ] **T12c Verify** – `server/import/verify.js`
  - Every extracted name, email, phone, organisation and date must appear (case- and whitespace-insensitive) in `ParsedDocument.text`; otherwise drop it and add a `NOT_IN_SOURCE` warning.
  - _Done when:_ unit test with an injected fake value drops it.

## M5 – Accuracy measurement (~0.5 day, alongside M3)

- [ ] **T13 Fixtures** – `server/import/__fixtures__/`
  - Print `sampleResume()` with each of the 6 templates to PDF (browser "Save as PDF" from the running app), save as `template-<name>.pdf` with one shared `sample.expected.json`.
  - 3–4 hand-made DOCX resumes (synthetic people) with their own `*.expected.json`.
  - One image-only PDF (expect `SCANNED_PDF`).
  - Never commit real people's resumes.

- [ ] **T14 Scoring test** – `server/import/score.test.js`
  - Field-level comparison (personal fields; per section: entry count, title, subtitle, dates, bullet count; tag names) → precision/recall per fixture; prints a table.
  - Baseline thresholds stored in `server/import/__fixtures__/baseline.json`; test fails on regression. Raise the baseline when rules improve.

- [ ] **T15 Unit and API tests** – contact regexes, dates, heading classification, readers, endpoint (from T3).

## M6 – Release (~0.25 day)

- [ ] **T16 Ship**
  - README: feature bullet + `IMPORT_EXTRACTOR`; set `IMPORT_EXTRACTOR=rules` on Railway (optional; it is the default).
  - Logging: extractor, duration, pages, warning count only.
  - Deploy (`railway up --service web` from `resumebanao/`) and test with a fixture PDF and DOCX on the live site.
  - Mark this change `Done` in `changes/README.md` and plan.md.

## Later – Premium AI extractor (~1 day, separate change)

- [ ] **T17** `server/import/extractors/ai.js` implementing `Extractor`; `plan` column on `users`; `IMPORT_EXTRACTOR=free:rules,premium:ai`; compare scores with T14 before switching. Open a new change folder (`0002-…`) when this starts.
