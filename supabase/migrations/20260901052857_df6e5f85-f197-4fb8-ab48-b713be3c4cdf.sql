CREATE TABLE public.duel_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('2026','all')),
  duel_pool uuid[] NOT NULL,
  booster_pool uuid[] NOT NULL DEFAULT '{}',
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.duel_drafts TO authenticated;
GRANT ALL ON public.duel_drafts TO service_role;
ALTER TABLE public.duel_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drafts read" ON public.duel_drafts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.duel_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('2026','all')),
  draft_id uuid REFERENCES public.duel_drafts(id) ON DELETE SET NULL,
  my_cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  booster jsonb,
  opponent_cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  rounds jsonb NOT NULL DEFAULT '[]'::jsonb,
  result text NOT NULL CHECK (result IN ('P1','P2','P3')),
  season_points integer NOT NULL DEFAULT 0,
  vault_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.duel_matches TO authenticated;
GRANT ALL ON public.duel_matches TO service_role;
ALTER TABLE public.duel_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own matches read" ON public.duel_matches FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX duel_matches_user_mode_idx ON public.duel_matches (user_id, mode, created_at DESC);