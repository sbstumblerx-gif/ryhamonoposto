import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildGraph, graphOptions, signature } from "./graphics.server";

export const graphConfigSchema = z.object({
  target: z.enum(["drivers", "teams"]), season: z.string().min(1).max(30), participants: z.array(z.string().min(1).max(100)).min(1).max(12), chartType: z.enum(["pie", "bar", "line", "stage"]), range: z.enum(["all", "last5", "last10", "last20"]),
  metric: z.enum(["points", "wins", "podiums", "dnf", "dsq", "dns", "poles", "starts", "championships", "driverOfTheDay", "fastestLaps", "sprintPoints", "sprintWins", "sprintPodiums", "sprintPoles", "sprintFastestLaps", "sprintDnf", "sprintDsq", "sprintDns", "sprintStarts"]),
});
export type GraphConfig = z.infer<typeof graphConfigSchema>;
export const getGraphOptions = createServerFn({ method: "GET" }).handler(async () => graphOptions());
export const createGraph = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => graphConfigSchema.parse(d)).handler(async ({ data, context }) => { const config = data as GraphConfig; const sig = signature(config); const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { data: existing, error: lookupError } = await supabaseAdmin.from("graphs").select("*").eq("signature", sig).maybeSingle(); if (lookupError) throw lookupError; if (existing) { const built = await buildGraph(config); const { data: refreshed, error: refreshError } = await supabaseAdmin.from("graphs").update({ title: built.title, subtitle: built.subtitle, data: built }).eq("id", existing.id).select("*").single(); if (refreshError) throw refreshError; return { graph: refreshed, reused: true }; } const built = await buildGraph(config); const { data: graph, error } = await supabaseAdmin.from("graphs").insert({ signature: sig, owner_id: context.userId, config, title: built.title, subtitle: built.subtitle, data: built }).select("*").single(); if (error) { if (error.code === "23505") { const { data: raced } = await supabaseAdmin.from("graphs").select("*").eq("signature", sig).single(); if (raced) return { graph: raced, reused: true }; } throw error; } return { graph, reused: false }; });
export const getGraph = createServerFn({ method: "GET" }).inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d)).handler(async ({ data }) => { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { data: graph, error } = await supabaseAdmin.from("graphs").select("*").eq("id", data.id).maybeSingle(); if (error) throw error; if (!graph) throw new Error("Grafiikkaa ei löytynyt"); const config = graphConfigSchema.parse(graph.config); const built = await buildGraph(config); const { data: refreshed, error: refreshError } = await supabaseAdmin.from("graphs").update({ title: built.title, subtitle: built.subtitle, data: built }).eq("id", graph.id).select("*").single(); if (refreshError) throw refreshError; return refreshed; });
export const listMyGraphs = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { data, error } = await supabaseAdmin.from("graphs").select("id, title, subtitle, custom_title, folder_id, config, created_at").eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(50); if (error) throw error; return data ?? []; });
export const shareGraphToClub = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ graph_id: z.string().uuid(), club_id: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { data: graph, error } = await supabaseAdmin.from("graphs").select("id, title, subtitle").eq("id", data.graph_id).maybeSingle(); if (error) throw error; if (!graph) throw new Error("Grafiikkaa ei löytynyt"); const { postMessage } = await import("./clubs.server"); await postMessage(context.userId, data.club_id, `📊 ${graph.title} — ${graph.subtitle} → /graphics/${graph.id}`); return { ok: true }; });

export const renameGraph = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ graph_id: z.string().uuid(), title: z.string().trim().min(1).max(120) }).parse(d)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin.from("graphs").update({ custom_title: data.title }).eq("id", data.graph_id).eq("owner_id", context.userId).select("id, custom_title, title").maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Et voi nimetä tätä grafiikkaa.");
  return row;
});

export const listGraphFolders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("graph_folders").select("id, name, parent_id, created_at").eq("owner_id", context.userId).order("name");
  if (error) throw error;
  return data ?? [];
});

export const createGraphFolder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(80), parent_id: z.string().uuid().nullable().optional() }).parse(d)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (data.parent_id) {
    const { data: parent, error: parentError } = await supabaseAdmin.from("graph_folders").select("id").eq("id", data.parent_id).eq("owner_id", context.userId).maybeSingle();
    if (parentError) throw parentError;
    if (!parent) throw new Error("Yläkansiota ei löytynyt.");
  }
  const { data: folder, error } = await supabaseAdmin.from("graph_folders").insert({ name: data.name, parent_id: data.parent_id ?? null, owner_id: context.userId }).select("id, name, parent_id, created_at").single();
  if (error) throw error;
  return folder;
});

export const moveGraphToFolder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ graph_id: z.string().uuid(), folder_id: z.string().uuid().nullable() }).parse(d)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: graph, error: graphError } = await supabaseAdmin.from("graphs").select("id").eq("id", data.graph_id).eq("owner_id", context.userId).maybeSingle();
  if (graphError) throw graphError;
  if (!graph) throw new Error("Grafiikkaa ei löytynyt omista grafiikoistasi.");
  if (data.folder_id) {
    const { data: folder, error: folderError } = await supabaseAdmin.from("graph_folders").select("id").eq("id", data.folder_id).eq("owner_id", context.userId).maybeSingle();
    if (folderError) throw folderError;
    if (!folder) throw new Error("Kansiota ei löytynyt omista kansioistasi.");
  }
  const { error } = await supabaseAdmin.from("graphs").update({ folder_id: data.folder_id }).eq("id", data.graph_id).eq("owner_id", context.userId);
  if (error) throw error;
  return { ok: true };
});
