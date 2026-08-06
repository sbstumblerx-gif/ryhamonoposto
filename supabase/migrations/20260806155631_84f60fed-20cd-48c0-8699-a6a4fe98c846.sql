ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.club_messages ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false;
ALTER TABLE public.club_messages ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  serial_number text NOT NULL,
  team_slug text,
  driver_slug text,
  is_booster boolean NOT NULL DEFAULT false,
  card_type text NOT NULL DEFAULT 'Tavallinen',
  driver_number integer,
  race_name text,
  race_flag text,
  race_position text,
  season_slug text,
  attack integer,
  defense integer,
  boost integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cards TO anon, authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read cards" ON public.cards FOR SELECT USING (true);
CREATE TRIGGER cards_touch BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  copies integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
GRANT SELECT ON public.user_cards TO authenticated;
GRANT ALL ON public.user_cards TO service_role;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cards read" ON public.user_cards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER user_cards_touch BEFORE UPDATE ON public.user_cards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_vault (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_vault TO authenticated;
GRANT ALL ON public.user_vault TO service_role;
ALTER TABLE public.user_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vault read" ON public.user_vault FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER user_vault_touch BEFORE UPDATE ON public.user_vault FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.card_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'prediction',
  session_id uuid REFERENCES public.prediction_sessions(id) ON DELETE SET NULL,
  card_count integer NOT NULL DEFAULT 1,
  opened boolean NOT NULL DEFAULT false,
  result jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX card_packs_unique_session ON public.card_packs (user_id, session_id) WHERE session_id IS NOT NULL;
GRANT SELECT ON public.card_packs TO authenticated;
GRANT ALL ON public.card_packs TO service_role;
ALTER TABLE public.card_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own packs read" ON public.card_packs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER card_packs_touch BEFORE UPDATE ON public.card_packs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();