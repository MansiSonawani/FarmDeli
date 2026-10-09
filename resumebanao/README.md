# resumebanao (MVP)

A resume builder in the style of FlowCV, built with **React + Vite + Tailwind CSS**, a small **Node (Hono) API** and **Postgres**, deployed on **Railway**.

## Features

- **Live editor**: form on the left, real page-by-page A4/Letter preview on the right
- **Rich text descriptions**: bold, italic, underline, bullet lists, links and text alignment (Tiptap). Stored as HTML and sanitized with DOMPurify before rendering, so shared resumes cannot run scripts. Older plain-text descriptions are converted automatically.
- **Sections**: profile, experience, education, projects, skills, languages, certificates, awards, volunteering, interests and custom sections. Sections and entries can be reordered by drag and drop and hidden individually; sections can be renamed in place or moved between the main column and the sidebar.
- **6 templates** (Classic, Modern, Minimal, Executive, Bold, Compact). Each template is a preset of the layout engine, so you can adjust any of:
  - layout: one column, or a sidebar on the left or right
  - colors and fonts
  - font size, line height and spacing
  - heading style and header alignment
  - photo, contact icons and date format
  - skill display style
  - page size
- **Real pagination**: content is measured and split into pages without breaking entries apart, so the preview is exactly what gets printed.
- **PDF download** through the browser's print dialog ("Save as PDF"). This produces a vector PDF with selectable text and clickable links, which applicant tracking systems can read.
- **Public share link** at `/r/<slug>`, which anyone can view and download.
- **Resume import**: upload a PDF or Word file and the details are filled into a new resume (see below).
- **Accounts** with email + password (httpOnly session cookies, scrypt password hashes). Every resume query is scoped to its owner on the server.
- **AI writing help** (server only for now): `POST /api/ai` rewrites text with the Claude API. The editor buttons are switched off until the AI output is converted to the rich text format.
- **Job tracker** (`/app/jobs`, see [changes/0002-job-tracker](changes/0002-job-tracker/plan.md)):
  - A board with Wishlist, Applied, Interviewing, Offer and Rejected columns. Cards move between columns by dragging or with the keyboard (Space to pick up, arrow keys to move, Space to drop).
  - A list view, search, quick filters (remote, referrals, starred), a pipeline overview and a "Next up" list of upcoming steps.
  - Each job has a detail panel with a stage bar, a next step that can be added to your calendar (`.ics` file), an automatic timeline, contacts, notes, and the job link (which can be added later).
  - The resume you sent is saved as a copy, so later edits to the resume don't change it.
  - On phones it switches to a list with stage filters.
- **Autosave**, a dashboard (create, duplicate, rename, delete), and a mobile layout with an edit/preview toggle.
- **Demo mode**: with `VITE_DEMO_MODE=true` the app runs fully in the browser, with data saved in `localStorage`.

## Quick start

```bash
cd resumebanao
npm install
cp .env.example .env # VITE_DEMO_MODE=true
npm run dev          # http://localhost:5173 – demo mode, no backend needed
npm test             # unit tests + API tests (in-memory Postgres)
npm run build        # production build in dist/
```

To run against the real API locally, set `VITE_DEMO_MODE=false` in `.env` and start the server in a second terminal:

```bash
npm run dev:server   # http://localhost:3000; Vite proxies /api to it
```

Without `DATABASE_URL` the server uses [PGlite](https://pglite.dev) (Postgres in-process), so nothing needs installing, but data resets when it restarts.

## Deploy on Railway

One Railway service runs `npm start`, which serves both the built site (`dist/`) and `/api`, so cookies stay first-party. The database tables are created automatically when the server starts.

1. Create a project with a **Postgres** database and a service for this repository (root directory `resumebanao`).
2. On the app service, set these variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ANTHROPIC_API_KEY=sk-ant-...   # optional, enables the AI buttons
   ```
3. Generate a domain under **Settings → Networking**.

With the CLI, from `resumebanao/`:

```bash
railway add --database postgres
railway variables --service web --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
railway up --service web
```

## Resume import

In the New resume dialog, "Import an existing resume" takes a PDF or Word (.docx) file (up to 5 MB and 4 pages), reads it on the server, and opens a new resume with the details filled in. Because templates are only style presets over the same data, an imported resume works with every template. Files are processed in memory and never stored; one log line per import records the type, extractor, pages, time and warning count, never the content.

- **Extractors are swappable.** `IMPORT_EXTRACTOR` (default `rules`) names the extractor; `free:rules,premium:ai` will pick by plan once plans exist. If the chosen one fails, `rules` runs instead with a warning. A new extractor implements the contract in `server/import/types.js` and registers in `server/import/extractors/index.js`; the shared normalize and verify stages then apply to it automatically.
- **The `rules` extractor** uses no external service. It finds sections by name and by the document's own heading style, entries by their dates, and reads layout (columns, indentation, wrapped lines) from PDFs. It copes with one- and two-column layouts, timelines and typical Word files. It cannot read scanned PDFs (no text layer) or text boxes, headers and footers in Word files, and it will misread unusual designs; the editor tells users to review every import.
- **Measuring accuracy.** `npm run import:score` imports every fixture in `server/import/__fixtures__/` and prints the per-field score (`-- --verbose` lists every mismatch); `npm test` fails if a fixture drops below `baseline.json`. `npm run import:fixtures` regenerates the fixtures (it needs Edge or Chrome and `VITE_DEMO_MODE=false npm run build` first). The fixtures are made-up people and were written while the rules were being built, so a score of 100% means the rules handle those layouts, not that real resumes will import perfectly. Add a fixture whenever a real layout fails.

Design notes and the task list: [`changes/0001-resume-import/`](changes/0001-resume-import/plan.md).

## How it works

| Piece                                            | Where                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Resume data model, section types, sample content | `src/lib/defaults.js`                                              |
| Templates (style presets), fonts, colors         | `src/lib/templates.js`                                             |
| Data → blocks per column                         | `src/components/resume/blocks.jsx`                                 |
| Measure blocks → pack into pages → render        | `src/components/resume/PaginatedResume.jsx`, `src/lib/paginate.js` |
| Resume CSS (shared by preview and print)         | `src/components/resume/resume.css`                                 |
| API / localStorage data access                   | `src/lib/store.js`, `src/lib/api.js`                               |
| Editor UI                                        | `src/pages/Editor.jsx`, `src/components/editor/*`                  |
| API routes, auth, static file serving            | `server/app.js`, `server/auth.js`                                  |
| Database schema                                  | `server/schema.sql`                                                |
| Resume import (readers, extractors, clean-up)    | `server/import/`                                                   |
| AI writing help                                  | `server/ai.js`                                                     |

A resume is stored as one row: `data` (content JSON) and `style` (settings JSON). Profile photos are resized in the browser and stored inside `data` as a small JPEG, so no storage bucket is needed.

## Feature plans

Larger features are planned in [`changes/`](changes/README.md): one folder per change with a `plan.md` (design and decisions) and a `tasks.md` (checklist). Read the relevant folder before working on a feature.

## Not in the MVP yet

- Password reset and email sign-in links (needs an email provider such as Resend)
- Payments and plan limits (Stripe)
- Cover letters, which can reuse the same rendering engine
- Server-side PDF generation (headless Chromium) for a one-click download without the print dialog
- Importing an existing resume (PDF → structured data with an LLM)
- Job tracker, next version: auto-fill from a job link, tailoring a resume to a job description with AI, email reminders
- A personal website with a custom domain, an email signature generator
- Translated interface, undo/redo, version history
- Splitting a single very long entry across two pages (today an entry always stays on one page)
