import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ModeSchema = z.enum(["2026", "all"]);

export const duelOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./duel.server")).duelOverview(context.userId));

export const startDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: ModeSchema }).parse(d))
  .handler(async ({ data, context }) => (await import("./duel.server")).startDuel(context.userId, data.mode));

export const resolveDuel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        draft_id: z.string().uuid(),
        card_ids: z.array(z.string().uuid()).length(2),
        booster_id: z.string().uuid().nullable().default(null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) =>
    (await import("./duel.server")).resolveDuel(context.userId, data.draft_id, data.card_ids, data.booster_id),
  );
