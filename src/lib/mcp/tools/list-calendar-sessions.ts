import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_calendar_sessions", title: "Kalenterin sessiot",
  description: "Read scheduled all-day race sessions for a month, with race names and calendar links.",
  inputSchema: { year: z.number().int().min(2026).max(2040).describe("Calendar year (2026–2040)."), month: z.number().int().min(1).max(12).describe("Calendar month (1–12).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year, month }, ctx) => {
    const start = `${year}-${String(month).padStart(2,"0")}-01`;
    const end = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2,"0")}-01`;
    const { data, error } = await supabaseForUser(ctx).from("race_sessions").select("id, session_type, session_date, race:races(slug, name, flag, round_number)").gte("session_date", start).lt("session_date", end).order("session_date").limit(100);
    if (error) throw new ToolError("Could not read calendar sessions.");
    const sessions = (data ?? []).map(s => ({ id: s.id, type: s.session_type, date: s.session_date, race: s.race ? { slug: s.race.slug, name: s.race.name, flag: s.race.flag, round: s.race.round_number } : null, url: `https://ryhamonoposto.lovable.app/kalenteri?date=${s.session_date}` }));
    return { content: [{ type: "text", text: JSON.stringify(sessions) }], structuredContent: { sessions } };
  },
});