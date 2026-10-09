# Changes

Design notes and task lists for larger features, written before implementation and kept up to date while building. Read these to understand why a feature works the way it does; read the code for how.

## Convention

Each change gets a numbered folder:

```
changes/
  NNNN-short-name/
    plan.md    # context, goals, decisions, design, contracts, risks
    tasks.md   # ordered checklist; tick items off and note commits as you go
```

- **Status** sits at the top of `plan.md`: `Planned`, `In progress`, `Done` or `Dropped`.
- When implementation diverges from the plan, update `plan.md` in the same commit (add a short "Changed during implementation" note rather than silently rewriting history).
- Tasks reference files by path so an agent can jump straight to them.
- Small fixes do not need a folder; the commit message is enough.

## Index

| #    | Change                                      | Status                                       |
| ---- | ------------------------------------------- | -------------------------------------------- |
| 0001 | [Resume import](0001-resume-import/plan.md) | Done (rules extractor); AI extractor pending |
| 0002 | [Job tracker](0002-job-tracker/plan.md)     | Done (first version); next version planned   |
