import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sovelluksen data SV Accountiin synkronoitavaksi. */
export const svGetPayload = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./sv.server")).svPayload(context.userId));

export const svLinkAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sv_user_id: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => (await import("./sv.server")).svLink(context.userId, data.sv_user_id));

export const svUnlinkAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./sv.server")).svUnlink(context.userId));
