import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { getStandings } from "@/lib/stats.functions";

export default defineTool({
  name: "get_team_standings",
  title: "Tiimien MM-tilanne",
  description: "Read current RyhäMonoposto team standings. Defaults to the explicitly active season, not all-time totals.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    try {
      const result = await getStandings({ data: {} });
      return {
        content: [{ type: "text", text: JSON.stringify({ activeSeason: result.activeSeason, standings: result.teams }) }],
        structuredContent: { activeSeason: result.activeSeason, standings: result.teams },
      };
    } catch {
      throw new ToolError("Could not read current team standings.");
    }
  },
});