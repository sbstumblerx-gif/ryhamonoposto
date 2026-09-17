import { compareRaceOrder, normalizeName, parseResultLines, pointsForPosition } from "./stats-compute";
import type { FollowKind } from "./follows.server";

type Entity = {
  entity_type: FollowKind;
  entity_slug: string;
  name: string;
  flag: string;
  color_key: string;
  logo_url?: string | null;
  current_team_slug?: string | null;
};

function aggregateEvents(events: any[]) {
  const now = Date.now();
  const day24 = now - 24 * 60 * 60 * 1000;
  const day48 = now - 48 * 60 * 60 * 1000;
  const by = new Map<string, { last7: number; recent24: number; previous24: number }>();
  for (const e of events) {
    const key = `${e.entity_type}:${e.entity_slug}`;
    const bucket = by.get(key) ?? { last7: 0, recent24: 0, previous24: 0 };
    const t = new Date(e.created_at).getTime();
    bucket.last7 += Number(e.points ?? 0);
    if (t >= day24) bucket.recent24 += Number(e.points ?? 0);
    else if (t >= day48) bucket.previous24 += Number(e.points ?? 0);
    by.set(key, bucket);
  }
  return by;
}

export async function followingOverview(userId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [{ data: follows, error: fe }, { data: drivers, error: de }, { data: teams, error: te }, { data: events, error: ee }, { data: races, error: re }] = await Promise.all([
    db.from("follows").select("entity_type, entity_slug, created_at").eq("user_id", userId).order("created_at", { ascending: true }),
    db.from("drivers").select("slug, name, flag, color_key, current_team_slug, team_slug"),
    db.from("teams").select("slug, name, flag, color_key, logo_url, current_driver_slugs"),
    db.from("fan_point_events").select("entity_type, entity_slug, points, created_at").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    db.from("races").select("slug, name, flag, round_number, race_content, race_date").not("race_content", "is", null),
  ]);
  if (fe) throw fe; if (de) throw de; if (te) throw te; if (ee) throw ee; if (re) throw re;

  const followKey = new Set((follows ?? []).map((f: any) => `${f.entity_type}:${f.entity_slug}`));
  const driverBySlug = new Map((drivers ?? []).map((d: any) => [d.slug, d]));
  const teamBySlug = new Map((teams ?? []).map((t: any) => [t.slug, t]));
  const teamByName = new Map((teams ?? []).map((t: any) => [normalizeName(t.name), t]));
  const driverByName = new Map((drivers ?? []).map((d: any) => [normalizeName(d.name), d]));
  const entities: Entity[] = [
    ...(drivers ?? []).map((d: any) => ({ entity_type: "driver" as const, entity_slug: d.slug, name: d.name, flag: d.flag, color_key: d.color_key, current_team_slug: d.current_team_slug ?? d.team_slug })),
    ...(teams ?? []).map((t: any) => ({ entity_type: "team" as const, entity_slug: t.slug, name: t.name, flag: t.flag, color_key: t.color_key, logo_url: t.logo_url })),
  ];
  const eventAgg = aggregateEvents(events ?? []);
  const stats = (e: Entity) => {
    const s = eventAgg.get(`${e.entity_type}:${e.entity_slug}`) ?? { last7: 0, recent24: 0, previous24: 0 };
    return { ...e, fan_points: s.last7, trend: s.recent24 > s.previous24 ? "up" : s.recent24 < s.previous24 ? "down" : "flat" };
  };
  const scored = entities.map(stats);
  const driversTrend = scored.filter(e => e.entity_type === "driver").sort((a, b) => b.fan_points - a.fan_points || b.recent24 - b.recent24 || a.name.localeCompare(b.name));
  const teamsTrend = scored.filter(e => e.entity_type === "team").sort((a, b) => b.fan_points - a.fan_points || a.name.localeCompare(b.name));

  const followed = (follows ?? []).map((f: any) => {
    const e = f.entity_type === "driver" ? driverBySlug.get(f.entity_slug) : teamBySlug.get(f.entity_slug);
    return e ? { entity_type: f.entity_type, entity_slug: f.entity_slug, name: e.name, flag: e.flag, color_key: e.color_key, logo_url: e.logo_url ?? null } : null;
  }).filter(Boolean);

  const followedDrivers = (follows ?? []).filter((f: any) => f.entity_type === "driver").map((f: any) => driverBySlug.get(f.entity_slug)).filter(Boolean);
  const followedTeams = (follows ?? []).filter((f: any) => f.entity_type === "team").map((f: any) => teamBySlug.get(f.entity_slug)).filter(Boolean);
  const followedTeamSlugs = new Set(followedTeams.map((t: any) => t.slug));
  const followedFlags = new Set((follows ?? []).map((f: any) => f.entity_type === "driver" ? driverBySlug.get(f.entity_slug)?.flag : teamBySlug.get(f.entity_slug)?.flag).filter(Boolean));
  const followedCurrentTeams = new Set(followedDrivers.map((d: any) => d.current_team_slug ?? d.team_slug).filter(Boolean));
  const suggestions = scored
    .filter(e => !followKey.has(`${e.entity_type}:${e.entity_slug}`))
    .map(e => {
      let score = 0;
      if (e.flag && followedFlags.has(e.flag)) score += 3;
      if (e.entity_type === "driver" && e.current_team_slug && (followedCurrentTeams.has(e.current_team_slug) || followedTeamSlugs.has(e.current_team_slug))) score += 5;
      if (e.entity_type === "team" && e.flag && followedFlags.has(e.flag)) score += 2;
      return { ...e, score };
    })
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score || b.fan_points - a.fan_points || a.name.localeCompare(b.name))
    .slice(0, 3);

  const orderedRaces = [...(races ?? [])].sort(compareRaceOrder).reverse().filter((r: any) => r.round_number !== 0);
  const latest = orderedRaces[0] ?? null;
  let report: any = null;
  if (latest) {
    const lines = parseResultLines(latest.race_content);
    const driverRows = followedDrivers.map((d: any) => {
      const line = lines.find(l => normalizeName(l.driver) === normalizeName(d.name));
      if (!line) return null;
      const team = line.team ? teamByName.get(normalizeName(line.team)) : teamBySlug.get(d.current_team_slug ?? d.team_slug);
      return { kind: "driver", slug: d.slug, name: d.name, flag: d.flag, team_slug: team?.slug ?? null, team_name: team?.name ?? "", color_key: team?.color_key ?? d.color_key, position: line.position, status: line.status, points: line.status === "FIN" ? pointsForPosition(line.position) : 0 };
    }).filter(Boolean);
    const teamRows = followedTeams.map((t: any) => {
      const members = lines.filter(l => l.team && teamByName.get(normalizeName(l.team))?.slug === t.slug).map(l => {
        const d = driverByName.get(normalizeName(l.driver));
        return { slug: d?.slug ?? null, name: l.driver, flag: d?.flag ?? "", position: l.position, status: l.status };
      });
      if (!members.length) return null;
      return { kind: "team", slug: t.slug, name: t.name, flag: t.flag, color_key: t.color_key, points: members.reduce((sum, m) => sum + (m.status === "FIN" ? pointsForPosition(m.position) : 0), 0), drivers: members.slice(0, 2) };
    }).filter(Boolean);
    report = { race: { slug: latest.slug, name: latest.name, flag: latest.flag, round: latest.round_number }, drivers: driverRows, teams: teamRows };
  }

  return {
    follows: followed,
    trendNow: { drivers: driversTrend.slice(0, 3), teams: teamsTrend.slice(0, 2) },
    suggestions,
    report,
    trends: { drivers: driversTrend.slice(0, 5).concat(driversTrend.filter(e => followKey.has(`driver:${e.entity_slug}`)).filter(e => !driversTrend.slice(0, 5).some(x => x.entity_slug === e.entity_slug))), teams: teamsTrend.slice(0, 5).concat(teamsTrend.filter(e => followKey.has(`team:${e.entity_slug}`)).filter(e => !teamsTrend.slice(0, 5).some(x => x.entity_slug === e.entity_slug))) },
  };
}
