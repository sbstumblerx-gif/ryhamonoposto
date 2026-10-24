import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { getStandings } from "@/lib/stats.functions";

export default defineTool({
  name: "get_standings",
  title: "Kuljettajien MM-tilanne",
  description: "Read current RyhäMonoposto driver standings. Defaults to the explicitly active season, not all-time totals.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    try {
      const result = await getStandings({ data: {} });
      return {
        content: [{ type: "text", text: JSON.stringify({ activeSeason: result.activeSeason, standings: result.drivers }) }],
        structuredContent: { activeSeason: result.activeSeason, standings: result.drivers },
      };
    } catch {
      throw new ToolError("Could not read current driver standings.");
    }
  },
});