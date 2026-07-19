import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listMedia = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ scope: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("media_items")
      .select("id, scope, url, caption, sort_order, created_at")
      .eq("scope", data.scope)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

async function assertAdmin() {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
}

export const addMedia = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    scope: z.string().min(1).max(200),
    url: z.string().url(),
    caption: z.string().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: max } = await supabaseAdmin
      .from("media_items").select("sort_order").eq("scope", data.scope)
      .order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const next = (max?.sort_order ?? 0) + 10;
    const { data: row, error } = await supabaseAdmin.from("media_items")
      .insert({ scope: data.scope, url: data.url, caption: data.caption, sort_order: next })
      .select().single();
    if (error) throw error;
    return row;
  });

export const updateMedia = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    caption: z.string().optional(),
    sort_order: z.number().int().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { data: row, error } = await supabaseAdmin.from("media_items").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return row;
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("media_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
