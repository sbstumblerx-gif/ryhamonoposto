// Server-only trading card logic: admin card CRUD, pack grants, opening and the vault.
import type { SupabaseClient } from "@supabase/supabase-js";
import { duplicateVp, packForPoints, VAULT_PER_CARD } from "./cards-shared";

type Admin = SupabaseClient<any, any, any>;

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

export type CardInput = {
  image_url: string;
  serial_number: string;
  team_slug: string | null;
  driver_slug: string | null;
  is_booster: boolean;
  card_type: string;
  driver_number: number | null;
  race_name: string | null;
  race_flag: string | null;
  race_position: string | null;
  season_slug: string | null;
  attack: number | null;
  defense: number | null;
  boost: number | null;
};

export async function listCards() {
  const db = await admin();
  const { data, error } = await db.from("cards").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertCard(input: CardInput & { id?: string }) {
  const db = await admin();
  const row = {
    ...input,
    attack: input.is_booster ? null : input.attack,
    defense: input.is_booster ? null : input.defense,
    boost: input.is_booster ? input.boost : null,
  };
  if (input.id) {
    const { data, error } = await db.from("cards").update(row).eq("id", input.id).select().single();
    if (error) throw error;
    return data;
  }
  const { id: _ignored, ...insertRow } = row as any;
  const { data, error } = await db.from("cards").insert(insertRow).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCard(id: string) {
  const db = await admin();
  const { error } = await db.from("cards").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

// ---------- Collection ----------

export async function myCollection(userId: string) {
  const db = await admin();
  const [{ data: cards }, { data: owned }, { data: vault }, { data: packs }] = await Promise.all([
    db.from("cards").select("*").order("created_at", { ascending: true }),
    db.from("user_cards").select("card_id, copies").eq("user_id", userId),
    db.from("user_vault").select("points").eq("user_id", userId).maybeSingle(),
    db.from("card_packs").select("id, source, card_count, created_at").eq("user_id", userId).eq("opened", false).order("created_at"),
  ]);
  const ownedBy = new Map<string, number>((owned ?? []).map((o: any) => [o.card_id, o.copies]));
  const points = vault?.points ?? 0;
  return {
    cards: (cards ?? []).map((c: any) => ({ ...c, copies: ownedBy.get(c.id) ?? 0 })),
    vault: { points, redeemable: Math.floor(points / VAULT_PER_CARD), per_card: VAULT_PER_CARD },
    packs: packs ?? [],
  };
}

// ---------- Vault + pack helpers ----------

async function addVault(db: Admin, userId: string, delta: number) {
  if (delta <= 0) return;
  const { data } = await db.from("user_vault").select("points").eq("user_id", userId).maybeSingle();
  if (data) await db.from("user_vault").update({ points: data.points + delta }).eq("user_id", userId);
  else await db.from("user_vault").insert({ user_id: userId, points: delta });
}

/** Called when an admin finalizes a session: one pack per participant. */
export async function grantPacksForSession(sessionId: string) {
  const db = await admin();
  const { data: preds } = await db.from("predictions").select("user_id, points").eq("session_id", sessionId);
  for (const p of preds ?? []) {
    const { cards, vault } = packForPoints(p.points ?? 0);
    const { data: existing } = await db.from("card_packs").select("id, opened").eq("user_id", p.user_id).eq("session_id", sessionId).maybeSingle();
    if (existing) {
      if (!existing.opened) await db.from("card_packs").update({ card_count: cards }).eq("id", existing.id);
    } else {
      await db.from("card_packs").insert({ user_id: p.user_id, session_id: sessionId, source: "prediction", card_count: cards });
      await addVault(db, p.user_id, vault);
    }
  }
  return { ok: true, packs: preds?.length ?? 0 };
}

async function drawCards(db: Admin, userId: string, count: number) {
  const { data: pool } = await db.from("cards").select("*");
  if (!pool || pool.length === 0) throw new Error("Kortteja ei ole vielä lisätty");
  const results: any[] = [];
  let vaultGain = 0;
  for (let i = 0; i < count; i++) {
    const card = pool[Math.floor(Math.random() * pool.length)];
    const { data: owned } = await db.from("user_cards").select("id, copies").eq("user_id", userId).eq("card_id", card.id).maybeSingle();
    if (owned) {
      const vp = duplicateVp(card);
      vaultGain += vp;
      await db.from("user_cards").update({ copies: owned.copies + 1 }).eq("id", owned.id);
      results.push({ card, duplicate: true, vp });
    } else {
      await db.from("user_cards").insert({ user_id: userId, card_id: card.id, copies: 1 });
      results.push({ card, duplicate: false, vp: 0 });
    }
  }
  await addVault(db, userId, vaultGain);
  return results;
}

export async function openPack(userId: string, packId: string) {
  const db = await admin();
  const { data: pack } = await db.from("card_packs").select("*").eq("id", packId).eq("user_id", userId).maybeSingle();
  if (!pack) throw new Error("Pakkaa ei löytynyt");
  if (pack.opened) return { results: pack.result ?? [] };
  const results = await drawCards(db, userId, pack.card_count);
  await db.from("card_packs").update({ opened: true, result: results }).eq("id", pack.id);
  return { results };
}

/** Redeem 30 vault points for one card (opens immediately). */
export async function redeemVault(userId: string) {
  const db = await admin();
  const { data: vault } = await db.from("user_vault").select("points").eq("user_id", userId).maybeSingle();
  const points = vault?.points ?? 0;
  if (points < VAULT_PER_CARD) throw new Error("Varastopisteitä ei ole tarpeeksi");
  await db.from("user_vault").update({ points: points - VAULT_PER_CARD }).eq("user_id", userId);
  const results = await drawCards(db, userId, 1);
  await db.from("card_packs").insert({ user_id: userId, source: "vault", card_count: 1, opened: true, result: results });
  return { results };
}

/** Badge data for the nav: unopened packs + redeemable vault cards. */
export async function collectionBadge(userId: string) {
  const db = await admin();
  const [{ count }, { data: vault }] = await Promise.all([
    db.from("card_packs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("opened", false),
    db.from("user_vault").select("points").eq("user_id", userId).maybeSingle(),
  ]);
  const redeemable = Math.floor((vault?.points ?? 0) / VAULT_PER_CARD);
  return { packs: count ?? 0, redeemable, total: (count ?? 0) + redeemable };
}

/** Share an owned card into a club chat the user belongs to. */
export async function shareCardToClub(userId: string, cardId: string, clubId: string) {
  const db = await admin();
  const { data: owned } = await db.from("user_cards").select("id").eq("user_id", userId).eq("card_id", cardId).maybeSingle();
  if (!owned) throw new Error("Et omista tätä korttia");
  const { data: mem } = await db.from("club_members").select("role").eq("club_id", clubId).eq("user_id", userId).maybeSingle();
  if (!mem) throw new Error("Et ole tämän klubin jäsen");
  const { data: card } = await db.from("cards").select("*").eq("id", cardId).maybeSingle();
  if (!card) throw new Error("Korttia ei löytynyt");
  const label = `${card.serial_number} · ${card.card_type}${card.driver_slug ? "" : " · Team booster"}`;
  const { error } = await db.from("club_messages").insert({
    club_id: clubId, user_id: userId,
    body: `Jakoi kortin: ${label}`,
    media_url: card.image_url, media_type: "image",
  });
  if (error) throw error;
  return { ok: true };
}
