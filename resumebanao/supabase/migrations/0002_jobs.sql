-- Job tracker. Run after 0001_init.sql in Supabase → SQL Editor (or `supabase db push`).
--
-- One row per application. The timeline (`events`) and the people involved
-- (`contacts`) are small per-job lists, so they live in jsonb columns on the
-- row, the same way resumes keep their content in `data`.

create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,

  role            text not null,
  company         text not null,
  url             text,
  location        text,
  work_mode       text check (work_mode in ('onsite', 'hybrid', 'remote')),

  stage           text not null default 'wishlist'
                    check (stage in ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')),
  position        double precision not null default 0, -- order within its column
  applied_on      date,

  salary_min      numeric,   -- in lakh per annum (LPA)
  salary_max      numeric,
  salary_expected numeric,

  source          text,      -- linkedin | naukri | referral | website | campus | recruiter | other
  referrer        text,

  resume_id       uuid references public.resumes (id) on delete set null,
  resume_snapshot jsonb,     -- frozen copy of the resume as it was sent: { title, data, style, at }

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

create index if not exists jobs_user_id_idx on public.jobs (user_id, stage, position);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

-- Applications are private: only their owner can see or change them.
drop policy if exists "Owners manage their jobs" on public.jobs;
create policy "Owners manage their jobs"
  on public.jobs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
