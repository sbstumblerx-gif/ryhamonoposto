import { defineTool, ToolError } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_latest_race",
  title: "Viimeisin kilpailu",
  description: "Read the most recently updated public race result or qualifying report.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("races")
      .select("slug, name, flag, race_date, round_number, qualifying_content, race_content, qualifying_updated_at, race_updated_at, updated_at")
      .order("updated_at", { ascending: false }).limit(50);
    if (error) throw new ToolError("Could not read the latest race.");
    const reports = (data ?? []).flatMap(r => [
      { slug: r.slug, name: r.name, flag: r.flag, race_date: r.race_date, round_number: r.round_number, session: "Aika-ajot", content: r.qualifying_content ?? "", updated_at: r.qualifying_updated_at ?? r.updated_at },
      { slug: r.slug, name: r.name, flag: r.flag, race_date: r.race_date, round_number: r.round_number, session: "Kilpailu", content: r.race_content ?? "", updated_at: r.race_updated_at ?? r.updated_at },
    ]).filter(r => r.content.trim().length > 0).sort((a,b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
    const latest = reports[0] ?? null;
    const result = latest ? { ...latest, url: `https://ryhamonoposto.lovable.app/kilpailut/${latest.slug}` } : null;
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { race: result } };
  },
});