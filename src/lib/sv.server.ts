// Palvelinlogiikka SV Account -linkitykselle ja datan synkronointiin.
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, any, any>;

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

/** Kaikki SV Accountiin synkronoitava data tästä sovelluksesta. */
export async function svPayload(userId: string) {
  const db = await admin();
  const [{ data: profile }, { data: owned }, { data: preds }] = await Promise.all([
    db.from("profiles").select("display_name, sv_user_id, sv_linked_at, sv_reward_claimed").eq("id", userId).maybeSingle(),
    db.from("user_cards").select("copies, cards(serial_number, card_type, team_slug, driver_slug, season_slug, is_booster, attack, defense, boost, image_url)").eq("user_id", userId),
    db.from("predictions").select("points").eq("user_id", userId),
  ]);

  const cards = (owned ?? []).map((o: any) => ({
    serial_number: o.cards?.serial_number ?? null,
    card_type: o.cards?.card_type ?? null,
    team: o.cards?.team_slug ?? null,
    driver: o.cards?.driver_slug ?? null,
    season: o.cards?.season_slug ?? null,
    is_booster: !!o.cards?.is_booster,
    attack: o.cards?.attack ?? null,
    defense: o.cards?.defense ?? null,
    boost: o.cards?.boost ?? null,
    image_url: o.cards?.image_url ?? null,
    copies: o.copies ?? 1,
  }));

  return {
    profile_name: profile?.display_name ?? "Ryhäpelaaja",
    cards,
    card_count: cards.reduce((n: number, c: any) => n + (c.copies ?? 1), 0),
    betting_points: (preds ?? []).reduce((n: number, p: any) => n + (p.points ?? 0), 0),
    link: {
      sv_user_id: profile?.sv_user_id ?? null,
      linked_at: profile?.sv_linked_at ?? null,
      reward_claimed: !!profile?.sv_reward_claimed,
    },
  };
}

/** Merkitsee linkityksen ja antaa kertaluontoisen 3 kortin kirjautumispalkkion. */
export async function svLink(userId: string, svUserId: string) {
  const db = await admin();
  const { data: profile } = await db
    .from("profiles").select("display_name, sv_reward_claimed").eq("id", userId).maybeSingle();

  await db.from("profiles").update({ sv_user_id: svUserId, sv_linked_at: new Date().toISOString() }).eq("id", userId);

  let rewarded = false;
  if (!profile?.sv_reward_claimed) {
    await db.from("card_packs").insert({ user_id: userId, source: "sv_link", card_count: 3 });
    await db.from("profiles").update({ sv_reward_claimed: true }).eq("id", userId);
    await db.from("notifications").insert({
      user_id: userId,
      type: "sv_reward",
      title: "SV Account yhdistetty",
      body: "Sait kirjautumispalkkiona 3 kortin pakan. Avaa se Kokoelma-sivulla.",
    });
    rewarded = true;
  }
  return { ok: true, rewarded, profile_name: profile?.display_name ?? "Ryhäpelaaja" };
}

export async function svUnlink(userId: string) {
  const db = await admin();
  await db.from("profiles").update({ sv_user_id: null, sv_linked_at: null }).eq("id", userId);
  return { ok: true };
}
