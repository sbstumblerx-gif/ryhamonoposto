DROP POLICY IF EXISTS "public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable for club tags" ON public.profiles;
CREATE POLICY "owners read profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
REVOKE SELECT ON public.profiles FROM anon;
DROP POLICY IF EXISTS "predictions readable" ON public.predictions;
CREATE POLICY "owners read predictions" ON public.predictions FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE SELECT ON public.predictions FROM anon;
DROP POLICY IF EXISTS "authenticated read votes" ON public.poll_votes;
CREATE POLICY "owners read votes" ON public.poll_votes FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE SELECT ON public.poll_votes FROM anon;
DROP POLICY IF EXISTS "Authenticated users can read fan point events" ON public.fan_point_events;
DROP POLICY IF EXISTS "Fan point events are readable" ON public.fan_point_events;
REVOKE SELECT ON public.fan_point_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.read_public_profile(profile_id uuid)
RETURNS TABLE (id uuid, display_name text, avatar_url text, club_tag_club_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT p.id, p.display_name, p.avatar_url, p.club_tag_club_id FROM public.profiles p WHERE p.id = profile_id $$;
REVOKE ALL ON FUNCTION public.read_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_profile(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_prediction_rank(since_date timestamptz DEFAULT NULL)
RETURNS TABLE (rank bigint, points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
WITH totals AS (SELECT p.user_id, sum(p.points)::bigint AS points FROM public.predictions p WHERE since_date IS NULL OR p.created_at >= since_date GROUP BY p.user_id),
ranked AS (SELECT t.user_id, t.points, row_number() OVER (ORDER BY t.points DESC, t.user_id) AS rank FROM totals t)
SELECT r.rank, r.points FROM ranked r WHERE r.user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_prediction_rank(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_prediction_rank(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.read_poll_result_counts(target_poll_id uuid)
RETURNS TABLE (option_id uuid, vote_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
SELECT v.option_id, count(*) FROM public.poll_votes v
WHERE v.poll_id = target_poll_id AND auth.uid() IS NOT NULL
AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = target_poll_id AND ((p.closes_at IS NOT NULL AND p.closes_at <= now()) OR EXISTS (SELECT 1 FROM public.poll_votes mine WHERE mine.poll_id = p.id AND mine.user_id = auth.uid())))
GROUP BY v.option_id
$$;
REVOKE ALL ON FUNCTION public.read_poll_result_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_poll_result_counts(uuid) TO authenticated;