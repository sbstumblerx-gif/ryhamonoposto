import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_race_result",
  title: "Kilpailun tulos",
  description: "Read qualifying and race result text for a named RyhäMonoposto race.",
  inputSchema: { search: z.string().min(1).max(100).describe("Race name or part of its name.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const escaped = search.replace(/[\\%_]/g, "\\$&");
    const { data, error } = await supabaseAdmin.from("races")
      .select("slug, name, flag, race_date, round_number, qualifying_content, race_content, sprint_qualifying_content, sprint_content, is_sprint_weekend" as any)
      .ilike("name", `%${escaped}%`).order("round_number", { ascending: true }).limit(10);
    if (error) throw new ToolError("Could not read race results.");
    const races = (data ?? []).map(r => ({
      ...r,
      url: `https://ryhamonoposto.lovable.app/kilpailut/${r.slug}`,
    }));
    return { content: [{ type: "text", text: JSON.stringify(races) }], structuredContent: { races } };
  },
});