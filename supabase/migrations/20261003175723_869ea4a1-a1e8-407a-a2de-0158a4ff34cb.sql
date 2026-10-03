DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid='public.official_entity_posts'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%entity_type%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE public.official_entity_posts DROP CONSTRAINT %I', c); END IF;
END $$;
ALTER TABLE public.official_entity_posts ADD CONSTRAINT official_entity_posts_entity_type_check CHECK (entity_type IN ('driver','team','series','user'));
ALTER TABLE public.official_entity_posts ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS official_entity_posts_author_idx ON public.official_entity_posts (author_id, created_at DESC);