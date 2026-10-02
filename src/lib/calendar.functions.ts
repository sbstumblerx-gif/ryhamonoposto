import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SESSION_TYPES = { T: "Testaus", P: "Vapaat harjoitukset", SQ: "Sprintin aika-ajot", S: "Sprinttikilpailu", Q: "Aika-ajot", R: "Kilpailu" } as const;
export type SessionType = keyof typeof SESSION_TYPES;
export type CalendarSession = {
  id: string; session_type: SessionType; session_date: string;
  race: { id: string; slug: string; name: string; flag: string; round_number: number | null } | null;
};

export async function loadSessions(): Promise<CalendarSession[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("race_sessions")
    .select("id, session_type, session_date, race:races(id, slug, name, flag, round_number)")
    .order("session_date");
  if (error) throw error;
  const order = ["T", "P", "SQ", "S", "Q", "R"];
  return ((data ?? []) as CalendarSession[]).sort((a, b) => a.session_date.localeCompare(b.session_date) || order.indexOf(a.session_type) - order.indexOf(b.session_type));
}

export const listCalendarSessions = createServerFn({ method: "GET" }).handler(() => loadSessions());

export const addCalendarSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    race_id: z.string().uuid(),
    session_type: z.enum(["T", "P", "SQ", "S", "Q", "R"]),
    session_date: z.string().regex(/^(20(2[6-9]|3\d|40))-\d{2}-\d{2}$/),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("race_sessions").insert(data);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCalendarSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("race_sessions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
