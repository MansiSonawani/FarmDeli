# 0002 Job tracker — tasks

- [x] Mock up board, job detail, add form and mobile list in the app's visual style
- [x] Pure helpers and tests: stages, ordering, move patch, salary, dates, filters, sample jobs — `src/lib/jobs.js`, `src/lib/jobs.test.js`
- [x] Calendar export and tests — `src/lib/ics.js`
- [x] Client data access with demo-mode fallback — `src/lib/jobStore.js`
- [x] State hook with optimistic updates and debounced saves — `src/hooks/useJobs.js`
- [x] Board with pointer and keyboard drag and drop, announcements — `src/components/jobs/JobBoard.jsx`, `JobCard.jsx`
- [x] Overview (pipeline, next up), list table, mobile list — `src/components/jobs/Overview.jsx`, `JobTable.jsx`, `MobileJobList.jsx`
- [x] Detail drawer: stage bar, next step + calendar + mark done, overview fields, resume snapshot, timeline, contacts, notes — `src/components/jobs/JobDetail.jsx`, `src/components/ui/Drawer.jsx`
- [x] Add-a-job form — `src/components/jobs/JobForm.jsx`
- [x] Add the job link later (detail header button, list "Add link") — `JobDetail.jsx`, `JobTable.jsx`, `src/pages/Jobs.jsx`
- [x] Page, route and Resumes/Jobs navigation — `src/pages/Jobs.jsx`, `src/App.jsx`, `src/components/AppHeader.jsx`
- [x] Port to the Node API: schema, routes, validation, tests — `server/schema.sql`, `server/app.js`, `server/app.test.js`
- [x] Browser checks in demo mode and against the real API (drag, keyboard drag, detail edits, link, add, filters, list, reload, delete, mobile)
- [ ] Next version: auto-fill from link, AI tailoring, email reminders, stats (see plan)
