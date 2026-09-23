-- Interactions and notification fan-out for verified official driver/team posts.
CREATE TABLE IF NOT EXISTS public.official_entity_post_likes (
  post_id uuid NOT NULL REFERENCES public.official_entity_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.official_entity_post_likes TO authenticated;
GRANT ALL ON public.official_entity_post_likes TO service_role;
ALTER TABLE public.official_entity_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read post likes" ON public.official_entity_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like posts" ON public.official_entity_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike their posts" ON public.official_entity_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS official_entity_post_likes_post_idx ON public.official_entity_post_likes(post_id);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;
