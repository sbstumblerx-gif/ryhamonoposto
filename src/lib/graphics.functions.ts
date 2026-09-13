import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildGraph, graphOptions, signature } from "./graphics.server";

export const graphConfigSchema = z.object({
  target: z.enum(["drivers", "teams"]),
  season: z.string().min(1).max(30),
  participants: z.array(z.string().min(1).max(100)).min(1).max(12),
  chartType: z.enum(["pie", "bar", "line"]),
  range: z.enum(["all", "last5", "last10", "last20"]),
  metric: z.enum(["points", "wins", "podiums", "dnf", "dsq", "dns", "poles", "starts", "championships"]),
});

export type GraphConfig = z.infer<typeof graphConfigSchema>;

export const getGraphOptions = createServerFn({ method: "GET" }).handler(async () => graphOptions());

export const createGraph = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => graphConfigSchema.parse(d))
  .handler(async ({ data, context }) => {
    const config = data as GraphConfig;
    const sig = signature(config);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: lookupError } = await supabaseAdmin.from("graphs").select("*").eq("signature", sig).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      const built = await buildGraph(config);
      const { data: refreshed, error: refreshError } = await supabaseAdmin.from("graphs").update({ title: built.title, subtitle: built.subtitle, data: built }).eq("id", existing.id).select("*").single();
      if (refreshError) throw refreshError;
      return { graph: refreshed, reused: true };
    }
    const built = await buildGraph(config);
    const { data: graph, error } = await supabaseAdmin.from("graphs").insert({ signature: sig, owner_id: context.userId, config, title: built.title, subtitle: built.subtitle, data: built }).select("*").single();
    if (error) {
      if (error.code === "23505") {
        const { data: raced } = await supabaseAdmin.from("graphs").select("*").eq("signature", sig).single();
        if (raced) return { graph: raced, reused: true };
      }
      throw error;
    }
    return { graph, reused: false };
  });

export const getGraph = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: graph, error } = await supabaseAdmin.from("graphs").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!graph) throw new Error("Grafiikkaa ei löytynyt");
    const config = graphConfigSchema.parse(graph.config);
    const built = await buildGraph(config);
    const { data: refreshed, error: refreshError } = await supabaseAdmin.from("graphs").update({ title: built.title, subtitle: built.subtitle, data: built }).eq("id", graph.id).select("*").single();
    if (refreshError) throw refreshError;
    return refreshed;
  });

export const listMyGraphs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("graphs").select("id, title, subtitle, config, created_at").eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const shareGraphToClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ graph_id: z.string().uuid(), club_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: graph, error } = await supabaseAdmin.from("graphs").select("id, title, subtitle").eq("id", data.graph_id).maybeSingle();
    if (error) throw error;
    if (!graph) throw new Error("Grafiikkaa ei löytynyt");
    const { postMessage } = await import("./clubs.server");
    await postMessage(context.userId, data.club_id, `📊 ${graph.title} — ${graph.subtitle} → /graphics/${graph.id}`);
    return { ok: true };
  });
