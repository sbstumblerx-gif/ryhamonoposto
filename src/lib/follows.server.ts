import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, any, any>;
async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Admin;
}

export type FollowKind = "driver" | "team";

export async function toggleFollow(userId: string, kind: FollowKind, slug: string) {
  const db = await admin();
  const { data: existing } = await db.from("follows").select("id").eq("user_id", userId).eq("entity_type", kind).eq("entity_slug", slug).maybeSingle();
  if (existing) {
    const { error } = await db.from("follows").delete().eq("id", existing.id);
    if (error) throw error;
    return { following: false };
  }
  const { error } = await db.from("follows").insert({ user_id: userId, entity_type: kind, entity_slug: slug });
  if (error) throw error;
  return { following: true };
}

export async function listMyFollows(userId: string) {
  const db = await admin();
  const { data: rows } = await db.from("follows").select("entity_type, entity_slug, created_at").eq("user_id", userId).order("created_at");
  const list = rows ?? [];
  const driverSlugs = list.filter(r => r.entity_type === "driver").map(r => r.entity_slug);
  const teamSlugs = list.filter(r => r.entity_type === "team").map(r => r.entity_slug);
  const [drivers, teams] = await Promise.all([
    driverSlugs.length ? db.from("drivers").select("slug, name, flag").in("slug", driverSlugs) : Promise.resolve({ data: [] as any[] }),
    teamSlugs.length ? db.from("teams").select("slug, name, flag").in("slug", teamSlugs) : Promise.resolve({ data: [] as any[] }),
  ]);
  const byDriver = new Map((drivers.data ?? []).map((d: any) => [d.slug, d]));
  const byTeam = new Map((teams.data ?? []).map((t: any) => [t.slug, t]));
  return list.map(r => {
    const hit: any = r.entity_type === "driver" ? byDriver.get(r.entity_slug) : byTeam.get(r.entity_slug);
    return {
      entity_type: r.entity_type as FollowKind,
      entity_slug: r.entity_slug,
      name: hit?.name ?? r.entity_slug,
      flag: hit?.flag ?? "",
    };
  }).filter(r => r.name);
}

// Notify everyone who holds the role of a driver/team mentioned in a news item.
export async function notifyFollowersOfNews(newsTitle: string, text: string) {
  const db = await admin();
  const [{ data: drivers }, { data: teams }] = await Promise.all([
    db.from("drivers").select("slug, name"),
    db.from("teams").select("slug, name"),
  ]);
  const haystack = `${newsTitle}\n${text}`.toLowerCase();
  const mentioned: Array<{ kind: FollowKind; slug: string; name: string }> = [];
  for (const d of drivers ?? []) if (d.name && haystack.includes(String(d.name).toLowerCase())) mentioned.push({ kind: "driver", slug: d.slug, name: d.name });
  for (const t of teams ?? []) if (t.name && haystack.includes(String(t.name).toLowerCase())) mentioned.push({ kind: "team", slug: t.slug, name: t.name });
  if (!mentioned.length) return { notified: 0 };

  const rows: Array<{ user_id: string; type: string; title: string; body: string }> = [];
  const seen = new Set<string>();
  for (const m of mentioned) {
    const { data: followers } = await db.from("follows").select("user_id").eq("entity_type", m.kind).eq("entity_slug", m.slug);
    for (const f of followers ?? []) {
      const key = `${f.user_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        user_id: f.user_id,
        type: "role_mention",
        title: `${m.name} mainittiin uutisessa`,
        body: newsTitle,
      });
    }
  }
  if (!rows.length) return { notified: 0 };
  await db.from("notifications").insert(rows);
  return { notified: rows.length };
}
