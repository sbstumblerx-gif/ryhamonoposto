import type { FollowKind } from "./follows.server";

export async function entityFollowStats(entity_type: FollowKind, entity_slug: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { count, error } = await db.from("follows").select("id", { count: "exact", head: true }).eq("entity_type", entity_type).eq("entity_slug", entity_slug);
  if (error) throw error;
  return { entity_type, entity_slug, follower_count: count ?? 0 };
}
