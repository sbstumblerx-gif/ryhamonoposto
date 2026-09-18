import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Engine = z.enum(["Mercedes-AMG", "Honda", "Audi", "Ferrari", "Epic PT"]);
const CircuitStatus = z.enum(["active", "expired", "unknown"]);

export const listCircuitContracts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("circuit_contracts").select("id,slug,name,contract_status,contract_year").order("id");
  if (error) throw error;
  return data ?? [];
});

export const updateCircuitContract = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string(),
    contract_status: CircuitStatus,
    contract_year: z.number().int().min(2020).max(2100).nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    if (data.contract_status === "unknown" && data.contract_year !== null) {
      throw new Error("Tuntemattomalla sopimuksella ei voi olla vuotta.");
    }
    if (data.contract_status !== "unknown" && data.contract_year === null) {
      throw new Error("Valitse sopimukselle vuosi.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("circuit_contracts")
      .update({ contract_status: data.contract_status, contract_year: data.contract_year, updated_at: new Date().toISOString() })
      .eq("slug", data.slug)
      .select("id,slug,name,contract_status,contract_year")
      .single();
    if (error) throw error;
    return row;
  });

export const updateTeamEngine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string(),
    engine_supplier: Engine.nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("teams")
      .update({ engine_supplier: data.engine_supplier } as any)
      .eq("slug", data.slug)
      .select("slug,name,engine_supplier")
      .single();
    if (error) throw error;
    return row;
  });

export const engineOptions = Engine.options;
