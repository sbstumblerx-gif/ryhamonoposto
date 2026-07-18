import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listComments = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ entity_type: z.string(), entity_id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("comments")
      .select("id, entity_type, entity_id, user_id, body, created_at")
      .eq("entity_type", data.entity_type)
      .eq("entity_id", data.entity_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const userIds = Array.from(new Set((rows ?? []).map(r => r.user_id)));
    let profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
      for (const p of profs ?? []) profiles[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    }
    return (rows ?? []).map(r => ({
      ...r,
      display_name: profiles[r.user_id]?.display_name ?? "Vierailija",
      avatar_url: profiles[r.user_id]?.avatar_url ?? null,
    }));
  });

// Comments are created with the authenticated user's Supabase client from the browser directly.
// Deletion by admin (any comment) requires admin session.
export const adminDeleteComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("comments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // delete their comments + auth user
    await supabaseAdmin.from("comments").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.user_id);
    await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    return { ok: true };
  });
