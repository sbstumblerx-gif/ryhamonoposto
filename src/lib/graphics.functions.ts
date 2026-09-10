import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const graphConfigSchema = z.object({
  target: z.enum(["drivers", "teams"]),
  season: z.string().min(1).max(30),
  participants: z.array(z.string().min(1).max(100)).min(1).max(12),
  chartType: z.enum(["pie", "bar", "line"]),
  range: z.enum(["all", "last5", "last10", "last20"]),
  metric: z.enum(["points", "wins", "podiums", "dnf", "dsq", "dns", "poles", "starts", "championships"]),
});

export type GraphConfig = z.infer<typeof graphConfigSchema>;

export const getGraphOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: drivers, error: de }, { data: teams, error: te }, { data: races, error: re }] = await Promise.all([
    supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, team_slug"),
    supabaseAdmin.from("teams").select("slug, name, color_key"),
    supabaseAdmin.from("races").select("name"),
  ]);
  if (de) throw de; if (te) throw te; if (re) throw re;
  const years = [...new Set((races ?? []).map(r => { const m = /\\b(20\\d{2})\\b/.exec(r.name ?? ""); return m ? Number(m[1]) : null; }).filter((x): x is number => x != null))].sort((a, b) => b - a);
  const colors: Record<string, string> = { red: "#ef4444", green: "#22c55e", yellow: "#eab308", cyan: "#06b6d4", blue: "#3b82f6", gray: "#9ca3af", darkred: "#991b1b", darkblue: "#1e3a8a", darkgreen: "#166534" };
  return {
    drivers: (drivers ?? []).map(d => ({ slug: d.slug, name: d.name, flag: d.flag, team_slug: d.current_team_slug ?? d.team_slug })),
    teams: (teams ?? []).map(t => ({ slug: t.slug, name: t.name, color: colors[t.color_key] ?? "#9ca3af" })),
    seasons: years,
  };
});
