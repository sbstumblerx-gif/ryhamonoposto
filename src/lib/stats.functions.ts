import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseResultLines, seasonYearFromName, normalizeName, emptyStatLine, applyResult, sortStandings, type StatLine } from "./stats-compute";

export type SeasonStandings = Record<string, StatLine[]>;
export type StandingsResult = { drivers: StatLine[]; teams: StatLine[]; seasons: number[]; sessionCount: number; seasonDrivers: SeasonStandings; seasonTeams: SeasonStandings };

export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ year: z.number().int().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<StandingsResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: races }, { data: drivers }, { data: teams }] = await Promise.all([
      supabaseAdmin.from("races").select("name, round_number, qualifying_content, race_content, driver_of_the_day_slug, fastest_lap_driver_slug"),
      supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, team_slug"),
      supabaseAdmin.from("teams").select("slug, name, flag"),
    ]);
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

    function getSeasonRow(map: Map<number, Map<string, StatLine>>, year: number, key: string, name: string, slug: string | null, flag: string) {
      let rows = map.get(year);
      if (!rows) { rows = new Map<string, StatLine>(); map.set(year, rows); }
      let row = rows.get(key);
      if (!row) { row = emptyStatLine(key, name, slug, flag); rows.set(key, row); }
      return row;
    }

    for (const race of races ?? []) {
      if (race.round_number === 0) continue;
      const year = seasonYearFromName(race.name);
      if (year) seasons.add(year);
      if (data.year != null && year !== data.year) continue;
      if (!year) continue;

      const awardDriver = race.driver_of_the_day_slug ? driverBySlug.get(race.driver_of_the_day_slug) : undefined;
      const fastestDriver = race.fastest_lap_driver_slug ? driverBySlug.get(race.fastest_lap_driver_slug) : undefined;
      const seasonDriversForRace = seasonDriverRows.get(year) ?? new Map<string, StatLine>();
      const seasonTeamsForRace = seasonTeamRows.get(year) ?? new Map<string, StatLine>();
      seasonDriverRows.set(year, seasonDriversForRace);
      seasonTeamRows.set(year, seasonTeamsForRace);

      for (const session of ["qualifying", "race"] as const) {
        const text = session === "qualifying" ? race.qualifying_content : race.race_content;
        const lines = parseResultLines(text);
        if (!lines.length) continue;
        sessionCount++;
        for (const line of lines) {
          const d = driverByName.get(normalizeName(line.driver));
          const dKey = d?.slug ?? `name:${normalizeName(line.driver)}`;
          let dRow = driverRows.get(dKey);
          if (!dRow) { dRow = emptyStatLine(dKey, d?.name ?? line.driver, d?.slug ?? null, d?.flag ?? ""); driverRows.set(dKey, dRow); }
          applyResult(dRow, line, session);
          const sdRow = getSeasonRow(seasonDriverRows, year, dKey, d?.name ?? line.driver, d?.slug ?? null, d?.flag ?? "");
          applyResult(sdRow, line, session);

          const t = (line.team ? teamByName.get(normalizeName(line.team)) : undefined) ?? (d?.current_team_slug ? teamBySlug.get(d.current_team_slug) : undefined) ?? (d?.team_slug ? teamBySlug.get(d.team_slug) : undefined);
          const tName = t?.name ?? line.team;
          if (!tName) continue;
          const tKey = t?.slug ?? `name:${normalizeName(tName)}`;
          let tRow = teamRows.get(tKey);
          if (!tRow) { tRow = emptyStatLine(tKey, tName, t?.slug ?? null, t?.flag ?? ""); teamRows.set(tKey, tRow); }
          applyResult(tRow, line, session);
          const stRow = getSeasonRow(seasonTeamRows, year, tKey, tName, t?.slug ?? null, t?.flag ?? "");
          applyResult(stRow, line, session);
        }
      }

      if (awardDriver) {
        const dKey = awardDriver.slug;
        let row = driverRows.get(dKey);
        if (!row) { row = emptyStatLine(dKey, awardDriver.name, awardDriver.slug, awardDriver.flag ?? ""); driverRows.set(dKey, row); }
        row.driverOfTheDay++;
        const sr = getSeasonRow(seasonDriverRows, year, dKey, awardDriver.name, awardDriver.slug, awardDriver.flag ?? "");
        sr.driverOfTheDay++;
        const team = awardDriver.current_team_slug ? teamBySlug.get(awardDriver.current_team_slug) : awardDriver.team_slug ? teamBySlug.get(awardDriver.team_slug) : undefined;
        if (team) {
          let tr = teamRows.get(team.slug);
          if (!tr) { tr = emptyStatLine(team.slug, team.name, team.slug, team.flag ?? ""); teamRows.set(team.slug, tr); }
          tr.driverOfTheDay++;
          const str = getSeasonRow(seasonTeamRows, year, team.slug, team.name, team.slug, team.flag ?? "");
          str.driverOfTheDay++;
        }
      }

      if (fastestDriver) {
        const dKey = fastestDriver.slug;
        let row = driverRows.get(dKey);
        if (!row) { row = emptyStatLine(dKey, fastestDriver.name, fastestDriver.slug, fastestDriver.flag ?? ""); driverRows.set(dKey, row); }
        row.fastestLaps++;
        const sr = getSeasonRow(seasonDriverRows, year, dKey, fastestDriver.name, fastestDriver.slug, fastestDriver.flag ?? "");
        sr.fastestLaps++;
        const team = fastestDriver.current_team_slug ? teamBySlug.get(fastestDriver.current_team_slug) : fastestDriver.team_slug ? teamBySlug.get(fastestDriver.team_slug) : undefined;
        if (team) {
          let tr = teamRows.get(team.slug);
          if (!tr) { tr = emptyStatLine(team.slug, team.name, team.slug, team.flag ?? ""); teamRows.set(team.slug, tr); }
          tr.fastestLaps++;
          const str = getSeasonRow(seasonTeamRows, year, team.slug, team.name, team.slug, team.flag ?? "");
          str.fastestLaps++;
        }
      }
    }

    return {
      drivers: sortStandings([...driverRows.values()]),
      teams: sortStandings([...teamRows.values()]),
      seasons: [...seasons].sort((a, b) => b - a),
      sessionCount,
      seasonDrivers: Object.fromEntries([...seasonDriverRows.entries()].map(([year, rows]) => [year, sortStandings([...rows.values()])])),
      seasonTeams: Object.fromEntries([...seasonTeamRows.entries()].map(([year, rows]) => [year, sortStandings([...rows.values()])])),
    };
  });
