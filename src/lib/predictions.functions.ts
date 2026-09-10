import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scorePrediction, yearStartIso } from "./predictions-scoring";

const Top3 = z.tuple([z.string(), z.string(), z.string()]);
const Scope = z.object({ scope: z.enum(["all", "year"]).default("all") });

// A scheduled deadline closes betting on its own, without an admin click.
const deadlinePassed = (closesAt: string | null | undefined) =>
  !!closesAt && new Date(closesAt).getTime() <= Date.now();

// Public: list all sessions
export const listSessions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("prediction_sessions")
    .select("id, name, status, result_top3, closes_at, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(s => ({
    ...s,
    status: s.status === "upcoming" && deadlinePassed(s.closes_at) ? "closed" : s.status,
    auto_closed: s.status === "upcoming" && deadlinePassed(s.closes_at),
  }));
});

// Authenticated: list own predictions map (session_id -> {top3, points})
export const listMyPredictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("predictions")
      .select("session_id, top3, points")
      .eq("user_id", context.userId);
    if (error) throw error;
    return data ?? [];
  });

// Authenticated: submit/update own prediction (only allowed while the session is open)
export const submitPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ session_id: z.string().uuid(), top3: Top3 }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session } = await context.supabase
      .from("prediction_sessions").select("status, closes_at").eq("id", data.session_id).maybeSingle();
    if (!session || session.status !== "upcoming" || deadlinePassed(session.closes_at)) throw new Error("Veikkaus on suljettu");
    const { data: row, error } = await context.supabase
      .from("predictions")
      .upsert({ session_id: data.session_id, user_id: context.userId, top3: data.top3, points: 0 }, { onConflict: "session_id,user_id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

// Authenticated: my total points (all time or current year)
export const myTotalPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Scope.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("predictions").select("points").eq("user_id", context.userId);
    if (data.scope === "year") q = q.gte("created_at", yearStartIso());
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
  });

// Public: leaderboard top 50
export const leaderboard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Scope.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("predictions").select("user_id, points");
    if (data.scope === "year") q = q.gte("created_at", yearStartIso());
    const { data: rows0, error } = await q;
    if (error) throw error;
    const totals = new Map<string, number>();
    for (const r of rows0 ?? []) totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + (r.points ?? 0));
    const rows = [...totals.entries()].map(([user_id, points]) => ({ user_id, points }));
    rows.sort((a, b) => b.points - a.points);
    const top = rows.slice(0, 50);
    const userIds = top.map(r => r.user_id);
    const profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: p } = await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
      for (const it of p ?? []) profiles[it.id] = { display_name: it.display_name, avatar_url: it.avatar_url };
    }
    return top.map((r, i) => ({
      rank: i + 1,
      user_id: r.user_id,
      points: r.points,
      display_name: profiles[r.user_id]?.display_name ?? "Vierailija",
      avatar_url: profiles[r.user_id]?.avatar_url ?? null,
    }));
  });

// Authenticated: my rank across everyone
export const myRank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Scope.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("predictions").select("user_id, points, created_at");
    if (data.scope === "year") q = q.gte("created_at", yearStartIso());
    const { data: rows, error } = await q;
    if (error) throw error;
    const totals = new Map<string, number>();
    for (const r of rows ?? []) totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + (r.points ?? 0));
    const arr = [...totals.entries()].map(([user_id, points]) => ({ user_id, points })).sort((a, b) => b.points - a.points);
    const idx = arr.findIndex(r => r.user_id === context.userId);
    if (idx < 0) return { rank: null, points: 0 };
    return { rank: idx + 1, points: arr[idx].points };
  });

// Admin: create a session
export const adminCreateSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("prediction_sessions")
      .insert({ name: data.name })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

// Admin: delete
export const adminDeleteSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("prediction_sessions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Admin: close betting without publishing results yet
export const adminSetSessionStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["upcoming", "closed"]) }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("prediction_sessions").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Admin: finalize session with top3, computes points for all predictions
export const adminFinalizeSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), top3: Top3 }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("prediction_sessions")
      .update({ status: "past", result_top3: data.top3 })
      .eq("id", data.id);
    if (upErr) throw upErr;
    const { data: preds, error: pErr } = await supabaseAdmin
      .from("predictions")
      .select("id, top3")
      .eq("session_id", data.id);
    if (pErr) throw pErr;
    for (const p of preds ?? []) {
      const top3 = Array.isArray(p.top3) ? (p.top3 as unknown as string[]) : [];
      const pts = scorePrediction(top3, data.top3);
      await supabaseAdmin.from("predictions").update({ points: pts }).eq("id", p.id);
    }
    // Every participant earns a card pack sized by their score.
    await (await import("./cards.server")).grantPacksForSession(data.id);
    return { ok: true, updated: preds?.length ?? 0 };
  });

// Admin: reopen (undo finalize)
export const adminReopenSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("prediction_sessions")
      .update({ status: "upcoming", result_top3: null })
      .eq("id", data.id);
    if (error) throw error;
    await supabaseAdmin.from("predictions").update({ points: 0 }).eq("session_id", data.id);
    return { ok: true };
  });
