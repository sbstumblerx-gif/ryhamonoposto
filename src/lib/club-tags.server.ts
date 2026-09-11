import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, any, any>;

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, "").toUpperCase();
}

function validateTag(tag: string) {
  const value = normalizeTag(tag);
  if (value.length < 2 || value.length > 5) throw new Error("Klubitunnisteen pitää olla 2–5 merkkiä pitkä");
  if (!/^[\p{L}\p{N}_-]{2,5}$/u.test(value)) throw new Error("Klubitunnisteessa saa olla vain kirjaimia, numeroita, _ tai -");
  return value;
}

export async function updateClubTag(userId: string, clubId: string, input: { tag?: string | null; emoji?: string | null; enabled?: boolean }) {
  const db = await admin();
  const { data: club } = await db.from("clubs").select("owner_id").eq("id", clubId).maybeSingle();
  if (!club || club.owner_id !== userId) throw new Error("Vain klubin omistaja voi hallita klubitunnistetta");

  const tag = input.tag === null || input.tag === undefined || !input.tag.trim() ? null : validateTag(input.tag);
  const emoji = input.emoji?.trim() || null;
  const enabled = input.enabled ?? !!tag;
  if (enabled && !tag) throw new Error("Tunniste täytyy määrittää ennen käyttöönottoa");

  if (enabled && tag) {
    const { data: clash } = await db.from("clubs").select("id").ilike("tag", tag).eq("tag_enabled", true).neq("id", clubId).maybeSingle();
    if (clash) throw new Error("Tämä klubitunniste on jo käytössä");
  }

  const { error } = await db.from("clubs").update({ tag, tag_emoji: emoji, tag_enabled: enabled && !!tag }).eq("id", clubId);
  if (error) throw error;
  return { ok: true, tag, emoji, enabled: enabled && !!tag };
}

export async function listMyClubTags(userId: string) {
  const db = await admin();
  const { data: mem } = await db.from("club_members").select("club_id, role").eq("user_id", userId);
  const ids = (mem ?? []).map(x => x.club_id);
  if (!ids.length) return [];
  const roleBy = new Map((mem ?? []).map(x => [x.club_id, x.role]));
  const { data } = await db.from("clubs").select("id, name, tag, tag_emoji, tag_enabled").in("id", ids).order("name");
  return (data ?? []).map(c => ({ ...c, role: roleBy.get(c.id) ?? "member" }));
}

export async function setMyClubTag(userId: string, clubId: string | null) {
  const db = await admin();
  if (clubId) {
    const { data: member } = await db.from("club_members").select("club_id").eq("club_id", clubId).eq("user_id", userId).maybeSingle();
    if (!member) throw new Error("Et ole tämän klubin jäsen");
    const { data: club } = await db.from("clubs").select("id, tag_enabled, tag").eq("id", clubId).maybeSingle();
    if (!club?.tag_enabled || !club.tag) throw new Error("Klubitunniste ei ole käytössä");
  }
  const { error } = await db.from("profiles").update({ club_tag_club_id: clubId }).eq("id", userId);
  if (error) throw error;
  return { ok: true };
}

export async function getClubByTag(tag: string) {
  const db = await admin();
  const value = normalizeTag(tag);
  const { data: club } = await db.from("clubs").select("id, name, description, visibility, require_approval, tag, tag_emoji, tag_enabled").ilike("tag", value).eq("tag_enabled", true).maybeSingle();
  if (!club) throw new Error("Klubitunnistetta ei löytynyt");
  const { count } = await db.from("club_members").select("user_id", { count: "exact", head: true }).eq("club_id", club.id);
  return { ...club, members: count ?? 0, max_members: 50 };
}

export async function profileTagMap(userIds: string[]) {
  const db = await admin();
  const out = new Map<string, { clubId: string; tag: string; emoji: string | null }>();
  if (!userIds.length) return out;
  const { data: profiles } = await db.from("profiles").select("id, club_tag_club_id").in("id", userIds).not("club_tag_club_id", "is", null);
  const clubIds = (profiles ?? []).map(p => p.club_tag_club_id).filter(Boolean) as string[];
  if (!clubIds.length) return out;
  const { data: clubs } = await db.from("clubs").select("id, tag, tag_emoji, tag_enabled").in("id", clubIds).eq("tag_enabled", true);
  const byId = new Map((clubs ?? []).map(c => [c.id, c]));
  for (const p of profiles ?? []) {
    const c = p.club_tag_club_id ? byId.get(p.club_tag_club_id) : null;
    if (c?.tag) out.set(p.id, { clubId: c.id, tag: c.tag, emoji: c.tag_emoji });
  }
  return out;
}
