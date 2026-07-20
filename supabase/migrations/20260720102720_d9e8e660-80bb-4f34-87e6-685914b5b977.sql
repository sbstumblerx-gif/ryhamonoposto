
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS info_card text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS current_team_slug text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS current_team_since int;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS former_teams jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.races ADD COLUMN IF NOT EXISTS youtube_url text;
