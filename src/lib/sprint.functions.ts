import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function assertAdmin() {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
}

const SprintPatch = z.object({
  id: z.string().uuid(),
  is_sprint_weekend: z.boolean().optional(),
  sprint_qualifying_content: z.string().optional(),
  sprint_content: z.string().optional(),
  sprint_qualifying_media_url: z.string().nullable().optional(),
  sprint_media_url: z.string().nullable().optional(),
  sprint_qualifying_youtube_url: z.string().nullable().optional(),
  sprint_youtube_url: z.string().nullable().optional(),
  sprint_fastest_lap_driver_slug: z.string().nullable().optional(),
});

export const setSprintWeekend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("races")
      .update({ is_sprint_weekend: data.enabled } as any)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const updateSprint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SprintPatch.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { data: row, error } = await supabaseAdmin
      .from("races")
      .update(patch as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row;
  });
