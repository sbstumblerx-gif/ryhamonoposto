ALTER TABLE public.club_messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_duration integer;

ALTER TABLE public.club_messages ALTER COLUMN body SET DEFAULT '';