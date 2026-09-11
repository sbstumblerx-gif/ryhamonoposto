alter table public.clubs
  add column if not exists tag text,
  add column if not exists tag_emoji text,
  add column if not exists tag_enabled boolean not null default false;

alter table public.profiles
  add column if not exists club_tag_club_id uuid references public.clubs(id) on delete set null;

create unique index if not exists clubs_tag_unique_idx
  on public.clubs (lower(tag))
  where tag is not null and tag_enabled = true;

create index if not exists profiles_club_tag_club_idx
  on public.profiles (club_tag_club_id);

alter table public.clubs enable row level security;
alter table public.profiles enable row level security;

-- Club tags are public profile metadata, so public clients may read the tag fields.
drop policy if exists "public can read club tags" on public.clubs;
create policy "public can read club tags"
  on public.clubs for select
  using (true);

-- The profile tag selection is public because it is rendered next to usernames.
drop policy if exists "public can read profile club tags" on public.profiles;
create policy "public can read profile club tags"
  on public.profiles for select
  using (true);
