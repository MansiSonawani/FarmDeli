# 0002 Job tracker

**Status:** Done (first version). Next version planned below.

## Context

People applying for jobs keep track of applications in spreadsheets, notes and their inbox. The resume builder already holds the resume they send, so tracking where it went is a natural next step and a reason to come back to the app every day.

The design was mocked up first (board, job detail, add form, mobile list) in the resumebanao visual style and then built to match.

## Goals

- See every application at a glance, grouped by stage, and move it forward with a drag.
- Never lose the details: the posting link, the job description, who referred you, the salary, and exactly which resume was sent.
- Know what is next: one next step per job with a date, collected in a "Next up" list and exportable to a calendar.
- Work on a phone.

Non-goals for the first version: auto-filling a job from its link, AI tailoring of the resume to a description, email reminders, inbox integration.

## Decisions

- **One `jobs` table, jsonb for small lists.** The timeline (`events`) and the people involved (`contacts`) are short, per-job lists that are always loaded with the job, so they live in jsonb columns like resume content lives in `resumes.data`. This keeps the API to four routes and the demo-mode store identical.
- **Resume snapshot.** A job stores `resume_id` _and_ `resume_snapshot` (title, data, style, time). The live resume keeps changing; the snapshot shows what was actually sent. "Update saved copy" refreshes it on purpose. Deleting the resume clears `resume_id` (`on delete set null`) but keeps the snapshot.
- **Ordering with fractional positions.** `position` is a float; a drop between two cards takes the midpoint (`positionBetween` in `src/lib/jobs.js`). Only the moved job is written.
- **Stage changes write the timeline.** Moving a job appends a `stage` event and sets `applied_on` the first time it leaves the wishlist (`movePatch`).
- **Next step time is optional.** Stored as `timestamptz`; a value at local midnight is treated as an all-day date (`hasTime`, `formatWhen`). The calendar export writes an all-day or a 1-hour event accordingly.
- **Salary in lakh per annum (LPA).** The main audience is in India; ranges are typed as free text ("18–24") and parsed to `salary_min`/`salary_max`.
- **Links without a scheme are accepted.** People paste `careers.example.com/123`; it is stored as `https://careers.example.com/123` (`normalizeUrl`).
- **Accessibility.** Cards stay links (Enter opens the job); Space picks a card up and arrow keys move it (custom keyboard coordinates jump between columns). dnd-kit announces pick-up, moves and drops to screen readers.

## Design

| Piece                                                                                 | Where                                                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Schema                                                                                | `server/schema.sql` (`jobs`)                                        |
| API: `GET/POST /api/jobs`, `PATCH/DELETE /api/jobs/:id`, field validation `jobFields` | `server/app.js`                                                     |
| API tests                                                                             | `server/app.test.js` (`describe('jobs')`)                           |
| Client data access (API or demo-mode localStorage)                                    | `src/lib/jobStore.js`                                               |
| Pure helpers: stages, ordering, salary, dates, filters, sample jobs                   | `src/lib/jobs.js` (+ `jobs.test.js`)                                |
| Calendar export                                                                       | `src/lib/ics.js`                                                    |
| State with optimistic updates and debounced saving                                    | `src/hooks/useJobs.js`                                              |
| Page                                                                                  | `src/pages/Jobs.jsx` (`/app/jobs`, `/app/jobs/:jobId`)              |
| Board (dnd-kit), card, list table, mobile list, overview                              | `src/components/jobs/*`                                             |
| Detail drawer: stage bar, next step, overview, timeline, contacts, notes, job link    | `src/components/jobs/JobDetail.jsx`, `src/components/ui/Drawer.jsx` |
| Add-a-job form                                                                        | `src/components/jobs/JobForm.jsx`                                   |
| Resumes / Jobs navigation                                                             | `src/components/AppHeader.jsx`                                      |

### API contract

All routes require a session. Every query is scoped to the signed-in user; another user's job returns 404. `resume_id` must belong to the same user (400 otherwise). Unknown fields are ignored and `user_id` can never be set. `applied_on` is returned as `YYYY-MM-DD` text; salaries and `position` are numbers.

## Risks

- **Large snapshots.** A snapshot includes the resume photo (a small JPEG data URL). The 2 MB JSON body limit applies; a resume with an unusually large photo could hit it.
- **Concurrent edits** from two tabs are last-write-wins per field.
- **Keyboard dragging** uses a custom coordinate getter; changes to the board layout (e.g. column padding) may need it adjusted.

## Next version

- Auto-fill from a job link (server fetch + extraction; many job sites block automated reading, so pasting the description stays the fallback).
- "Tailor for this job": compare the saved description with the resume and suggest edits with AI.
- Email reminders for next steps.
- Stats: response rate by source, time in each stage.

## Changed during implementation

- **Backend.** Built first on Supabase (row-level security, a `0002_jobs.sql` migration). The branch moved to the Node API + Postgres server while this was in progress, so the table moved into `server/schema.sql`, row-level security became `user_id` scoping in each route, and the Supabase client calls became `/api/jobs` calls. The planned three tables (`jobs`, `job_events`, `job_contacts`) became one table with jsonb lists (see Decisions).
- **Adding the job link later** was requested during the build: an "Add job link" button in the detail header when a job has none, and an "Add link" action in the list view that opens the detail with the field focused.
