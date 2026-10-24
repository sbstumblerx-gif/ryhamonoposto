import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_ryhamonoposto",
  title: "Hae RyhäMonopostosta",
  description: "Search public RyhäMonoposto drivers, teams, races and news. Returns short matches with links.",
  inputSchema: {
    query: z.string().min(2).max(100).describe("Search term, such as a driver, team, race or news title."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const [drivers, teams, races, news] = await Promise.all([
      supabaseAdmin.from("drivers").select("slug, name, flag, number").ilike("name", pattern).limit(5),
      supabaseAdmin.from("teams").select("slug, name, flag, engine_supplier").ilike("name", pattern).limit(5),
      supabaseAdmin.from("races").select("slug, name, flag, race_date, round_number").ilike("name", pattern).limit(5),
      supabaseAdmin.from("news").select("slug, title, excerpt, published_at").ilike("title", pattern).limit(5),
    ]);
    if (drivers.error || teams.error || races.error || news.error) throw new ToolError("Could not search public RyhäMonoposto data.");
    const results = [
      ...(drivers.data ?? []).map(d => ({ type: "kuljettaja", name: d.name, flag: d.flag, number: d.number, url: `https://ryhamonoposto.lovable.app/kuljettajat/${d.slug}` })),
      ...(teams.data ?? []).map(t => ({ type: "tiimi", name: t.name, flag: t.flag, engine_supplier: t.engine_supplier, url: `https://ryhamonoposto.lovable.app/tiimit/${t.slug}` })),
      ...(races.data ?? []).map(r => ({ type: "kilpailu", name: r.name, flag: r.flag, race_date: r.race_date, round_number: r.round_number, url: `https://ryhamonoposto.lovable.app/kilpailut/${r.slug}` })),
      ...(news.data ?? []).map(n => ({ type: "uutinen", name: n.title, excerpt: n.excerpt, published_at: n.published_at, url: `https://ryhamonoposto.lovable.app/uutiset/${n.slug}` })),
    ];
    return { content: [{ type: "text", text: JSON.stringify(results) }], structuredContent: { results } };
  },
});