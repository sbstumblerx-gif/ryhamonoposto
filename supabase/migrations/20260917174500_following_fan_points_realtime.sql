DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fan_point_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fan_point_events;
  END IF;
END $$;
