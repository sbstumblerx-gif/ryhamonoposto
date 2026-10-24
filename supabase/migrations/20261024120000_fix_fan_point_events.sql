-- Repair fan-point event idempotency, reconcile existing interactions, and backfill historical public activity.
-- Safe to rerun: stable event_key values plus ON CONFLICT prevent duplicate points.

-- Remove the partial index variant so Postgres can infer ON CONFLICT (event_key).
DROP INDEX IF EXISTS public.fan_point_events_event_key_idx;

-- Be defensive if a deployment somehow contains duplicate non-null event keys.
WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY event_key ORDER BY created_at, id) AS rn
  FROM public.fan_point_events
  WHERE event_key IS NOT NULL
)
DELETE FROM public.fan_point_events e
USING duplicates d
WHERE e.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX fan_point_events_event_key_idx
  ON public.fan_point_events (event_key);

-- Historical follow events used the follow-row UUID, which allowed unfollow/refollow farming.
-- Rebuild follow points from the current follows table using a stable user/entity key.
DELETE FROM public.fan_point_events
WHERE event_key LIKE 'follow:%';

INSERT INTO public.fan_point_events (entity_type, entity_slug, points, event_key, created_at)
SELECT f.entity_type, f.entity_slug, 20,
       'follow:' || f.user_id::text || ':' || f.entity_type || ':' || f.entity_slug,
       COALESCE(f.created_at, now())
FROM public.follows f
WHERE f.entity_type IN ('driver', 'team')
ON CONFLICT (event_key) DO NOTHING;

-- Backfill likes on official driver/team posts.
INSERT INTO public.fan_point_events (entity_type, entity_slug, points, event_key, created_at)
SELECT p.entity_type, p.entity_slug, 5,
       'like:' || l.post_id::text || ':' || l.user_id::text,
       COALESCE(l.created_at, now())
FROM public.official_entity_post_likes l
JOIN public.official_entity_posts p ON p.id = l.post_id
WHERE p.entity_type IN ('driver', 'team')
ON CONFLICT (event_key) DO NOTHING;

-- Backfill comments on official driver/team posts.
INSERT INTO public.fan_point_events (entity_type, entity_slug, points, event_key, created_at)
SELECT p.entity_type, p.entity_slug, 7,
       'comment:' || c.id::text,
       COALESCE(c.created_at, now())
FROM public.comments c
JOIN public.official_entity_posts p
  ON p.id::text = c.entity_id
WHERE c.entity_type = 'official_post'
  AND p.entity_type IN ('driver', 'team')
ON CONFLICT (event_key) DO NOTHING;

-- Backfill the four-point news mention events for existing news.
INSERT INTO public.fan_point_events (entity_type, entity_slug, points, event_key, created_at)
SELECT mentions.entity_type, mentions.entity_slug, 4,
       'news-mention:' || mentions.news_id::text || ':' || mentions.entity_type || ':' || mentions.entity_slug,
       COALESCE(mentions.created_at, now())
FROM (
  SELECT n.id AS news_id, n.created_at, 'driver'::text AS entity_type, d.slug AS entity_slug
  FROM public.news n
  JOIN public.drivers d ON NULLIF(trim(d.name), '') IS NOT NULL
    AND lower(concat_ws(E'\n', n.title, n.excerpt, n.content)) LIKE '%' || lower(d.name) || '%'
  UNION ALL
  SELECT n.id AS news_id, n.created_at, 'team'::text AS entity_type, t.slug AS entity_slug
  FROM public.news n
  JOIN public.teams t ON NULLIF(trim(t.name), '') IS NOT NULL
    AND lower(concat_ws(E'\n', n.title, n.excerpt, n.content)) LIKE '%' || lower(t.name) || '%'
) AS mentions
ON CONFLICT (event_key) DO NOTHING;
