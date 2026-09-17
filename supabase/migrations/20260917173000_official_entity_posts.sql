-- Official driver/team publication feed. Verification is deliberately explicit so unverified
-- entities can never appear in the official-following feed.
CREATE TABLE IF NOT EXISTS public.official_entity_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('driver','team')),
  entity_slug text NOT NULL,
  body text NOT NULL DEFAULT '',
  media_url text,
  verified_official boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.official_entity_posts TO authenticated;
GRANT ALL ON public.official_entity_posts TO service_role;
ALTER TABLE public.official_entity_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published official posts are readable" ON public.official_entity_posts
  FOR SELECT TO authenticated USING (published = true AND verified_official = true);
CREATE INDEX IF NOT EXISTS official_entity_posts_entity_time_idx
  ON public.official_entity_posts (entity_type, entity_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS official_entity_posts_time_idx
  ON public.official_entity_posts (created_at DESC);
