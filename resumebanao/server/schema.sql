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
