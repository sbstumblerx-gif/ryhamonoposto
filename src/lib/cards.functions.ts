import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CARD_TYPES, POSITIONS } from "./cards-shared";

const CardSchema = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url(),
  serial_number: z.string().min(1).max(20),
  team_slug: z.string().max(80).nullable().default(null),
  driver_slug: z.string().max(80).nullable().default(null),
  is_booster: z.boolean().default(false),
  card_type: z.enum(CARD_TYPES),
  driver_number: z.number().int().min(0).max(999).nullable().default(null),
  race_name: z.string().max(120).nullable().default(null),
  race_flag: z.string().max(16).nullable().default(null),
  race_position: z.enum(POSITIONS).nullable().default(null),
  season_slug: z.string().max(80).nullable().default(null),
  attack: z.number().int().min(0).max(9999).nullable().default(null),
  defense: z.number().int().min(0).max(9999).nullable().default(null),
  boost: z.number().int().min(0).max(9999).nullable().default(null),
});

/** Public: the full card catalogue (locked cards are visible to everyone). */
export const listCards = createServerFn({ method: "GET" }).handler(async () =>
  (await import("./cards.server")).listCards(),
);

export const adminUpsertCard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CardSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    return (await import("./cards.server")).upsertCard(data as any);
  });

export const adminDeleteCard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    return (await import("./cards.server")).deleteCard(data.id);
  });

export const myCollection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./cards.server")).myCollection(context.userId));

export const openPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pack_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => (await import("./cards.server")).openPack(context.userId, data.pack_id));

export const redeemVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./cards.server")).redeemVault(context.userId));

export const collectionBadge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./cards.server")).collectionBadge(context.userId));

export const shareCardToClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ card_id: z.string().uuid(), club_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) =>
    (await import("./cards.server")).shareCardToClub(context.userId, data.card_id, data.club_id));
