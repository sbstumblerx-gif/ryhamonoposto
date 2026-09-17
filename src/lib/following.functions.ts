import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const followingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./following.server")).followingOverview(context.userId));

export const entityFollowStats = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ entity_type: z.enum(["driver", "team"]), entity_slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => (await import("./entity-follow-stats.server")).entityFollowStats(data.entity_type, data.entity_slug));
