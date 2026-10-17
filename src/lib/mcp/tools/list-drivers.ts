import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_drivers", title: "Kuljettajat",
  description: "Read RyhäMonoposto driver names, numbers, teams and registered contract end years.",
  inputSchema: { limit: z.number().int().min(1).max(100).default(50).describe("Maximum drivers returned (1–100).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("drivers").select("slug, name, number, flag, current_team_slug, current_contract_until").order("name").limit(limit);
    if (error) throw new ToolError("Could not read drivers.");
    const drivers = (data ?? []).map(d => ({ ...d, url: `https://ryhamonoposto.lovable.app/kuljettajat/${d.slug}` }));
    return { content: [{ type: "text", text: JSON.stringify(drivers) }], structuredContent: { drivers } };
  },
});