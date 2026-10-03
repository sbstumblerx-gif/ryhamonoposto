import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ExtraSession = { id: string; kind: "test" | "practice"; day_number: number; content: string; youtube_url: string | null };
export type RaceScheduleItem = { id: string; session_type: string; session_date: string };

export const getRaceExtras = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ race_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [ex, sch] = await Promise.all([
      db.from("race_extra_sessions").select("id, kind, day_number, content, youtube_url").eq("race_id", data.race_id).order("day_number"),
      db.from("race_sessions").select("id, session_type, session_date").eq("race_id", data.race_id).order("session_date"),
    ]);
    if (ex.error) throw ex.error;
    if (sch.error) throw sch.error;
    const order = ["T", "P", "SQ", "S", "Q", "R"];
    const schedule = ((sch.data ?? []) as RaceScheduleItem[]).sort((a, b) => a.session_date.localeCompare(b.session_date) || order.indexOf(a.session_type) - order.indexOf(b.session_type));
    return { extras: (ex.data ?? []) as ExtraSession[], schedule };
  });

export const saveRaceExtra = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    race_id: z.string().uuid(),
    kind: z.enum(["test", "practice"]),
    day_number: z.number().int().min(1).max(5),
    content: z.string().max(20000).optional(),
    youtube_url: z.string().max(500).nullable().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: existing } = await db.from("race_extra_sessions").select("id").eq("race_id", data.race_id).eq("kind", data.kind).eq("day_number", data.day_number).maybeSingle();
    const patch: any = {};
    if (data.content !== undefined) patch.content = data.content;
    if (data.youtube_url !== undefined) patch.youtube_url = data.youtube_url;
    const res = existing
      ? await db.from("race_extra_sessions").update(patch).eq("id", existing.id)
      : await db.from("race_extra_sessions").insert({ race_id: data.race_id, kind: data.kind, day_number: data.day_number, ...patch });
    if (res.error) throw res.error;
    return { ok: true };
  });

export const deleteRaceExtra = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("race_extra_sessions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
