import type { FollowKind } from "./follows.server";

export async function entityFanStats(entity_type: FollowKind, entity_slug: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data, error } = await db.from("fan_point_events").select("points").eq("entity_type", entity_type).eq("entity_slug", entity_slug);
  if (error) throw error;
  const total = (data ?? []).reduce((sum: number, row: any) => sum + Number(row.points ?? 0), 0);
  return { entity_type, entity_slug, fan_points: total };
}
