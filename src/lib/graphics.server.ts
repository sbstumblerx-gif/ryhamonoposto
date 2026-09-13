import { parseResultLines, pointsForPosition, seasonYearFromName, normalizeName } from "./stats-compute";

type Team = { slug: string; name: string; color_key: string };
type Driver = { slug: string; name: string; flag: string; current_team_slug: string | null; team_slug: string | null; current_team_since: number | null; former_teams: any };
type Race = { name: string; slug: string; flag: string; round_number: number | null; race_date: string | null; qualifying_content: string | null; race_content: string | null };
type GraphPoint = { label: string; axisLabel: string; value: number; round: number; teamColor?: string; teamName?: string };

export const TEAM_COLORS: Record<string, string> = {
  red: "#ef4444", green: "#22c55e", yellow: "#eab308", cyan: "#06b6d4", blue: "#3b82f6",
  gray: "#9ca3af", darkred: "#991b1b", darkblue: "#1e3a8a", darkgreen: "#166534",
  purple: "#a855f7", orange: "#f97316", pink: "#ec4899", white: "#f5f5f5", black: "#111827",
};

export function teamColor(team?: Team | null) {
  const color = team?.color_key ?? "";
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  return TEAM_COLORS[color] ?? "#9ca3af";
}

function historicalTeam(driver: Driver | undefined, year: number | null, teams: Map<string, Team>) {
  if (!driver) return undefined;
  if (year) {
    const former = Array.isArray(driver.former_teams) ? driver.former_teams : [];
    const hit = former.find((t: any) => Number(t.from) <= year && year <= Number(t.to));
    if (hit?.slug) return teams.get(hit.slug);
  }
  if (driver.current_team_slug && (!year || driver.current_team_since == null || year >= driver.current_team_since)) return teams.get(driver.current_team_slug);
  return driver.team_slug ? teams.get(driver.team_slug) : undefined;
}

async function loadData() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: races, error: re }, { data: drivers, error: de }, { data: teams, error: te }] = await Promise.all([
    supabaseAdmin.from("races").select("name, slug, flag, round_number, race_date, qualifying_content, race_content").order("race_date", { ascending: true }),
    supabaseAdmin.from("drivers").select("slug, name, flag, current_team_slug, team_slug, current_team_since, former_teams"),
    supabaseAdmin.from("teams").select("slug, name, color_key"),
  ]);
  if (re) throw re; if (de) throw de; if (te) throw te;
  return { races: (races ?? []) as Race[], drivers: (drivers ?? []) as Driver[], teams: (teams ?? []) as Team[] };
}

export async function graphOptions() {
  const data = await loadData();
  const years = [...new Set(data.races.map(r => seasonYearFromName(r.name)).filter((x): x is number => x != null))].sort((a, b) => b - a);
  return {
    drivers: data.drivers.map(d => ({ slug: d.slug, name: d.name, flag: d.flag, team_slug: d.current_team_slug ?? d.team_slug })),
    teams: data.teams.map(t => ({ slug: t.slug, name: t.name, color: teamColor(t) })),
    seasons: years,
  };
}

export function signature(config: any) {
  return [config.target, config.season, [...config.participants].sort().join(","), config.chartType, config.range, config.metric].join("|");
}

const empty = () => ({ points: 0, wins: 0, podiums: 0, dnf: 0, dsq: 0, dns: 0, poles: 0, starts: 0 });

function add(acc: ReturnType<typeof empty>, line: any) {
  if (line.status === "FIN" && line.position != null) { acc.points += pointsForPosition(line.position); if (line.position === 1) acc.wins++; if (line.position <= 3) acc.podiums++; acc.starts++; }
  else if (line.status === "DNF") { acc.dnf++; acc.starts++; }
  else if (line.status === "DSQ") { acc.dsq++; acc.starts++; }
  else if (line.status === "DNS") acc.dns++;
}

function metric(acc: any, name: string) { return name === "championships" ? 0 : acc[name] ?? 0; }

function championshipCounts(races: Race[], target: "drivers" | "teams", driverByName: Map<string, Driver>, teamByName: Map<string, Team>, teamsBySlug: Map<string, Team>) {
  const seasons = new Map<number, Map<string, number>>();
  for (const race of races) {
    const year = seasonYearFromName(race.name); if (!year || race.round_number === 0) continue;
    const table = seasons.get(year) ?? new Map<string, number>(); seasons.set(year, table);
    for (const line of parseResultLines(race.race_content)) {
      if (line.status !== "FIN" || line.position == null) continue;
      const d = driverByName.get(normalizeName(line.driver));
      const t = line.team ? teamByName.get(normalizeName(line.team)) : historicalTeam(d, year, teamsBySlug);
      const key = target === "drivers" ? (d?.slug ?? normalizeName(line.driver)) : t?.slug;
      if (key) table.set(key, (table.get(key) ?? 0) + pointsForPosition(line.position));
    }
  }
  const out = new Map<string, number>();
  for (const table of seasons.values()) { const max = Math.max(...table.values(), 0); if (max <= 0) continue; for (const [key, pts] of table) if (pts === max) out.set(key, (out.get(key) ?? 0) + 1); }
  return out;
}

function sliceRange<T>(rows: T[], range: string) {
  if (range === "last5") return rows.slice(-5);
  if (range === "last10") return rows.slice(-10);
  if (range === "last20") return rows.slice(-20);
  return rows;
}

function makeSegments(points: GraphPoint[]) {
  if (!points.length) return [];
  const out: { color: string; data: GraphPoint[] }[] = [];
  let color = points[0]?.teamColor ?? "#9ca3af";
  let data: GraphPoint[] = [];
  for (const point of points) {
    const next = point.teamColor ?? "#9ca3af";
    if (next !== color && data.length) {
      const previous = data[data.length - 1]!;
      out.push({ color, data: [...data, point] });
      data = [previous, point]; color = next;
    } else data.push(point);
  }
  if (data.length) out.push({ color, data });
  return out;
}

export async function buildGraph(config: any) {
  const { races, drivers, teams } = await loadData();
  const driverBySlug = new Map(drivers.map(d => [d.slug, d]));
  const driverByName = new Map(drivers.map(d => [normalizeName(d.name), d]));
  const teamBySlug = new Map(teams.map(t => [t.slug, t]));
  const teamByName = new Map(teams.map(t => [normalizeName(t.name), t]));
  const season = config.season === "history" ? null : Number(config.season);
  let selected = races.filter(r => r.round_number !== 0 && (!season || seasonYearFromName(r.name) === season));
  selected = sliceRange(selected.sort((a, b) => (a.race_date ?? a.name).localeCompare(b.race_date ?? b.name)), config.range);
  const meta = config.participants.map((key: string) => {
    if (config.target === "drivers") { const d = driverBySlug.get(key) ?? driverByName.get(normalizeName(key)); return { key: d?.slug ?? key, name: d?.name ?? key, flag: d?.flag ?? "", team: historicalTeam(d, season, teamBySlug) }; }
    const t = teamBySlug.get(key) ?? teamByName.get(normalizeName(key)); return { key: t?.slug ?? key, name: t?.name ?? key, flag: "", team: t };
  });
  const totals = new Map<string, any>(); const series = new Map<string, GraphPoint[]>();
  meta.forEach((p: any) => { totals.set(p.key, empty()); series.set(p.key, []); });
  const championships = championshipCounts(races, config.target, driverByName, teamByName, teamBySlug);

  for (const race of selected) {
    const year = seasonYearFromName(race.name);
    const lines = parseResultLines(race.race_content);
    const q = parseResultLines(race.qualifying_content);
    const pole = new Set(q.filter(x => x.status === "FIN" && x.position === 1).map(x => driverByName.get(normalizeName(x.driver))?.slug ?? normalizeName(x.driver)));
    const byDriver = new Map(lines.map(line => [driverByName.get(normalizeName(line.driver))?.slug ?? normalizeName(line.driver), line]));
    for (const p of meta) {
      const acc = totals.get(p.key)!; let usedTeam: Team | undefined = p.team;
      if (config.target === "drivers") {
        const d = driverBySlug.get(p.key); const line = byDriver.get(p.key);
        if (line?.team) usedTeam = teamByName.get(normalizeName(line.team)) ?? usedTeam;
        if (!usedTeam) usedTeam = historicalTeam(d, year, teamBySlug);
        if (line) add(acc, line); if (pole.has(p.key)) acc.poles++;
      } else {
        const teamLines = lines.filter(line => teamByName.get(normalizeName(line.team ?? ""))?.slug === p.key);
        for (const line of teamLines) { add(acc, line); if (pole.has(driverByName.get(normalizeName(line.driver))?.slug ?? normalizeName(line.driver))) acc.poles++; }
      }
      series.get(p.key)!.push({ label: race.name, axisLabel: race.flag || `R${race.round_number ?? ""}`, value: metric(acc, config.metric), round: race.round_number ?? 0, teamColor: teamColor(usedTeam), teamName: usedTeam?.name });
    }
  }

  const totalsOut = meta.map((p: any) => ({ ...p, value: config.metric === "championships" ? championships.get(p.key) ?? 0 : metric(totals.get(p.key), config.metric), color: teamColor(p.team) }));
  const seriesOut = meta.map((p: any) => ({ ...p, color: teamColor(p.team), points: series.get(p.key), segments: makeSegments(series.get(p.key)!), championshipCount: championships.get(p.key) ?? 0 }));
  const metricNames: Record<string, string> = { points: "Pisteet", wins: "Voitot", podiums: "Podiumit", dnf: "DNF:t", dsq: "DSQ:t", dns: "DNS:t", poles: "Paalut", starts: "Startit", championships: "Maailmanmestaruudet" };
  return { title: `${metricNames[config.metric]} — ${config.season === "history" ? "Koko historia" : config.season}`, subtitle: config.target === "drivers" ? "Kuljettajat" : "Valmistajat / tiimit", config, series: seriesOut, totals: totalsOut };
}
