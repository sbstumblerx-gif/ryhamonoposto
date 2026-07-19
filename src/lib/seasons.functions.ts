import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listSeasons = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("seasons")
    .select("id, slug, name, sort_order")
    .order("sort_order", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getSeason = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("seasons").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw error;
    return row;
  });

async function assertAdmin() {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "season";
}

export const upsertSeason = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    slug: z.string().optional(),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("seasons").update({
        name: data.name, sort_order: data.sort_order,
        ...(data.slug ? { slug: data.slug } : {}),
      }).eq("id", data.id).select().single();
      if (error) throw error;
      return row;
    }
    const slug = data.slug || slugify(data.name);
    const { data: row, error } = await supabaseAdmin.from("seasons").insert({
      slug, name: data.name, sort_order: data.sort_order,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteSeason = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("seasons").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
