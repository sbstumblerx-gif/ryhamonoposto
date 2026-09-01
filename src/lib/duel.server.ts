// Server-only duel ("Pelaa") logic: drafting, opponent grid, simulation and rewards.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BOOSTER_DRAFT_SIZE,
  DUEL_DRAFT_SIZE,
  DUEL_MIN_CARDS,
  DUEL_PICK_COUNT,
  DUEL_WIN_VAULT,
  SEASON_POINTS,
  boosterBonus,
  isDuelCard,
  matchesMode,
  type DuelMode,
} from "./duel-shared";

type Admin = SupabaseClient<any, any, any>;

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function ownedCards(db: Admin, userId: string) {
  const { data: owned } = await db.from("user_cards").select("card_id").eq("user_id", userId);
  const ids = (owned ?? []).map((o: any) => o.card_id);
  if (ids.length === 0) return [] as any[];
  const { data: cards } = await db.from("cards").select("*").in("id", ids);
  return cards ?? [];
}

/** Per-mode eligibility counts + W/L/D stats for the Pelaa cards. */
export async function duelOverview(userId: string) {
  const db = await admin();
  const cards = await ownedCards(db, userId);
  const { data: matches } = await db.from("duel_matches").select("mode, result, season_points").eq("user_id", userId);

  const stat = (mode: DuelMode) => {
    const rows = (matches ?? []).filter((m: any) => m.mode === mode);
    return {
      wins: rows.filter((m: any) => m.result === "P1").length,
      draws: rows.filter((m: any) => m.result === "P2").length,
      losses: rows.filter((m: any) => m.result === "P3").length,
      points: rows.reduce((s: number, m: any) => s + (m.season_points ?? 0), 0),
    };
  };

  const eligible = (mode: DuelMode) => cards.filter((c: any) => isDuelCard(c) && matchesMode(c, mode)).length;

  return {
    modes: {
      "2026": { eligible: eligible("2026"), ...stat("2026") },
      all: { eligible: eligible("all"), ...stat("all") },
    },
    boosters: cards.filter((c: any) => c.is_booster).length,
    min: DUEL_MIN_CARDS,
  };
}

/** Draft: 5 random eligible cards + (optionally) 3 random owned boosters. */
export async function startDuel(userId: string, mode: DuelMode) {
  const db = await admin();
  const cards = await ownedCards(db, userId);
  const pool = cards.filter((c: any) => isDuelCard(c) && matchesMode(c, mode));
  if (pool.length < DUEL_MIN_CARDS) throw new Error(`Tarvitset vähintään ${DUEL_MIN_CARDS} kelpaavaa korttia`);
  const duelPick = shuffle(pool).slice(0, DUEL_DRAFT_SIZE);

  const boostersOwned = cards.filter((c: any) => c.is_booster);
  const boosterPick = boostersOwned.length >= BOOSTER_DRAFT_SIZE ? shuffle(boostersOwned).slice(0, BOOSTER_DRAFT_SIZE) : [];

  const { data, error } = await db
    .from("duel_drafts")
    .insert({
      user_id: userId,
      mode,
      duel_pool: duelPick.map((c: any) => c.id),
      booster_pool: boosterPick.map((c: any) => c.id),
    })
    .select("id")
    .single();
  if (error) throw error;

  return { draft_id: data.id as string, mode, cards: duelPick, boosters: boosterPick };
}

function roll() {
  return 0.85 + Math.random() * 0.3;
}

export async function resolveDuel(userId: string, draftId: string, cardIds: string[], boosterId: string | null) {
  const db = await admin();
  const { data: draft } = await db.from("duel_drafts").select("*").eq("id", draftId).eq("user_id", userId).maybeSingle();
  if (!draft) throw new Error("Vuoroa ei löytynyt");
  if (draft.used) throw new Error("Tämä ottelu on jo pelattu");
  if (cardIds.length !== DUEL_PICK_COUNT || new Set(cardIds).size !== DUEL_PICK_COUNT) {
    throw new Error(`Valitse tasan ${DUEL_PICK_COUNT} korttia`);
  }
  if (!cardIds.every((id) => (draft.duel_pool as string[]).includes(id))) throw new Error("Virheellinen korttivalinta");
  if (boosterId && !(draft.booster_pool as string[]).includes(boosterId)) throw new Error("Virheellinen boosterivalinta");

  const mode = draft.mode as DuelMode;
  const wanted = [...cardIds, ...(boosterId ? [boosterId] : [])];
  const { data: picked } = await db.from("cards").select("*").in("id", wanted);
  const byId = new Map<string, any>((picked ?? []).map((c: any) => [c.id, c]));
  const mine = cardIds.map((id) => byId.get(id)).filter(Boolean);
  if (mine.length !== DUEL_PICK_COUNT) throw new Error("Korttia ei löytynyt");
  const booster = boosterId ? byId.get(boosterId) ?? null : null;
  const bonus = booster ? boosterBonus(booster.boost) : 0;

  // Opponent grid: 2 random cards from the whole catalogue with the same mode filter.
  const { data: all } = await db.from("cards").select("*");
  const oppPool = (all ?? []).filter((c: any) => isDuelCard(c) && matchesMode(c, mode));
  if (oppPool.length < 1) throw new Error("Vastustajakortteja ei ole tarpeeksi");
  const shuffled = shuffle(oppPool);
  const opponent = [shuffled[0], shuffled[1] ?? shuffled[0]];

  const rounds = mine.map((card: any, i: number) => {
    const opp = opponent[i];
    const attackBase = (card.attack ?? 0) + bonus;
    const defenseBase = opp.defense ?? 0;
    const pace = attackBase * roll();
    const block = defenseBase * roll();
    let win = pace > block;
    if (Math.abs(pace - block) < 0.001) {
      win = (card.attack ?? 0) + (card.defense ?? 0) + bonus * 2 >= (opp.attack ?? 0) + (opp.defense ?? 0);
    }
    return {
      index: i + 1,
      card,
      opponent: opp,
      bonus,
      attack_base: card.attack ?? 0,
      attack_eff: Math.round(attackBase * 100) / 100,
      defense_eff: Math.round(((card.defense ?? 0) + bonus) * 100) / 100,
      pace: Math.round(pace * 10) / 10,
      block: Math.round(block * 10) / 10,
      win,
      text: win ? "Ohitus onnistui!" : "Puolustus piti!",
    };
  });

  const wins = rounds.filter((r) => r.win).length;
  const result = wins === 2 ? "P1" : wins === 1 ? "P2" : "P3";
  const seasonPoints = mode === "2026" ? SEASON_POINTS[result] ?? 0 : 0;
  const vaultAwarded = mode === "2026" && result === "P1" ? DUEL_WIN_VAULT : 0;

  await db.from("duel_drafts").update({ used: true }).eq("id", draftId);

  if (vaultAwarded > 0) {
    const { data: vault } = await db.from("user_vault").select("points").eq("user_id", userId).maybeSingle();
    if (vault) await db.from("user_vault").update({ points: vault.points + vaultAwarded }).eq("user_id", userId);
    else await db.from("user_vault").insert({ user_id: userId, points: vaultAwarded });
  }

  await db.from("duel_matches").insert({
    user_id: userId,
    mode,
    draft_id: draftId,
    my_cards: mine,
    booster,
    opponent_cards: opponent,
    rounds,
    result,
    season_points: seasonPoints,
    vault_awarded: vaultAwarded,
  });

  return { result, rounds, opponent, booster, bonus, season_points: seasonPoints, vault_awarded: vaultAwarded, mode };
}
