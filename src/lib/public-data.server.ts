import { createClient } from "@supabase/supabase-js";

// Tables that are intentionally public (anon-readable via RLS). Private tables
// (profiles, predictions, poll_votes, fan_point_events, follows…) are never listed.
export const PUBLIC_TABLES = [
  "teams", "drivers", "races", "race_sessions", "race_extra_sessions", "seasons",
  "news", "highlights", "media_items", "stats_pages", "graphs", "circuit_contracts",
  "comments", "polls", "poll_options", "prediction_sessions", "cards", "official_entity_posts",
] as const;
export type PublicTable = (typeof PUBLIC_TABLES)[number];

function env(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]?.trim();
}

export async function readPublicTable(table: PublicTable, limit = 200, offset = 0) {
  const url = env("SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;
  const key = env("SUPABASE_PUBLISHABLE_KEY") ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  // Anonymous client: RLS decides what is visible, so only public rows are returned.
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.from(table).select("*").range(offset, offset + limit - 1);
  if (error) throw new Error(`Could not read ${table}`);
  return data ?? [];
}
