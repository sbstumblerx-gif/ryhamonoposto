import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  parseResultLines, seasonYearFromName, normalizeName,
  emptyStatLine, applyResult, sortStandings, type StatLine,
} from "./stats-compute";

export type StandingsResult = {
  drivers: StatLine[];
  teams: StatLine[];
  seasons: number[];
  sessionCount: number;
};

/** Recomputes every driver/team statistic from the race + qualifying result
 *  lists. `year` narrows the calculation to a single season. */
export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ year: z.number().int().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<StandingsResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: races }, { data: drivers }, { data: teams }] = await Promise.all([
      supabaseAdmin.from("races").select("name, qualifying_content, race_content"),
      supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, team_slug"),
      supabaseAdmin.from("teams").select("slug, name, flag"),
    ]);

    const driverByName = new Map((drivers ?? []).map(d => [normalizeName(d.name), d] as const));
    const teamByName = new Map((teams ?? []).map(t => [normalizeName(t.name), t] as const));
    const teamBySlug = new Map((teams ?? []).map(t => [t.slug, t] as const));

    const driverRows = new Map<string, StatLine>();
    const teamRows = new Map<string, StatLine>();
    const seasons = new Set<number>();
    let sessionCount = 0;

    for (const race of races ?? []) {
      const year = seasonYearFromName(race.name);
      if (year) seasons.add(year);
      if (data.year != null && year !== data.year) continue;

      for (const session of ["qualifying", "race"] as const) {
        const text = session === "qualifying" ? race.qualifying_content : race.race_content;
        const lines = parseResultLines(text);
        if (!lines.length) continue;
        sessionCount += 1;

        for (const line of lines) {
          const d = driverByName.get(normalizeName(line.driver));
          const dKey = d?.slug ?? `name:${normalizeName(line.driver)}`;
          let dRow = driverRows.get(dKey);
          if (!dRow) {
            dRow = emptyStatLine(dKey, d?.name ?? line.driver, d?.slug ?? null, d?.flag ?? "");
            driverRows.set(dKey, dRow);
          }
          applyResult(dRow, line, session);

          const t = (line.team ? teamByName.get(normalizeName(line.team)) : undefined)
            ?? (d?.current_team_slug ? teamBySlug.get(d.current_team_slug) : undefined)
            ?? (d?.team_slug ? teamBySlug.get(d.team_slug) : undefined);
          const tName = t?.name ?? line.team;
          if (!tName) continue;
          const tKey = t?.slug ?? `name:${normalizeName(tName)}`;
          let tRow = teamRows.get(tKey);
          if (!tRow) {
            tRow = emptyStatLine(tKey, tName, t?.slug ?? null, t?.flag ?? "");
            teamRows.set(tKey, tRow);
          }
          applyResult(tRow, line, session);
        }
      }
    }

    return {
      drivers: sortStandings([...driverRows.values()]),
      teams: sortStandings([...teamRows.values()]),
      seasons: [...seasons].sort((a, b) => b - a),
      sessionCount,
    };
  });
