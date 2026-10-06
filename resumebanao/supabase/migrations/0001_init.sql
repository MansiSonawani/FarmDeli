-- resumebanao schema. Run this once in Supabase → SQL Editor (or `supabase db push`).

create table if not exists public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'Untitled resume',
  data        jsonb not null default '{}'::jsonb,
  style       jsonb not null default '{}'::jsonb,
  is_public   boolean not null default false,
  slug        text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

alter table public.resumes enable row level security;

-- Owners can do everything with their own resumes.
drop policy if exists "Owners manage their resumes" on public.resumes;
create policy "Owners manage their resumes"
  on public.resumes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone (including signed-out visitors) can read a resume its owner has published.
drop policy if exists "Public resumes are readable" on public.resumes;
create policy "Public resumes are readable"
  on public.resumes
  for select
  to anon, authenticated
  using (is_public = true);
