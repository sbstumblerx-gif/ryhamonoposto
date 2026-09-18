import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  parseResultLines, seasonYearFromName, normalizeName,
  emptyStatLine, applyResult, applySprintResult, sortStandings, compareRaceOrder, type StatLine,
} from "./stats-compute";

export type StandingsResult = {
  drivers: StatLine[];
  teams: StatLine[];
  seasonDrivers: Record<string, StatLine[]>;
  seasonTeams: Record<string, StatLine[]>;
  seasons: number[];
  sessionCount: number;
};

export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ year: z.number().int().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<StandingsResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: races, error: raceError }, { data: drivers, error: driverError }, { data: teams, error: teamError }] = await Promise.all([
      supabaseAdmin.from("races").select("name, round_number, qualifying_content, race_content, driver_of_the_day_slug, fastest_lap_driver_slug, is_sprint_weekend, sprint_qualifying_content, sprint_content, sprint_fastest_lap_driver_slug" as any),
      supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, team_slug"),
      supabaseAdmin.from("teams").select("slug, name, flag"),
    ]);
    if (raceError) throw raceError;
    if (driverError) throw driverError;
    if (teamError) throw teamError;

    const driverByName = new Map((drivers ?? []).map(d => [normalizeName(d.name), d] as const));
    const driverBySlug = new Map((drivers ?? []).map(d => [d.slug, d] as const));
    const teamByName = new Map((teams ?? []).map(t => [normalizeName(t.name), t] as const));
    const teamBySlug = new Map((teams ?? []).map(t => [t.slug, t] as const));

    const driverRows = new Map<string, StatLine>();
    const teamRows = new Map<string, StatLine>();
    const seasonDriverRows = new Map<number, Map<string, StatLine>>();
    const seasonTeamRows = new Map<number, Map<string, StatLine>>();
    const seasons = new Set<number>();
    let sessionCount = 0;

    const orderedRaces = [...(races ?? [])].sort(compareRaceOrder);
    const getOrCreate = (map: Map<string, StatLine>, key: string, name: string, slug: string | null, flag: string) => {
      let row = map.get(key);
      if (!row) { row = emptyStatLine(key, name, slug, flag); map.set(key, row); }
      return row;
    };
    const applySpecial = (map: Map<string, StatLine>, slug: string | null, field: "driverOfTheDay" | "fastestLaps") => {
      if (!slug) return;
      const d = driverBySlug.get(slug); if (!d) return;
      getOrCreate(map, d.slug, d.name, d.slug, d.flag)[field] += 1;
    };
    const applySprintSpecial = (map: Map<string, StatLine>, slug: string | null) => {
      if (!slug) return;
      const d = driverBySlug.get(slug); if (!d) return;
      getOrCreate(map, d.slug, d.name, d.slug, d.flag).sprintFastestLaps += 1;
    };

    for (const race of orderedRaces) {
      if (race.round_number === 0) continue;
      const year = seasonYearFromName(race.name); if (!year) continue;
      seasons.add(year);
      if (data.year != null && year !== data.year) continue;
      let seasonD = seasonDriverRows.get(year); if (!seasonD) { seasonD = new Map(); seasonDriverRows.set(year, seasonD); }
      let seasonT = seasonTeamRows.get(year); if (!seasonT) { seasonT = new Map(); seasonTeamRows.set(year, seasonT); }

      for (const session of ["qualifying", "race"] as const) {
        const text = session === "qualifying" ? race.qualifying_content : race.race_content;
        const lines = parseResultLines(text); if (!lines.length) continue;
        sessionCount += 1;
        for (const line of lines) {
          const d = driverByName.get(normalizeName(line.driver));
          const dKey = d?.slug ?? `name:${normalizeName(line.driver)}`;
          const dRow = getOrCreate(driverRows, dKey, d?.name ?? line.driver, d?.slug ?? null, d?.flag ?? "");
          const sdRow = getOrCreate(seasonD, dKey, d?.name ?? line.driver, d?.slug ?? null, d?.flag ?? "");
          applyResult(dRow, line, session); applyResult(sdRow, line, session);
          const t = (line.team ? teamByName.get(normalizeName(line.team)) : undefined) ?? (d?.current_team_slug ? teamBySlug.get(d.current_team_slug) : undefined) ?? (d?.team_slug ? teamBySlug.get(d.team_slug) : undefined);
          const tName = t?.name ?? line.team; if (!tName) continue;
          const tKey = t?.slug ?? `name:${normalizeName(tName)}`;
          applyResult(getOrCreate(teamRows, tKey, tName, t?.slug ?? null, t?.flag ?? ""), line, session);
          applyResult(getOrCreate(seasonT, tKey, tName, t?.slug ?? null, t?.flag ?? ""), line, session);
        }
      }

      const raceAny = race as any;
      if (raceAny.is_sprint_weekend) {
        for (const session of ["qualifying", "sprint"] as const) {
          const text = session === "qualifying" ? raceAny.sprint_qualifying_content : raceAny.sprint_content;
          const lines = parseResultLines(text); if (!lines.length) continue;
          sessionCount += 1;
          for (const line of lines) {
            const d = driverByName.get(normalizeName(line.driver));
            const dKey = d?.slug ?? `name:${normalizeName(line.driver)}`;
            applySprintResult(getOrCreate(driverRows, dKey, d?.name ?? line.driver, d?.slug ?? null, d?.flag ?? ""), line, session);
            applySprintResult(getOrCreate(seasonD, dKey, d?.name ?? line.driver, d?.slug ?? null, d?.flag ?? ""), line, session);
            const t = (line.team ? teamByName.get(normalizeName(line.team)) : undefined) ?? (d?.current_team_slug ? teamBySlug.get(d.current_team_slug) : undefined) ?? (d?.team_slug ? teamBySlug.get(d.team_slug) : undefined);
            const tName = t?.name ?? line.team; if (!tName) continue;
            const tKey = t?.slug ?? `name:${normalizeName(tName)}`;
            applySprintResult(getOrCreate(teamRows, tKey, tName, t?.slug ?? null, t?.flag ?? ""), line, session);
            applySprintResult(getOrCreate(seasonT, tKey, tName, t?.slug ?? null, t?.flag ?? ""), line, session);
          }
        }
        applySprintSpecial(driverRows, raceAny.sprint_fastest_lap_driver_slug);
        applySprintSpecial(seasonD, raceAny.sprint_fastest_lap_driver_slug);
        const sprintFast = driverBySlug.get(raceAny.sprint_fastest_lap_driver_slug ?? "");
        if (sprintFast) {
          const t = sprintFast.current_team_slug ? teamBySlug.get(sprintFast.current_team_slug) : sprintFast.team_slug ? teamBySlug.get(sprintFast.team_slug) : undefined;
          if (t) {
            getOrCreate(teamRows, t.slug, t.name, t.slug, t.flag).sprintFastestLaps += 1;
            getOrCreate(seasonT, t.slug, t.name, t.slug, t.flag).sprintFastestLaps += 1;
          }
        }
      }

      const specialDriverSlugs = [race.driver_of_the_day_slug, race.fastest_lap_driver_slug] as const;
      const awardFields = ["driverOfTheDay", "fastestLaps"] as const;
      for (let i = 0; i < specialDriverSlugs.length; i++) {
        const slug = specialDriverSlugs[i] ?? null; if (!slug) continue;
        applySpecial(driverRows, slug, awardFields[i]); applySpecial(seasonD, slug, awardFields[i]);
        const d = driverBySlug.get(slug); if (!d) continue;
        const matchingLine = parseResultLines(race.race_content).find(line => normalizeName(line.driver) === normalizeName(d.name));
        const t = (matchingLine?.team ? teamByName.get(normalizeName(matchingLine.team)) : undefined) ?? (d.current_team_slug ? teamBySlug.get(d.current_team_slug) : undefined) ?? (d.team_slug ? teamBySlug.get(d.team_slug) : undefined);
        if (t) {
          getOrCreate(teamRows, t.slug, t.name, t.slug, t.flag)[awardFields[i]] += 1;
          getOrCreate(seasonT, t.slug, t.name, t.slug, t.flag)[awardFields[i]] += 1;
        }
      }
    }

    const toRecord = (source: Map<number, Map<string, StatLine>>) => Object.fromEntries([...source.entries()].map(([year, rows]) => [String(year), sortStandings([...rows.values()])]));
    return { drivers: sortStandings([...driverRows.values()]), teams: sortStandings([...teamRows.values()]), seasonDrivers: toRecord(seasonDriverRows), seasonTeams: toRecord(seasonTeamRows), seasons: [...seasons].sort((a, b) => b - a), sessionCount };
  });
