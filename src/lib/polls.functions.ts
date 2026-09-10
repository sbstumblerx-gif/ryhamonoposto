import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PollFeedItem = {
  id: string;
  question: string;
  is_admin: boolean;
  closes_at: string | null;
  created_at: string;
  created_by: string | null;
  author_name: string;
  total_votes: number;
  closed: boolean;
  options: { id: string; label: string; sort_order: number }[];
};

const isClosed = (closesAt: string | null) => !!closesAt && new Date(closesAt).getTime() <= Date.now();

// Public: the whole poll feed, newest first
export const listPolls = createServerFn({ method: "GET" }).handler(async (): Promise<PollFeedItem[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: polls, error } = await supabaseAdmin
    .from("polls")
    .select("id, question, is_admin, closes_at, created_at, created_by")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (polls ?? []).map(p => p.id);
  if (!ids.length) return [];

  const [{ data: options }, { data: votes }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from("poll_options").select("id, poll_id, label, sort_order").in("poll_id", ids),
    supabaseAdmin.from("poll_votes").select("poll_id").in("poll_id", ids),
    supabaseAdmin.from("profiles").select("id, display_name").in("id", (polls ?? []).map(p => p.created_by).filter(Boolean) as string[]),
  ]);

  const totals = new Map<string, number>();
  for (const v of votes ?? []) totals.set(v.poll_id, (totals.get(v.poll_id) ?? 0) + 1);
  const names = new Map((profiles ?? []).map(p => [p.id, p.display_name] as const));

  return (polls ?? []).map(p => ({
    id: p.id,
    question: p.question,
    is_admin: p.is_admin,
    closes_at: p.closes_at,
    created_at: p.created_at,
    created_by: p.created_by,
    author_name: p.is_admin ? "Ylläpito" : (names.get(p.created_by ?? "") ?? "Käyttäjä"),
    total_votes: totals.get(p.id) ?? 0,
    closed: isClosed(p.closes_at),
    options: (options ?? [])
      .filter(o => o.poll_id === p.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(o => ({ id: o.id, label: o.label, sort_order: o.sort_order })),
  }));
});

// Authenticated: which option I picked in each poll
export const myPollVotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("poll_votes")
      .select("poll_id, option_id")
      .eq("user_id", context.userId);
    if (error) throw error;
    return data ?? [];
  });

// Authenticated: per-option counts, only once the caller has voted (or the poll is closed)
export const pollResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ poll_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: poll } = await context.supabase
      .from("polls").select("closes_at").eq("id", data.poll_id).maybeSingle();
    const { data: mine } = await context.supabase
      .from("poll_votes").select("id").eq("poll_id", data.poll_id).eq("user_id", context.userId).maybeSingle();
    if (!mine && !isClosed(poll?.closes_at ?? null)) return null;
    const { data: rows, error } = await context.supabase
      .from("poll_votes").select("option_id").eq("poll_id", data.poll_id);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) counts[r.option_id] = (counts[r.option_id] ?? 0) + 1;
    return { counts, total: (rows ?? []).length };
  });

// Authenticated: cast a vote. Admin-made polls reward a free 1-card pack.
export const votePoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ poll_id: z.string().uuid(), option_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: poll } = await context.supabase
      .from("polls").select("id, is_admin, closes_at").eq("id", data.poll_id).maybeSingle();
    if (!poll) throw new Error("Äänestystä ei löydy");
    if (isClosed(poll.closes_at)) throw new Error("Äänestys on sulkeutunut");

    const { data: existing } = await context.supabase
      .from("poll_votes").select("id").eq("poll_id", data.poll_id).eq("user_id", context.userId).maybeSingle();
    if (existing) throw new Error("Olet jo äänestänyt tässä äänestyksessä");

    const { error } = await context.supabase
      .from("poll_votes")
      .insert({ poll_id: data.poll_id, option_id: data.option_id, user_id: context.userId });
    if (error) throw error;

    let rewarded = false;
    if (poll.is_admin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("card_packs").insert({
        user_id: context.userId, source: "poll", card_count: 1,
      });
      rewarded = true;
    }
    return { ok: true, rewarded };
  });

// Authenticated: create a poll (admin session marks it as a rewarded poll)
export const createPoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      question: z.string().min(1).max(300),
      options: z.array(z.string().min(1).max(200)).min(1).max(20),
      closes_at: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getAdminSession } = await import("./admin-session.server");
    const s = await getAdminSession();
    const isAdmin = !!s.data.admin;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: poll, error } = await supabaseAdmin
      .from("polls")
      .insert({
        question: data.question,
        created_by: context.userId,
        is_admin: isAdmin,
        closes_at: data.closes_at || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: oErr } = await supabaseAdmin.from("poll_options").insert(
      data.options.map((label, i) => ({ poll_id: poll.id, label, sort_order: i })),
    );
    if (oErr) throw oErr;
    return { id: poll.id, is_admin: isAdmin };
  });

// Authenticated: delete own poll; admins can delete any
export const deletePoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getAdminSession } = await import("./admin-session.server");
    const s = await getAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: poll } = await supabaseAdmin.from("polls").select("created_by").eq("id", data.id).maybeSingle();
    if (!poll) return { ok: true };
    if (!s.data.admin && poll.created_by !== context.userId) throw new Error("Ei oikeuksia");
    const { error } = await supabaseAdmin.from("polls").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
