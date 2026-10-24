import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export const getDriverContracts = defineTool({
  name: "get_driver_contracts",
  title: "Kuljettajien sopimukset",
  description: "Read public driver contract status and current team. Uses the active season context; missing or unknown values must not be guessed.",
  inputSchema: { search: z.string().max(100).optional().describe("Optional driver name search.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, current_contract_until, contract_start_year").order("name").limit(100);
    if (search) query = query.ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error } = await query;
    if (error) throw new ToolError("Could not read public driver contracts.");
    const drivers = (data ?? []).map(d => ({
      name: d.name, flag: d.flag, current_team: d.current_team_slug,
      contract_start_year: d.contract_start_year, contract_until: d.current_contract_until,
      url: `https://ryhamonoposto.lovable.app/kuljettajat/${d.slug}`,
    }));
    return { content: [{ type: "text", text: JSON.stringify(drivers) }], structuredContent: { drivers } };
  },
});

export const getTeamEngine = defineTool({
  name: "get_team_engine",
  title: "Tiimien moottoritoimittajat",
  description: "Read public team engine suppliers and registered engine contract years.",
  inputSchema: { search: z.string().max(100).optional().describe("Optional team name search.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("teams").select("slug, name, flag, engine_supplier, engine_contract_start_year, engine_contract_year").order("name").limit(100);
    if (search) query = query.ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error } = await query;
    if (error) throw new ToolError("Could not read public team engine details.");
    const teams = (data ?? []).map(t => ({ ...t, url: `https://ryhamonoposto.lovable.app/tiimit/${t.slug}` }));
    return { content: [{ type: "text", text: JSON.stringify(teams) }], structuredContent: { teams } };
  },
});