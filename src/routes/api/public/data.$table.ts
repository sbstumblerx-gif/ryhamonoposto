import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_TABLES, readPublicTable, type PublicTable } from "@/lib/public-data.server";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

export const Route = createFileRoute("/api/public/data/$table")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ params, request }) => {
        if (params.table === "index") {
          return Response.json({ tables: PUBLIC_TABLES.map(t => `https://ryhamonoposto.lovable.app/api/public/data/${t}`) }, { headers: cors });
        }
        if (!(PUBLIC_TABLES as readonly string[]).includes(params.table)) {
          return Response.json({ error: "Unknown table", tables: PUBLIC_TABLES }, { status: 404, headers: cors });
        }
        const q = new URL(request.url).searchParams;
        const limit = Math.min(Math.max(Number(q.get("limit")) || 200, 1), 1000);
        const offset = Math.min(Math.max(Number(q.get("offset")) || 0, 0), 100000);
        try {
          const rows = await readPublicTable(params.table as PublicTable, limit, offset);
          return Response.json({ table: params.table, limit, offset, rows }, { headers: { ...cors, "Cache-Control": "public, max-age=60" } });
        } catch {
          return Response.json({ error: "Read failed" }, { status: 500, headers: cors });
        }
      },
    },
  },
});
