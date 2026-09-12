import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Target = z.object({ entity_type: z.enum(["driver", "team"]), entity_slug: z.string().min(1) });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Target.parse(d))
  .handler(async ({ data, context }) =>
    (await import("./follows.server")).toggleFollow(context.userId, data.entity_type, data.entity_slug));

export const listMyFollows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./follows.server")).listMyFollows(context.userId));
