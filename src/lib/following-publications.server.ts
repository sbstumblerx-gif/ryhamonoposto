export async function followingPublications(userId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: follows, error: fe } = await db.from("follows").select("entity_type, entity_slug").eq("user_id", userId);
  if (fe) throw fe;
  const keys = (follows ?? []).map((f: any) => `${f.entity_type}:${f.entity_slug}`);
  if (!keys.length) return [];
  const { data: posts, error: pe } = await db.from("official_entity_posts").select("id, entity_type, entity_slug, body, media_url, created_at, verified_official").eq("published", true).eq("verified_official", true).order("created_at", { ascending: false }).limit(100);
  if (pe) throw pe;
  const wanted = new Set(keys);
  const visible = (posts ?? []).filter((p: any) => wanted.has(`${p.entity_type}:${p.entity_slug}`));
  const ids = visible.map((p: any) => p.id);
  const [{ data: drivers }, { data: teams }, { data: likes }, { data: comments }] = await Promise.all([
    db.from("drivers").select("slug, name, flag, color_key"),
    db.from("teams").select("slug, name, flag, color_key, logo_url"),
    ids.length ? db.from("official_entity_post_likes").select("post_id, user_id").in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from("comments").select("entity_id").eq("entity_type", "official_post").in("entity_id", ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const driverBySlug = new Map((drivers ?? []).map((d: any) => [d.slug, d]));
  const teamBySlug = new Map((teams ?? []).map((t: any) => [t.slug, t]));
  const likeCount = new Map<string, number>(); const mine = new Set<string>();
  for (const l of likes ?? []) { likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1); if (l.user_id === userId) mine.add(l.post_id); }
  const commentCount = new Map<string, number>(); for (const c of comments ?? []) commentCount.set(c.entity_id, (commentCount.get(c.entity_id) ?? 0) + 1);
  return visible.map((p: any) => {
    const e: any = p.entity_type === "driver" ? driverBySlug.get(p.entity_slug) : teamBySlug.get(p.entity_slug);
    return { ...p, name: e?.name ?? p.entity_slug, flag: e?.flag ?? "", color_key: e?.color_key ?? "red", logo_url: e?.logo_url ?? null, like_count: likeCount.get(p.id) ?? 0, liked_by_me: mine.has(p.id), comment_count: commentCount.get(p.id) ?? 0, verified_official: true };
  });
}
