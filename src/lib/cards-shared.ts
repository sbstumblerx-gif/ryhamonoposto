// Shared (client + server) trading card constants and helpers.

export const CARD_TYPES = [
  "Tavallinen",
  "PODIUM",
  "WIN",
  "Star Driver",
  "100 Club",
  "THE CHAMPION",
  "THE CHAMPIONS",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

/** Vault points granted when you pull a duplicate of a card of this type. */
export const DUPLICATE_VP: Record<string, number> = {
  Tavallinen: 10,
  PODIUM: 15,
  WIN: 20,
  "Star Driver": 25,
  "100 Club": 40,
  "THE CHAMPION": 50,
  "THE CHAMPIONS": 50,
};
/** Team boosters always give 10 VP as duplicates, regardless of card type. */
export const BOOSTER_DUPLICATE_VP = 10;

export const POSITIONS = ["P1", "P2", "P3"] as const;

/** Vault points needed per redeemable card. */
export const VAULT_PER_CARD = 30;
/** Prediction points needed per extra card in a pack. */
export const POINTS_PER_EXTRA_CARD = 20;
/** Hard cap of extra cards from a single session (max 90 points => 4). */
export const MAX_EXTRA_CARDS = 4;

/** Pack size + leftover vault points for a given prediction score. */
export function packForPoints(points: number) {
  const extra = Math.min(MAX_EXTRA_CARDS, Math.floor(Math.max(0, points) / POINTS_PER_EXTRA_CARD));
  const leftover = Math.max(0, points) - extra * POINTS_PER_EXTRA_CARD;
  return { cards: 1 + extra, vault: leftover };
}

export function duplicateVp(card: { card_type: string; is_booster: boolean }) {
  if (card.is_booster) return BOOSTER_DUPLICATE_VP;
  return DUPLICATE_VP[card.card_type] ?? 10;
}

export function cardTotal(card: { attack: number | null; defense: number | null }) {
  return (card.attack ?? 0) + (card.defense ?? 0);
}
