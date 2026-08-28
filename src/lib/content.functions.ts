import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public reads — driver color is derived from their assigned team when available,
// so admin changes to a team's color propagate automatically.
async function teamColorMap() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("teams").select("slug, color_key");
  return new Map((data ?? []).map(t => [t.slug, t.color_key] as const));
}

function effectiveColor(driver: { color_key: string; team_slug: string | null; current_team_slug: string | null }, map: Map<string, string>): string {
  const teamSlug = driver.current_team_slug ?? driver.team_slug ?? "";
  return map.get(teamSlug) ?? driver.color_key;
}

export const listDrivers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data, error }, colors] = await Promise.all([
    supabaseAdmin
      .from("drivers")
      .select("id, slug, name, flag, race_date, round_number, created_at, qualifying_content, race_content, is_live")
      .order("number", { ascending: true }),
    teamColorMap(),
  ]);
  if (error) throw error;
  return (data ?? []).map(d => ({ ...d, color_key: effectiveColor(d, colors) }));
});

export const getDriver = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: row, error }, colors] = await Promise.all([
      supabaseAdmin.from("drivers").select("*").eq("slug", data.slug).maybeSingle(),
      teamColorMap(),
    ]);
    if (error) throw error;
    if (!row) return row;
    return { ...row, color_key: effectiveColor(row, colors) };
  });

export const listTeams = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id, slug, name, flag, color_key, content, hero_media_url, logo_url, info_card, current_driver_slugs, former_lineups")
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
    .select("*");
  
  if (error) {
    console.error("listRaces error:", error);
    throw error;
  }
  
  console.log("listRaces returned:", data?.length ?? 0, "races");
  return data ?? [];
});

export const getLatestSessionResult = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("races")
    .select("slug, name, qualifying_content, race_content, qualifying_updated_at, race_updated_at, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw error;

  const sessions = (data ?? []).flatMap((race) => [
    {
      slug: race.slug,
      title: `${race.name} aika-ajot`,
      content: race.qualifying_content ?? "",
      updatedAt: race.qualifying_updated_at ?? race.updated_at ?? race.created_at,
    },
    {
      slug: race.slug,
      title: `${race.name} kisa`,
      content: race.race_content ?? "",
      updatedAt: race.race_updated_at ?? race.updated_at ?? race.created_at,
    },
  ]).filter((session) => session.content.trim().length > 0);

  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const latest = sessions[0];
  if (!latest) return null;

  const summary = latest.content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return { slug: latest.slug, label: latest.title, summary };
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
  round_number: z.number().int().min(1).max(50).nullable().optional(),
  flag: z.string().max(20).default(""),
  race_date: z.string().nullable().optional(),
  qualifying_content: z.string().default(""),
  race_content: z.string().default(""),
  qualifying_media_url: z.string().nullable().optional(),
  race_media_url: z.string().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
  qualifying_youtube_url: z.string().nullable().optional(),
  race_youtube_url: z.string().nullable().optional(),
});


export const upsertRace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RaceInput.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { data: current, error: readError } = await supabaseAdmin
        .from("races")
        .select("qualifying_content, race_content, qualifying_media_url, race_media_url, qualifying_youtube_url, race_youtube_url")
        .eq("id", data.id)
        .maybeSingle();
      if (readError) throw readError;
      const now = new Date().toISOString();
      const qualifyingChanged = !current
        || (current.qualifying_content ?? "") !== data.qualifying_content
        || (current.qualifying_media_url ?? null) !== (data.qualifying_media_url ?? null)
        || (current.qualifying_youtube_url ?? null) !== (data.qualifying_youtube_url ?? null);
      const raceChanged = !current
        || (current.race_content ?? "") !== data.race_content
        || (current.race_media_url ?? null) !== (data.race_media_url ?? null)
        || (current.race_youtube_url ?? null) !== (data.race_youtube_url ?? null);
      const { data: row, error } = await supabaseAdmin.from("races").update({
        name: data.name, flag: data.flag, round_number: data.round_number ?? null,
        race_date: data.race_date || null,
        qualifying_content: data.qualifying_content,
        race_content: data.race_content,
        qualifying_media_url: data.qualifying_media_url ?? null,
        race_media_url: data.race_media_url ?? null,
        youtube_url: data.youtube_url ?? null,
        qualifying_youtube_url: data.qualifying_youtube_url ?? null,
        race_youtube_url: data.race_youtube_url ?? null,
        ...(qualifyingChanged ? { qualifying_updated_at: now } : {}),
        ...(raceChanged ? { race_updated_at: now } : {}),
      }).eq("id", data.id).select().single();
      if (error) throw error;
      return row;
    }
    const slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
    const { data: row, error } = await supabaseAdmin.from("races").insert({
      slug, name: data.name, flag: data.flag, round_number: data.round_number ?? null,
      race_date: data.race_date || null,
      qualifying_content: data.qualifying_content,
      race_content: data.race_content,
      qualifying_media_url: data.qualifying_media_url ?? null,
      race_media_url: data.race_media_url ?? null,
      youtube_url: data.youtube_url ?? null,
      qualifying_youtube_url: data.qualifying_youtube_url ?? null,
      race_youtube_url: data.race_youtube_url ?? null,
      qualifying_updated_at: data.qualifying_content.trim() ? new Date().toISOString() : null,
      race_updated_at: data.race_content.trim() ? new Date().toISOString() : null,
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
  info_card: z.string().nullable().optional(),
  hero_media_url: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  color_key: z.string().optional(),
  name: z.string().optional(),
  flag: z.string().optional(),
  current_driver_slugs: z.array(z.string()).max(2).optional(),
  former_lineups: z.array(z.object({
    from: z.number().int().min(2025).max(2100),
    to: z.number().int().min(2025).max(2100),
    driver_slugs: z.tuple([z.string(), z.string()]),
  })).optional(),
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

// ============ Team & Driver creation / deletion ============

const CreateTeamInput = z.object({
  name: z.string().min(1).max(120),
  flag: z.string().max(20).default(""),
  color_key: z.string().min(1).max(40).default("red"),
});

export const createTeam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateTeamInput.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
    const { data: row, error } = await supabaseAdmin.from("teams").insert({
      slug, name: data.name, flag: data.flag, color_key: data.color_key,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("teams").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const CreateDriverInput = z.object({
  name: z.string().min(1).max(120),
  flag: z.string().max(20).default(""),
  number: z.number().int().min(1).max(99).default(1),
  team_slug: z.string().nullable().optional(),
  color_key: z.string().min(1).max(40).default("red"),
});

export const createDriver = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateDriverInput.parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Derive color from the team if one is assigned.
    let color = data.color_key;
    if (data.team_slug) {
      const { data: team } = await supabaseAdmin.from("teams").select("color_key").eq("slug", data.team_slug).maybeSingle();
      if (team?.color_key) color = team.color_key;
    }
    const slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
    const { data: row, error } = await supabaseAdmin.from("drivers").insert({
      slug, name: data.name, flag: data.flag, number: data.number,
      team_slug: data.team_slug ?? null,
      current_team_slug: data.team_slug ?? null,
      color_key: color,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const deleteDriver = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("drivers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Admin picks the single "käynnissä" (live) race shown at the top of the Kilpailut
// page. Passing null just clears it. The DB's partial unique index only allows one
// row to be live at once, so the previous one is unset first.
export const setLiveRace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: clearError } = await supabaseAdmin.from("races").update({ is_live: false }).eq("is_live", true);
    if (clearError) throw clearError;
    if (data.id) {
      const { error } = await supabaseAdmin.from("races").update({ is_live: true }).eq("id", data.id);
      if (error) throw error;
    }
    return { ok: true };
  });
