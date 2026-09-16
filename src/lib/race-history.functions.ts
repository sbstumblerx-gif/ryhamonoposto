import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { compareRaceOrder, normalizeName, parseResultLines, pointsForPosition, sprintPointsForPosition, seasonYearFromName } from "./stats-compute";

export type HistoryResult = { position: number | null; status: "FIN" | "DNF" | "DSQ" | "DNS"; points: number };
export type HistoryEntry = { slug: string; name: string; flag: string; round: number | null; team: { slug: string | null; name: string; logo_url: string | null; color_key: string } | null; race: HistoryResult | null; qualifying: HistoryResult | null; sprint: HistoryResult | null; sprintQualifying: HistoryResult | null };
export type TeamDriverHistory = { slug: string | null; name: string; flag: string; race: HistoryResult | null; qualifying: HistoryResult | null; sprint: HistoryResult | null; sprintQualifying: HistoryResult | null };
export type TeamHistoryEntry = { slug: string; name: string; flag: string; round: number | null; team: { slug: string; name: string; logo_url: string | null; color_key: string }; drivers: TeamDriverHistory[] };

type Driver = { slug: string; name: string; flag: string; current_team_slug: string | null; team_slug: string | null; current_team_since: number | null; former_teams: any };
type Team = { slug: string; name: string; logo_url: string | null; color_key: string };
function historicalTeam(driver: Driver | undefined, year: number | null, teams: Map<string, Team>) { if (!driver) return undefined; const former = Array.isArray(driver.former_teams) ? driver.former_teams : []; const hit = former.find((t: any) => Number(t.from) <= (year ?? 0) && (year ?? 0) <= Number(t.to)); if (hit?.slug) return teams.get(hit.slug); if (driver.current_team_slug && (!year || driver.current_team_since == null || year >= driver.current_team_since)) return teams.get(driver.current_team_slug); return driver.team_slug ? teams.get(driver.team_slug) : undefined; }
function result(line: any, sprint = false): HistoryResult | null { if (!line) return null; return { position: line.position, status: line.status, points: line.status === "FIN" ? (sprint ? sprintPointsForPosition(line.position) : pointsForPosition(line.position)) : 0 }; }

export const getDriverRaceHistory = createServerFn({ method: "GET" }).inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d)).handler(async ({ data }): Promise<HistoryEntry[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: races, error: re }, { data: drivers, error: de }, { data: teams, error: te }] = await Promise.all([
    supabaseAdmin.from("races").select("slug, name, flag, round_number, qualifying_content, race_content, is_sprint_weekend, sprint_qualifying_content, sprint_content" as any),
    supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, team_slug, current_team_since, former_teams"),
    supabaseAdmin.from("teams").select("slug, name, logo_url, color_key"),
  ]);
  if (re) throw re; if (de) throw de; if (te) throw te;
  const driver = (drivers ?? []).find(d => d.slug === data.slug); if (!driver) return [];
  const teamByName = new Map((teams ?? []).map(t => [normalizeName(t.name), t] as const));
  const teamBySlug = new Map((teams ?? []).map(t => [t.slug, t] as const));
  return [...(races ?? [])].sort(compareRaceOrder).reverse().filter(r => r.round_number !== 0).flatMap(r => {
    const year = seasonYearFromName(r.name); const all = (text: string | null | undefined) => parseResultLines(text); const match = (lines: any[]) => lines.find(l => normalizeName(l.driver) === normalizeName(driver.name));
    const raceLine = match(all(r.race_content)); const qLine = match(all(r.qualifying_content)); const sprintLine = r.is_sprint_weekend ? match(all((r as any).sprint_content)) : null; const sprintQLine = r.is_sprint_weekend ? match(all((r as any).sprint_qualifying_content)) : null;
    const team = (raceLine?.team ? teamByName.get(normalizeName(raceLine.team)) : undefined) ?? (qLine?.team ? teamByName.get(normalizeName(qLine.team)) : undefined) ?? (sprintLine?.team ? teamByName.get(normalizeName(sprintLine.team)) : undefined) ?? (sprintQLine?.team ? teamByName.get(normalizeName(sprintQLine.team)) : undefined) ?? historicalTeam(driver, year, teamBySlug);
    if (!raceLine && !qLine && !sprintLine && !sprintQLine) return [];
    return [{ slug: r.slug, name: r.name, flag: r.flag, round: r.round_number, team: team ? { slug: team.slug, name: team.name, logo_url: team.logo_url, color_key: team.color_key } : null, race: result(raceLine), qualifying: result(qLine), sprint: result(sprintLine, true), sprintQualifying: result(sprintQLine) }];
  });
});

export const getTeamRaceHistory = createServerFn({ method: "GET" }).inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d)).handler(async ({ data }): Promise<TeamHistoryEntry[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: races, error: re }, { data: drivers, error: de }, { data: teams, error: te }] = await Promise.all([
    supabaseAdmin.from("races").select("slug, name, flag, round_number, qualifying_content, race_content, is_sprint_weekend, sprint_qualifying_content, sprint_content" as any),
    supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, team_slug, current_team_since, former_teams"),
    supabaseAdmin.from("teams").select("slug, name, logo_url, color_key"),
  ]);
  if (re) throw re; if (de) throw de; if (te) throw te;
  const team = (teams ?? []).find(t => t.slug === data.slug); if (!team) return [];
  const teamByName = new Map((teams ?? []).map(t => [normalizeName(t.name), t] as const)); const driverByName = new Map((drivers ?? []).map(d => [normalizeName(d.name), d] as const));
  return [...(races ?? [])].sort(compareRaceOrder).reverse().filter(r => r.round_number !== 0).flatMap(r => {
    const sessions = [parseResultLines(r.race_content), parseResultLines(r.qualifying_content), r.is_sprint_weekend ? parseResultLines((r as any).sprint_content) : [], r.is_sprint_weekend ? parseResultLines((r as any).sprint_qualifying_content) : []];
    const teamMatches = sessions.map(lines => lines.filter(l => { const parsedTeam = l.team ? teamByName.get(normalizeName(l.team)) : undefined; return parsedTeam?.slug === team.slug; }));
    const names = [...new Set(teamMatches.flat().map(l => normalizeName(l.driver)))];
    const driversHere = names.map(n => driverByName.get(n)).filter(Boolean).slice(0, 2) as Driver[];
    if (!driversHere.length) return [];
    const entryDrivers = driversHere.map(d => {
      const find = (lines: any[]) => lines.find(l => normalizeName(l.driver) === normalizeName(d.name) && (!l.team || teamByName.get(normalizeName(l.team))?.slug === team.slug));
      return { slug: d.slug, name: d.name, flag: d.flag, race: result(find(sessions[0])), qualifying: result(find(sessions[1])), sprint: result(find(sessions[2]), true), sprintQualifying: result(find(sessions[3])) };
    });
    return [{ slug: r.slug, name: r.name, flag: r.flag, round: r.round_number, team: { slug: team.slug, name: team.name, logo_url: team.logo_url, color_key: team.color_key }, drivers: entryDrivers }];
  });
});
