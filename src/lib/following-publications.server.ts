export async function followingPublications(userId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: follows, error: fe } = await db.from("follows").select("entity_type, entity_slug").eq("user_id", userId);
  if (fe) throw fe;
  const keys = (follows ?? []).map((f: any) => `${f.entity_type}:${f.entity_slug}`);
  if (!keys.length) return [];
  const { data: posts, error: pe } = await db.from("official_entity_posts").select("id, entity_type, entity_slug, body, media_url, created_at").eq("published", true).eq("verified_official", true).order("created_at", { ascending: false }).limit(100);
  if (pe) throw pe;
  const wanted = new Set(keys);
  const [{ data: drivers }, { data: teams }] = await Promise.all([
    db.from("drivers").select("slug, name, flag, color_key"),
    db.from("teams").select("slug, name, flag, color_key, logo_url"),
  ]);
  const driverBySlug = new Map((drivers ?? []).map((d: any) => [d.slug, d]));
  const teamBySlug = new Map((teams ?? []).map((t: any) => [t.slug, t]));
  return (posts ?? []).filter((p: any) => wanted.has(`${p.entity_type}:${p.entity_slug}`)).map((p: any) => {
    const e: any = p.entity_type === "driver" ? driverBySlug.get(p.entity_slug) : teamBySlug.get(p.entity_slug);
    return { ...p, name: e?.name ?? p.entity_slug, flag: e?.flag ?? "", color_key: e?.color_key ?? "red", logo_url: e?.logo_url ?? null };
  });
}
