import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public reads
export const listDrivers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("drivers")
    .select("id, slug, name, flag, number, color_key, team_slug, content, hero_media_url")
    .order("number", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export const getDriver = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("drivers").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw error;
    return row;
  });

export const listTeams = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id, slug, name, flag, color_key, content, hero_media_url")
    .order("name");
  if (error) throw error;
  return data ?? [];
});

export const getTeam = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("teams").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw error;
    return row;
  });

export const listRaces = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("races")
    .select("id, slug, name, flag, race_date, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getRace = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("races").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw error;
    return row;
  });

export const listNews = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("news")
    .select("id, slug, title, excerpt, hero_media_url, published_at")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getNews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("news").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw error;
    return row;
  });

export const getStatsPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.enum(["drivers", "teams"]) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("stats_pages").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

// ============ Admin writes ============

async function assertAdmin() {
  const { requireAdmin } = await import("./admin-session.server");
  await requireAdmin();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

const RaceInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  flag: z.string().max(20).default(""),
  race_date: z.string().nullable().optional(),
  qualifying_content: z.string().default(""),
  race_content: z.string().default(""),
  qualifying_media_url: z.string().nullable().optional(),
  race_media_url: z.string().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
});


export const upsertRace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RaceInput.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("races").update({
        name: data.name, flag: data.flag,
        race_date: data.race_date || null,
        qualifying_content: data.qualifying_content,
        race_content: data.race_content,
        qualifying_media_url: data.qualifying_media_url ?? null,
        race_media_url: data.race_media_url ?? null,
        youtube_url: data.youtube_url ?? null,
      }).eq("id", data.id).select().single();
      if (error) throw error;
      return row;
    }
    const slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
    const { data: row, error } = await supabaseAdmin.from("races").insert({
      slug, name: data.name, flag: data.flag,
      race_date: data.race_date || null,
      qualifying_content: data.qualifying_content,
      race_content: data.race_content,
      youtube_url: data.youtube_url ?? null,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteRace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("races").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const FormerTeam = z.object({
  slug: z.string().min(1),
  from: z.number().int().min(2025).max(2100),
  to: z.number().int().min(2025).max(2100),
});

const DriverPatch = z.object({
  slug: z.string(),
  content: z.string().optional(),
  hero_media_url: z.string().nullable().optional(),
  team_slug: z.string().nullable().optional(),
  color_key: z.string().optional(),
  name: z.string().optional(),
  number: z.number().int().min(1).max(99).nullable().optional(),
  flag: z.string().optional(),
  info_card: z.string().nullable().optional(),
  current_team_slug: z.string().nullable().optional(),
  current_team_since: z.number().int().min(2025).max(2100).nullable().optional(),
  former_teams: z.array(FormerTeam).optional(),
});

export const updateDriver = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DriverPatch.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slug, ...patch } = data;
    const { data: row, error } = await supabaseAdmin.from("drivers").update(patch).eq("slug", slug).select().single();
    if (error) throw error;
    return row;
  });

const TeamPatch = z.object({
  slug: z.string(),
  content: z.string().optional(),
  hero_media_url: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  color_key: z.string().optional(),
  name: z.string().optional(),
  flag: z.string().optional(),
});

export const updateTeam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TeamPatch.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slug, ...patch } = data;
    const { data: row, error } = await supabaseAdmin.from("teams").update(patch).eq("slug", slug).select().single();
    if (error) throw error;
    return row;
  });

const NewsInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  excerpt: z.string().default(""),
  content: z.string().default(""),
  hero_media_url: z.string().nullable().optional(),
});

export const upsertNews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NewsInput.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: row, error } = await supabaseAdmin.from("news").update({
        title: data.title, excerpt: data.excerpt, content: data.content,
        hero_media_url: data.hero_media_url ?? null,
      }).eq("id", data.id).select().single();
      if (error) throw error;
      return row;
    }
    const slug = `${slugify(data.title)}-${Date.now().toString(36)}`;
    const { data: row, error } = await supabaseAdmin.from("news").insert({
      slug, title: data.title, excerpt: data.excerpt, content: data.content,
      hero_media_url: data.hero_media_url ?? null,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteNews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("news").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const StatsPatch = z.object({
  id: z.enum(["drivers", "teams"]),
  content: z.string().optional(),
  hero_media_url: z.string().nullable().optional(),
});

export const updateStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StatsPatch.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { data: row, error } = await supabaseAdmin.from("stats_pages").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return row;
  });
