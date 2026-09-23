import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Engine = z.enum(["Mercedes-AMG", "Honda", "Audi", "Ferrari", "Renault", "Epic PT"]);
const CircuitStatus = z.enum(["active", "expired", "unknown"]);

export const listCircuitContracts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data, error }, { data: activeSeason, error: activeSeasonError }] = await Promise.all([
    supabaseAdmin.from("circuit_contracts").select("id,slug,name,contract_status,contract_start_year,contract_year").order("id"),
    supabaseAdmin.from("seasons").select("sort_order").eq("is_active", true).maybeSingle(),
  ]);
  if (error) throw error;
  if (activeSeasonError) throw activeSeasonError;
  const activeYear = activeSeason?.sort_order ?? null;
  return (data ?? []).map(row => ({
    ...row,
    contract_status: row.contract_year == null ? "unknown" : activeYear != null && row.contract_year < activeYear ? "expired" : "active",
  }));
});

export const updateCircuitContract = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string(),
    contract_status: CircuitStatus,
    contract_start_year: z.number().int().min(2020).max(2100).nullable(),
    contract_year: z.number().int().min(2020).max(2100).nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    if (data.contract_status === "unknown" && (data.contract_start_year !== null || data.contract_year !== null)) {
      throw new Error("Määrittämättömällä sopimuksella ei voi olla sopimusvuosia.");
    }
    if (data.contract_status !== "unknown" && data.contract_year === null) {
      throw new Error("Valitse sopimukselle erääntymisvuosi.");
    }
    if (data.contract_start_year !== null && data.contract_year !== null && data.contract_start_year > data.contract_year) {
      throw new Error("Alkamisaika ei voi olla erääntymisaikaa myöhemmin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: activeSeason, error: activeSeasonError } = await supabaseAdmin
      .from("seasons").select("sort_order").eq("is_active", true).maybeSingle();
    if (activeSeasonError) throw activeSeasonError;
    const activeYear = activeSeason?.sort_order ?? null;
    const effectiveStatus = data.contract_year === null
      ? "unknown"
      : activeYear != null && data.contract_year < activeYear ? "expired" : "active";
    const { data: row, error } = await supabaseAdmin.from("circuit_contracts")
      .update({ contract_status: effectiveStatus, contract_start_year: data.contract_start_year, contract_year: data.contract_year, updated_at: new Date().toISOString() })
      .eq("slug", data.slug)
      .select("id,slug,name,contract_status,contract_start_year,contract_year")
      .single();
    if (error) throw error;
    return row;
  });

export const updateTeamEngine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string(),
    engine_supplier: Engine.nullable(),
    engine_contract_start_year: z.number().int().min(2020).max(2100).nullable(),
    engine_contract_year: z.number().int().min(2020).max(2100).nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    if (data.engine_contract_start_year !== null && data.engine_contract_year !== null && data.engine_contract_start_year > data.engine_contract_year) {
      throw new Error("Alkamisaika ei voi olla erääntymisaikaa myöhemmin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("teams")
      .update({
        engine_supplier: data.engine_supplier,
        engine_contract_start_year: data.engine_contract_start_year,
        engine_contract_year: data.engine_contract_year,
      } as any)
      .eq("slug", data.slug)
      .select("slug,name,engine_supplier,engine_contract_start_year,engine_contract_year")
      .single();
    if (error) throw error;
    return row;
  });

export const engineOptions = Engine.options;
