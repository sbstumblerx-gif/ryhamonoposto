import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_TABLES, readPublicTable } from "@/lib/public-data.server";

export default defineTool({
  name: "read_public_data",
  title: "Julkinen data",
  description: `Read-only access to any public RyhäMonoposto dataset (all text and public content). Tables: ${PUBLIC_TABLES.join(", ")}. Use offset to page through rows.`,
  inputSchema: {
    table: z.enum(PUBLIC_TABLES).describe("Public dataset to read."),
    limit: z.number().int().min(1).max(500).default(200),
    offset: z.number().int().min(0).max(100000).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ table, limit, offset }) => {
    try {
      const rows = await readPublicTable(table, limit, offset);
      return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { table, rows } };
    } catch {
      throw new ToolError(`Could not read ${table}.`);
    }
  },
});
