-- resumebanao schema. Applied on every server start; every statement is idempotent.

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- `id` is the SHA-256 of the session token, so a database leak does not leak live sessions.
create table if not exists sessions (
  id          text primary key,
  user_id     uuid not null references users (id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions (user_id);

create table if not exists resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  title       text not null default 'Untitled resume',
  data        jsonb not null default '{}'::jsonb,
  style       jsonb not null default '{}'::jsonb,
  is_public   boolean not null default false,
  slug        text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on resumes (user_id, updated_at desc);

-- Job tracker: one row per application. The timeline (`events`) and the people involved
-- (`contacts`) are short per-job lists, so they live in jsonb columns on the row.
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users (id) on delete cascade,
  role            text not null,
  company         text not null,
  url             text,
  location        text,
  work_mode       text check (work_mode in ('onsite', 'hybrid', 'remote')),
  stage           text not null default 'wishlist'
                    check (stage in ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')),
  position        double precision not null default 0, -- order within its column
  applied_on      date,
  salary_min      double precision, -- lakh per annum (LPA)
  salary_max      double precision,
  salary_expected double precision,
  source          text,
  referrer        text,
  resume_id       uuid references resumes (id) on delete set null,
  resume_snapshot jsonb, -- frozen copy of the resume as it was sent: { title, data, style, at }
  description     text,
  notes           text,
  next_step       text,
  next_step_at    timestamptz,
  starred         boolean not null default false,
  events          jsonb not null default '[]'::jsonb,
  contacts        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on jobs (user_id, stage, position);
