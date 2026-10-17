import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_races", title: "Kilpailut",
  description: "List RyhäMonoposto races with dates, flags, rounds and links, optionally searching their names.",
  inputSchema: { search: z.string().max(100).optional().describe("Optional text to find in a race name."), limit: z.number().int().min(1).max(100).default(30).describe("Maximum races returned (1–100).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    let query = supabaseForUser(ctx).from("races").select("id, slug, name, flag, round_number, race_date").order("slug").limit(limit);
    if (search) query = query.ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error } = await query;
    if (error) throw new ToolError("Could not read races.");
    const races = (data ?? []).map(r => ({ ...r, url: `https://ryhamonoposto.lovable.app/kilpailut/${r.slug}` }));
    return { content: [{ type: "text", text: JSON.stringify(races) }], structuredContent: { races } };
  },
});