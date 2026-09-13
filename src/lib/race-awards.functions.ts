import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const updateRaceAwards = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    driver_of_the_day_slug: z.string().nullable(),
    fastest_lap_driver_slug: z.string().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("races")
      .update({
        driver_of_the_day_slug: data.driver_of_the_day_slug,
        fastest_lap_driver_slug: data.fastest_lap_driver_slug,
      })
      .eq("id", data.id)
      .select("id, driver_of_the_day_slug, fastest_lap_driver_slug")
      .single();
    if (error) throw error;
    return row;
  });
