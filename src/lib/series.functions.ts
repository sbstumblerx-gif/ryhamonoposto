import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSeriesInput = z.object({
  name: z.string().trim().min(3).max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48),
  description: z.string().trim().max(500).default(""),
  adminPassword: z.string().min(10).max(200),
});

export const listSeries = createServerFn({ method: "GET" }).handler(async () =>
  (await import("./series.server")).listSeries()
);

export const createSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSeriesInput.parse(d))
  .handler(async ({ data, context }) =>
    (await import("./series.server")).createSeries(context.userId, data)
  );
