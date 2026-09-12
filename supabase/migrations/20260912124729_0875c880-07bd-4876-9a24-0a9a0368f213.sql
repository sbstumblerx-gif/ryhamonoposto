ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS tag text,
  ADD COLUMN IF NOT EXISTS tag_emoji text,
  ADD COLUMN IF NOT EXISTS tag_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS clubs_tag_unique_enabled ON public.clubs (upper(tag)) WHERE tag_enabled AND tag IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS club_tag_club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('driver','team')),
  entity_slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_slug)
);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own follows" ON public.follows
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS follows_entity_idx ON public.follows (entity_type, entity_slug);