-- Public graph registry. The configuration signature is unique so identical graphs are reused.
create table if not exists public.graphs (
  id uuid primary key default gen_random_uuid(),
  signature text not null unique,
  owner_id uuid references public.profiles(id) on delete set null,
  config jsonb not null,
  title text not null,
  subtitle text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists graphs_owner_created_idx on public.graphs(owner_id, created_at desc);

alter table public.graphs enable row level security;

create policy "graphs are publicly readable"
  on public.graphs for select
  using (true);

-- Inserts/updates are performed by the authenticated server functions with the service-role client.
-- No client-side insert policy is intentionally exposed.
