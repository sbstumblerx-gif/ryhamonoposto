alter table public.races
  add column if not exists driver_of_the_day_slug text,
  add column if not exists fastest_lap_driver_slug text;

create index if not exists races_driver_of_the_day_idx on public.races(driver_of_the_day_slug);
create index if not exists races_fastest_lap_driver_idx on public.races(fastest_lap_driver_slug);
