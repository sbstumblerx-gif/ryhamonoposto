import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Top3 = z.tuple([z.string(), z.string(), z.string()]);

function scorePrediction(pred: string[], truth: string[]): number {
  let s = 0;
  for (let i = 0; i < 3; i++) {
    if (pred[i] && truth[i] && pred[i] === truth[i]) s += 3;
    else if (pred[i] && truth.includes(pred[i])) s += 1;
  }
  return s;
}

// Public: list all sessions
export const listSessions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("prediction_sessions")
    .select("id, name, status, result_top3, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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

// Authenticated: submit/update own prediction (only allowed on upcoming)
export const submitPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ session_id: z.string().uuid(), top3: Top3 }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("predictions")
      .upsert({ session_id: data.session_id, user_id: context.userId, top3: data.top3, points: 0 }, { onConflict: "session_id,user_id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

// Authenticated: my total points
export const myTotalPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("predictions")
      .select("points")
      .eq("user_id", context.userId);
    if (error) throw error;
    return (data ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
  });

// Public: leaderboard top 50 all-time
export const leaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("predictions")
    .select("user_id, points");
  if (error) throw error;
  const totals = new Map<string, number>();
  for (const r of data ?? []) totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + (r.points ?? 0));
  const rows = [...totals.entries()].map(([user_id, points]) => ({ user_id, points }));
  rows.sort((a, b) => b.points - a.points);
  const userIds = rows.slice(0, 50).map(r => r.user_id);
  let profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length) {
    const { data: p } = await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
    for (const it of p ?? []) profiles[it.id] = { display_name: it.display_name, avatar_url: it.avatar_url };
  }
  return rows.map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    points: r.points,
    display_name: profiles[r.user_id]?.display_name ?? "Vierailija",
    avatar_url: profiles[r.user_id]?.avatar_url ?? null,
  }));
});

// Authenticated: my rank across everyone
export const myRank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("predictions").select("user_id, points");
    if (error) throw error;
    const totals = new Map<string, number>();
    for (const r of data ?? []) totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + (r.points ?? 0));
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

// Admin: finalize session with top3, computes points for all predictions
export const adminFinalizeSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), top3: Top3 }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // mark session as past
    const { error: upErr } = await supabaseAdmin
      .from("prediction_sessions")
      .update({ status: "past", result_top3: data.top3 })
      .eq("id", data.id);
    if (upErr) throw upErr;
    // recompute all predictions
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
