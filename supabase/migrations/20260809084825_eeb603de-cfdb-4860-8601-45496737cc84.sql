ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sv_user_id text,
  ADD COLUMN IF NOT EXISTS sv_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS sv_reward_claimed boolean NOT NULL DEFAULT false;