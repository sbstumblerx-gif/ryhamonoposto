import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const ContractUntil = z.enum([
  "none", "unknown",
  "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033",
  "2034", "2035", "2036", "2037", "2038", "2039", "2040",
]);

export type ContractUntilValue = z.infer<typeof ContractUntil>;

export const updateDriverContract = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string(),
    contract_start_year: z.number().int().min(2020).max(2100).nullable(),
    current_contract_until: ContractUntil.nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("drivers")
      .update({
        contract_start_year: data.contract_start_year,
        current_contract_until: data.current_contract_until,
      } as any)
      .eq("slug", data.slug)
      .select("slug, current_contract_until, contract_start_year")
      .single();
    if (error) throw error;
    return row;
  });
