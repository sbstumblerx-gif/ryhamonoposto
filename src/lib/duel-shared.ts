// Shared (client + server) constants for the "Pelaa" duel game.

export type DuelMode = "2026" | "all";

/** Minimum eligible duel cards required to play. */
export const DUEL_MIN_CARDS = 5;
/** How many cards the server drafts for the player. */
export const DUEL_DRAFT_SIZE = 5;
/** How many of the drafted cards the player must pick. */
export const DUEL_PICK_COUNT = 2;
/** Boosters drafted, and how many owned boosters are required to see the step. */
export const BOOSTER_DRAFT_SIZE = 3;
/** Season points per result (2026 mode only). */
export const SEASON_POINTS: Record<string, number> = { P1: 3, P2: 1, P3: 0 };
/** Vault points awarded for a 2026 Season win. */
export const DUEL_WIN_VAULT = 1;

/** A card is duel-eligible when it is not a booster and has both stats. */
export function isDuelCard(c: { is_booster: boolean; attack: number | null; defense: number | null }) {
  return !c.is_booster && c.attack != null && c.defense != null;
}

export function matchesMode(c: { season_slug: string | null }, mode: DuelMode) {
  return mode === "all" || String(c.season_slug ?? "").includes("2026");
}

/** Booster bonus applied to both attack and defense of each of the player's cards. */
export function boosterBonus(boost: number | null | undefined) {
  return Math.round(((boost ?? 0) / 4) * 100) / 100;
}
