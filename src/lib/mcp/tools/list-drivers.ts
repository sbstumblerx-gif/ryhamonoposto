import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_drivers",
  title: "Kuljettajat",
  description: "Read public RyhäMonoposto driver names, numbers, flags, current teams and recorded contract end years.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum drivers returned (1–100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("drivers")
      .select("slug, name, number, flag, current_team_slug, current_contract_until")
      .order("name").limit(limit);
    if (error) throw new ToolError("Could not read public drivers.");
    const drivers = (data ?? []).map(d => ({ ...d, url: `https://ryhamonoposto.lovable.app/kuljettajat/${d.slug}` }));
    return { content: [{ type: "text", text: JSON.stringify(drivers) }], structuredContent: { drivers } };
  },
});