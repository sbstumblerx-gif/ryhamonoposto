// Server-only club logic. Every function receives the authenticated caller's id and
// verifies membership / role before touching data with the service-role client.
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_MEMBERS = 50;

type Admin = SupabaseClient<any, any, any>;

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

export type Role = "owner" | "moderator" | "member";

async function membership(db: Admin, clubId: string, userId: string): Promise<Role | null> {
  const { data } = await db.from("club_members").select("role").eq("club_id", clubId).eq("user_id", userId).maybeSingle();
  return (data?.role as Role | undefined) ?? null;
}

async function requireRole(db: Admin, clubId: string, userId: string, roles: Role[]): Promise<Role> {
  const r = await membership(db, clubId, userId);
  if (!r || !roles.includes(r)) throw new Error("Ei oikeuksia");
  return r;
}

async function profileMap(db: Admin, ids: string[]) {
  const out = new Map<string, { display_name: string; avatar_url: string | null }>();
  if (!ids.length) return out;
  const { data } = await db.from("profiles").select("id, display_name, avatar_url").in("id", ids);
  for (const p of data ?? []) out.set(p.id, { display_name: p.display_name ?? "Vierailija", avatar_url: p.avatar_url });
  return out;
}

async function notify(db: Admin, rows: { user_id: string; type: string; title: string; body?: string; club_id?: string | null }[]) {
  if (!rows.length) return;
  await db.from("notifications").insert(rows.map(r => ({ ...r, body: r.body ?? "", club_id: r.club_id ?? null })));
}

async function uniqueCode(db: Admin): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await db.from("clubs").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Koodin luonti epäonnistui");
}

export async function createClub(userId: string, input: { name: string; description: string; visibility: "public" | "code"; require_approval: boolean }) {
  const db = await admin();
  const code = await uniqueCode(db);
  const { data: club, error } = await db.from("clubs").insert({
    name: input.name, description: input.description, visibility: input.visibility,
    require_approval: input.require_approval, owner_id: userId, code,
  }).select().single();
  if (error) throw error;
  await db.from("club_members").insert({ club_id: club.id, user_id: userId, role: "owner" });
  return club;
}

export async function listMyClubs(userId: string) {
  const db = await admin();
  const { data: mem } = await db.from("club_members").select("club_id, role").eq("user_id", userId);
  const ids = (mem ?? []).map(m => m.club_id);
  if (!ids.length) return [];
  const { data: clubs } = await db.from("clubs").select("id, name, description, code, visibility, require_approval").in("id", ids);
  const counts = await memberCounts(db, ids);
  const roleBy = new Map((mem ?? []).map(m => [m.club_id, m.role as Role]));
  return (clubs ?? []).map(c => ({ ...c, role: roleBy.get(c.id) ?? "member", members: counts.get(c.id) ?? 0 }));
}

async function memberCounts(db: Admin, ids: string[]) {
  const { data } = await db.from("club_members").select("club_id").in("club_id", ids);
  const m = new Map<string, number>();
  for (const r of data ?? []) m.set(r.club_id, (m.get(r.club_id) ?? 0) + 1);
  return m;
}

export async function searchPublicClubs(q: string) {
  const db = await admin();
  let query = db.from("clubs").select("id, name, description, require_approval").eq("visibility", "public").limit(30);
  if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
  const { data } = await query;
  const ids = (data ?? []).map(c => c.id);
  const counts = await memberCounts(db, ids);
  return (data ?? []).map(c => ({ ...c, members: counts.get(c.id) ?? 0 }));
}

async function joinClub(db: Admin, club: any, userId: string) {
  const existing = await membership(db, club.id, userId);
  if (existing) return { status: "member" as const, club_id: club.id };
  const counts = await memberCounts(db, [club.id]);
  if ((counts.get(club.id) ?? 0) >= MAX_MEMBERS) throw new Error("Klubi on täynnä (50 jäsentä)");
  if (club.require_approval) {
    await db.from("club_join_requests").upsert({ club_id: club.id, user_id: userId, status: "pending" }, { onConflict: "club_id,user_id" });
    const { data: staff } = await db.from("club_members").select("user_id").eq("club_id", club.id).in("role", ["owner", "moderator"]);
    await notify(db, (staff ?? []).map(s => ({
      user_id: s.user_id, type: "join_request", title: "Uusi liittymispyyntö", body: `Klubiin ${club.name} on uusi liittymispyyntö.`, club_id: club.id,
    })));
    return { status: "pending" as const, club_id: club.id };
  }
  await db.from("club_members").insert({ club_id: club.id, user_id: userId, role: "member" });
  return { status: "member" as const, club_id: club.id };
}

export async function joinByCode(userId: string, code: string) {
  const db = await admin();
  const { data: club } = await db.from("clubs").select("*").eq("code", code).maybeSingle();
  if (!club) throw new Error("Klubia ei löytynyt tällä koodilla");
  return joinClub(db, club, userId);
}

export async function joinPublic(userId: string, clubId: string) {
  const db = await admin();
  const { data: club } = await db.from("clubs").select("*").eq("id", clubId).maybeSingle();
  if (!club || club.visibility !== "public") throw new Error("Klubia ei löytynyt");
  return joinClub(db, club, userId);
}

export async function getClub(userId: string, clubId: string) {
  const db = await admin();
  const role = await membership(db, clubId, userId);
  if (!role) throw new Error("Et ole tämän klubin jäsen");
  const { data: club } = await db.from("clubs").select("*").eq("id", clubId).maybeSingle();
  if (!club) throw new Error("Klubia ei löytynyt");
  const { data: members } = await db.from("club_members").select("user_id, role, created_at").eq("club_id", clubId).order("created_at");
  const profiles = await profileMap(db, (members ?? []).map(m => m.user_id));
  let requests: { user_id: string; display_name: string }[] = [];
  if (role === "owner" || role === "moderator") {
    const { data: reqs } = await db.from("club_join_requests").select("user_id").eq("club_id", clubId).eq("status", "pending");
    const rp = await profileMap(db, (reqs ?? []).map(r => r.user_id));
    requests = (reqs ?? []).map(r => ({ user_id: r.user_id, display_name: rp.get(r.user_id)?.display_name ?? "Vierailija" }));
  }
  return {
    club: { ...club, code: role === "owner" || role === "moderator" ? club.code : club.code },
    myRole: role,
    members: (members ?? []).map(m => ({
      user_id: m.user_id, role: m.role as Role,
      display_name: profiles.get(m.user_id)?.display_name ?? "Vierailija",
      avatar_url: profiles.get(m.user_id)?.avatar_url ?? null,
    })),
    requests,
  };
}

export async function updateClub(userId: string, clubId: string, patch: { name?: string; description?: string; visibility?: "public" | "code"; require_approval?: boolean }) {
  const db = await admin();
  await requireRole(db, clubId, userId, ["owner"]);
  const { error } = await db.from("clubs").update(patch).eq("id", clubId);
  if (error) throw error;
  return { ok: true };
}

export async function listMessages(userId: string, clubId: string) {
  const db = await admin();
  await requireRole(db, clubId, userId, ["owner", "moderator", "member"]);
  const { data: msgs } = await db.from("club_messages").select("id, user_id, body, created_at, media_url, media_type, media_duration, is_ai").eq("club_id", clubId).order("created_at", { ascending: true }).limit(300);
  const ids = [...new Set((msgs ?? []).map(m => m.user_id))];
  const profiles = await profileMap(db, ids);
  const { data: reactions } = await db.from("club_message_reactions").select("message_id, emoji, user_id").in("message_id", (msgs ?? []).map(m => m.id));
  const byMsg = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
  for (const r of reactions ?? []) {
    const arr = byMsg.get(r.message_id) ?? [];
    const hit = arr.find(a => a.emoji === r.emoji);
    if (hit) { hit.count++; hit.mine = hit.mine || r.user_id === userId; }
    else arr.push({ emoji: r.emoji, count: 1, mine: r.user_id === userId });
    byMsg.set(r.message_id, arr);
  }
  return (msgs ?? []).map(m => ({
    ...m,
    display_name: m.is_ai ? "RyhäAI" : (profiles.get(m.user_id)?.display_name ?? "Vierailija"),
    avatar_url: m.is_ai ? "emoji:🤖" : (profiles.get(m.user_id)?.avatar_url ?? null),
    reactions: byMsg.get(m.id) ?? [],
  }));
}

export async function postMessage(
  userId: string,
  clubId: string,
  body: string,
  media?: { url: string; type: "image" | "audio" | "video"; duration?: number | null },
) {
  const db = await admin();
  await requireRole(db, clubId, userId, ["owner", "moderator", "member"]);
  const { data: msg, error } = await db.from("club_messages").insert({
    club_id: clubId, user_id: userId, body,
    media_url: media?.url ?? null,
    media_type: media?.type ?? null,
    media_duration: media?.duration ?? null,
  }).select().single();
  if (error) throw error;

  // @mentions -> notifications for tagged members
  const { data: members } = await db.from("club_members").select("user_id").eq("club_id", clubId);
  const profiles = await profileMap(db, (members ?? []).map(m => m.user_id));
  const { data: club } = await db.from("clubs").select("name").eq("id", clubId).maybeSingle();
  const me = profiles.get(userId)?.display_name ?? "Joku";
  const lower = body.toLowerCase();
  const targets: string[] = [];
  for (const [id, p] of profiles) {
    if (id === userId) continue;
    if (lower.includes(`@${p.display_name.toLowerCase()}`)) targets.push(id);
  }
  await notify(db, targets.map(t => ({
    user_id: t, type: "mention", title: `${me} mainitsi sinut`, body: `${club?.name ?? "Klubi"}: ${body.slice(0, 120)}`, club_id: clubId,
  })));
  return msg;
}

export async function deleteMessage(userId: string, messageId: string) {
  const db = await admin();
  const { data: msg } = await db.from("club_messages").select("id, club_id, user_id, body").eq("id", messageId).maybeSingle();
  if (!msg) return { ok: true };
  const role = await membership(db, msg.club_id, userId);
  const allowed = role === "owner" || role === "moderator" || msg.user_id === userId;
  if (!allowed) throw new Error("Ei oikeuksia");
  await db.from("club_messages").delete().eq("id", messageId);
  if (msg.user_id !== userId) {
    const { data: club } = await db.from("clubs").select("name").eq("id", msg.club_id).maybeSingle();
    await notify(db, [{ user_id: msg.user_id, type: "message_removed", title: "Viestisi poistettiin", body: `Klubissa ${club?.name ?? ""}: "${msg.body.slice(0, 80)}"`, club_id: msg.club_id }]);
  }
  return { ok: true };
}

export async function toggleReaction(userId: string, messageId: string, emoji: string) {
  const db = await admin();
  const { data: msg } = await db.from("club_messages").select("club_id").eq("id", messageId).maybeSingle();
  if (!msg) throw new Error("Viestiä ei löydy");
  await requireRole(db, msg.club_id, userId, ["owner", "moderator", "member"]);
  const { data: existing } = await db.from("club_message_reactions").select("id").eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji).maybeSingle();
  if (existing) await db.from("club_message_reactions").delete().eq("id", existing.id);
  else await db.from("club_message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
  return { ok: true };
}

export async function setMemberRole(userId: string, clubId: string, targetId: string, role: "moderator" | "member") {
  const db = await admin();
  await requireRole(db, clubId, userId, ["owner"]);
  const { data: club } = await db.from("clubs").select("owner_id, name").eq("id", clubId).maybeSingle();
  if (club?.owner_id === targetId) throw new Error("Omistajan roolia ei voi muuttaa");
  await db.from("club_members").update({ role }).eq("club_id", clubId).eq("user_id", targetId);
  await notify(db, [{ user_id: targetId, type: "role", title: role === "moderator" ? "Sinusta tuli moderaattori" : "Moderaattorioikeutesi poistettiin", body: club?.name ?? "", club_id: clubId }]);
  return { ok: true };
}

export async function removeMember(userId: string, clubId: string, targetId: string) {
  const db = await admin();
  const role = await requireRole(db, clubId, userId, ["owner", "moderator"]);
  const { data: club } = await db.from("clubs").select("owner_id, name").eq("id", clubId).maybeSingle();
  if (club?.owner_id === targetId) throw new Error("Omistajaa ei voi poistaa");
  const targetRole = await membership(db, clubId, targetId);
  if (role === "moderator" && targetRole === "moderator") throw new Error("Ei oikeuksia");
  await db.from("club_members").delete().eq("club_id", clubId).eq("user_id", targetId);
  await notify(db, [{ user_id: targetId, type: "removed", title: "Sinut poistettiin klubista", body: club?.name ?? "", club_id: clubId }]);
  return { ok: true };
}

export async function leaveClub(userId: string, clubId: string) {
  const db = await admin();
  const { data: club } = await db.from("clubs").select("owner_id").eq("id", clubId).maybeSingle();
  if (club?.owner_id === userId) throw new Error("Omistaja ei voi poistua klubista");
  await db.from("club_members").delete().eq("club_id", clubId).eq("user_id", userId);
  return { ok: true };
}

export async function handleJoinRequest(userId: string, clubId: string, targetId: string, approve: boolean) {
  const db = await admin();
  await requireRole(db, clubId, userId, ["owner", "moderator"]);
  const { data: club } = await db.from("clubs").select("name").eq("id", clubId).maybeSingle();
  if (approve) {
    const counts = await memberCounts(db, [clubId]);
    if ((counts.get(clubId) ?? 0) >= MAX_MEMBERS) throw new Error("Klubi on täynnä (50 jäsentä)");
    await db.from("club_members").upsert({ club_id: clubId, user_id: targetId, role: "member" }, { onConflict: "club_id,user_id" });
  }
  await db.from("club_join_requests").delete().eq("club_id", clubId).eq("user_id", targetId);
  await notify(db, [{ user_id: targetId, type: "join_result", title: approve ? "Liittymispyyntö hyväksyttiin" : "Liittymispyyntö hylättiin", body: club?.name ?? "", club_id: clubId }]);
  return { ok: true };
}

export async function clubLeaderboard(userId: string, clubId: string) {
  const db = await admin();
  await requireRole(db, clubId, userId, ["owner", "moderator", "member"]);
  const { data: members } = await db.from("club_members").select("user_id").eq("club_id", clubId);
  const ids = (members ?? []).map(m => m.user_id);
  if (!ids.length) return [];
  const { data: preds } = await db.from("predictions").select("user_id, points").in("user_id", ids);
  const totals = new Map<string, number>(ids.map(i => [i, 0]));
  for (const p of preds ?? []) totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points ?? 0));
  const profiles = await profileMap(db, ids);
  return [...totals.entries()]
    .map(([user_id, points]) => ({ user_id, points, display_name: profiles.get(user_id)?.display_name ?? "Vierailija" }))
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ rank: i + 1, ...r }));
}

// ============ Notifications ============

export async function listNotifications(userId: string) {
  const db = await admin();
  const { data } = await db.from("notifications").select("id, type, title, body, club_id, read, created_at")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}

export async function unreadCount(userId: string) {
  const db = await admin();
  const { count } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false);
  return count ?? 0;
}

export async function markAllRead(userId: string) {
  const db = await admin();
  await db.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  return { ok: true };
}

// ============ Invite links ============

export async function previewClubByCode(code: string) {
  const db = await admin();
  const { data: club } = await db.from("clubs").select("id, name, description, code, visibility, require_approval").eq("code", code).maybeSingle();
  if (!club) throw new Error("Klubia ei löytynyt tällä kutsulinkillä");
  const counts = await memberCounts(db, [club.id]);
  return {
    id: club.id,
    name: club.name,
    description: club.description,
    code: club.code,
    require_approval: club.require_approval,
    members: counts.get(club.id) ?? 0,
    max_members: MAX_MEMBERS,
  };
}

export async function myMembership(userId: string, clubId: string) {
  const db = await admin();
  const role = await membership(db, clubId, userId);
  const { data: req } = await db.from("club_join_requests").select("status").eq("club_id", clubId).eq("user_id", userId).maybeSingle();
  return { role, pending: req?.status === "pending" };
}
