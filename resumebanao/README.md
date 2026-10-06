# resumebanao (MVP)

A resume builder in the style of FlowCV, built with **React + Vite + Tailwind CSS**, a small **Node (Hono) API** and **Postgres**, deployed on **Railway**.

## Features

- **Live editor**: form on the left, real page-by-page A4/Letter preview on the right
- **Sections**: profile, experience, education, projects, skills, languages, certificates, awards, volunteering, interests and custom sections. Sections and entries can be reordered by drag and drop, hidden, or moved between the main column and the sidebar.
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
- **Accounts** with email + password (httpOnly session cookies, scrypt password hashes). Every resume query is scoped to its owner on the server.
- **AI writing help**: "Improve with AI" for descriptions and "Write with AI" for the profile summary, through `POST /api/ai`, which calls the Claude API.
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

One Railway service runs `npm start`, which serves both the built site (`dist/`) and `/api`, so cookies stay first-party. `railway.json` sets the start command and a health check on `/api/health`. The database tables are created automatically when the server starts.

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
| AI writing help                                  | `server/ai.js`                                                     |

A resume is stored as one row: `data` (content JSON) and `style` (settings JSON). Profile photos are resized in the browser and stored inside `data` as a small JPEG, so no storage bucket is needed.

## Not in the MVP yet

- Password reset and email sign-in links (needs an email provider such as Resend)
- Payments and plan limits (Stripe)
- Cover letters, which can reuse the same rendering engine
- Server-side PDF generation (headless Chromium) for a one-click download without the print dialog
- Importing an existing resume (PDF → structured data with an LLM)
- Job tracker, a personal website with a custom domain, an email signature generator
- Translated interface, undo/redo, version history
- Splitting a single very long entry across two pages (today an entry always stays on one page)
