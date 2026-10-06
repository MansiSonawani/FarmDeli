# CV Builder (MVP)

A resume builder in the style of FlowCV, built with **React + Vite + Tailwind CSS** and **Supabase**.

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
- **Accounts** with email + password or a magic link (Supabase Auth). Resumes are stored in Postgres with row-level security.
- **AI writing help**: "Improve with AI" for descriptions and "Write with AI" for the profile summary. These run through a Supabase Edge Function that calls the Claude API.
- **Autosave**, a dashboard (create, duplicate, rename, delete), and a mobile layout with an edit/preview toggle.
- **Demo mode**: without Supabase keys the app runs fully in the browser, with data saved in `localStorage`.

## Quick start

```bash
cd cv-builder
npm install
npm run dev          # http://localhost:5173 – runs in demo mode until .env is set
npm test             # unit tests (pagination + formatting)
npm run build        # production build in dist/
```

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Database**: open *SQL Editor* and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It creates the `resumes` table, the row-level-security policies and the `updated_at` trigger.
3. **Keys**: copy `.env.example` to `.env` and fill in the values from *Project Settings → API*:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon / publishable key>
   ```
   Only use the **anon/publishable** key. Never put the `service_role` key in the frontend.
4. **Auth URLs**: in *Authentication → URL Configuration*, set the Site URL to your app's URL (for example `http://localhost:5173`) and add `<your-url>/app` to the redirect URLs. Email confirmation is on by default; turn it off under *Authentication → Providers → Email* if you want people to sign up instantly.
5. Restart `npm run dev`.

### AI writing help (optional)

The AI buttons call the `ai-assist` Edge Function, which uses the Claude API (`claude-opus-5-5`).

```bash
npm install -g supabase                      # or: npx supabase ...
supabase login
supabase link --project-ref <project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai-assist
```

The function only accepts signed-in users (JWT verification is on), and it never receives the profile photo.

## Deploy the frontend

Any static host works. `vercel.json` and `public/_redirects` (for Netlify) already rewrite every route to `index.html`, so `/app/...` and `/r/...` links work. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's environment variables.

## How it works

| Piece | Where |
| --- | --- |
| Resume data model, section types, sample content | `src/lib/defaults.js` |
| Templates (style presets), fonts, colors | `src/lib/templates.js` |
| Data → blocks per column | `src/components/resume/blocks.jsx` |
| Measure blocks → pack into pages → render | `src/components/resume/PaginatedResume.jsx`, `src/lib/paginate.js` |
| Resume CSS (shared by preview and print) | `src/components/resume/resume.css` |
| Supabase / localStorage data access | `src/lib/store.js` |
| Editor UI | `src/pages/Editor.jsx`, `src/components/editor/*` |
| AI edge function | `supabase/functions/ai-assist/index.ts` |

A resume is stored as one row: `data` (content JSON) and `style` (settings JSON). Profile photos are resized in the browser and stored inside `data` as a small JPEG, so no storage bucket is needed.

## Not in the MVP yet

- Payments and plan limits (Stripe)
- Cover letters, which can reuse the same rendering engine
- Server-side PDF generation (headless Chromium) for a one-click download without the print dialog
- Importing an existing resume (PDF → structured data with an LLM)
- Job tracker, a personal website with a custom domain, an email signature generator
- Translated interface, undo/redo, version history
- Splitting a single very long entry across two pages (today an entry always stays on one page)
