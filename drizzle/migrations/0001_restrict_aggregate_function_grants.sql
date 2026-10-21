REVOKE ALL ON FUNCTION public.read_poll_result_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_poll_result_counts(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.my_prediction_rank(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_prediction_rank(timestamptz) TO authenticated;