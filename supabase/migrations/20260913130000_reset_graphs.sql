-- Existing graphs were generated with the old race ordering. Remove them so no stale chronology remains.
truncate table public.graphs;
