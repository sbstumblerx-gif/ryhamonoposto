import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<any, any, any>;
export type FanEntity = { entity_type: "driver" | "team"; entity_slug: string };

async function db(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

export async function addFanPoints(entity: FanEntity, points: number, eventKey: string) {
  if (!points) return;
  const database = await db();
  const { error } = await database.from("fan_point_events").upsert(
    { entity_type: entity.entity_type, entity_slug: entity.entity_slug, points, event_key: eventKey },
    { onConflict: "event_key", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function removeFanPointEvent(eventKey: string) {
  const database = await db();
  const { error } = await database.from("fan_point_events").delete().eq("event_key", eventKey);
  if (error) throw error;
}

export async function addFanPointsForMentionedEntities(
  text: string,
  points: number,
  eventPrefix: string,
  excluded?: FanEntity,
) {
  const database = await db();
  const [{ data: drivers }, { data: teams }] = await Promise.all([
    database.from("drivers").select("slug, name"),
    database.from("teams").select("slug, name"),
  ]);
  const haystack = text.toLowerCase();
  const entities: FanEntity[] = [];
  for (const d of drivers ?? []) {
    if (d.name && haystack.includes(String(d.name).toLowerCase())) {
      entities.push({ entity_type: "driver", entity_slug: d.slug });
    }
  }
  for (const t of teams ?? []) {
    if (t.name && haystack.includes(String(t.name).toLowerCase())) {
      entities.push({ entity_type: "team", entity_slug: t.slug });
    }
  }

  for (const entity of entities) {
    if (excluded && entity.entity_type === excluded.entity_type && entity.entity_slug === excluded.entity_slug) continue;
    await addFanPoints(entity, points, `${eventPrefix}:${entity.entity_type}:${entity.entity_slug}`);
  }
}
