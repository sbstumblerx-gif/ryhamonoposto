import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Highlight = {
  id: string;
  race_slug: string;
  media_url: string;
  media_type: string;
  caption: string;
  sort_order: number;
  created_at: string;
  like_count: number;
};

/** All highlights for one race, oldest first. */
export const listHighlights = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ race_slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<Highlight[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("highlights")
      .select("id, race_slug, media_url, media_type, caption, sort_order, created_at")
      .eq("race_slug", data.race_slug)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const ids = (rows ?? []).map(r => r.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: likes } = await supabaseAdmin.from("highlight_likes").select("highlight_id").in("highlight_id", ids);
      for (const l of likes ?? []) counts.set(l.highlight_id, (counts.get(l.highlight_id) ?? 0) + 1);
    }
    return (rows ?? []).map(r => ({ ...r, like_count: counts.get(r.id) ?? 0 }));
  });

/** Highlight ids per race slug — used for the rings on the home page and race list. */
export const highlightIndex = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("highlights")
    .select("id, race_slug, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (map[row.race_slug] ??= []).push(row.id);
  }
  return map;
});

const HighlightInput = z.object({
  race_slug: z.string().min(1),
  media_url: z.string().min(1),
  media_type: z.enum(["image", "video"]).default("image"),
  caption: z.string().max(2000).default(""),
});

export const createHighlight = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => HighlightInput.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: last } = await supabaseAdmin
      .from("highlights").select("sort_order").eq("race_slug", data.race_slug)
      .order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data: row, error } = await supabaseAdmin.from("highlights").insert({
      race_slug: data.race_slug,
      media_url: data.media_url,
      media_type: data.media_type,
      caption: data.caption,
      sort_order: (last?.sort_order ?? -1) + 1,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteHighlight = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("highlights").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
