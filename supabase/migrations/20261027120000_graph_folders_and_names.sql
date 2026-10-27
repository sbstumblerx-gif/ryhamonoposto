-- Personal graph names and nested folders.
create table if not exists public.graph_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  parent_id uuid references public.graph_folders(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.graph_folders enable row level security;
-- Folder reads and writes go through authenticated server functions only.
create index if not exists graph_folders_owner_parent_idx on public.graph_folders(owner_id, parent_id);
alter table public.graphs add column if not exists custom_title text;
alter table public.graphs add column if not exists folder_id uuid references public.graph_folders(id) on delete set null;
create index if not exists graphs_folder_idx on public.graphs(folder_id);
