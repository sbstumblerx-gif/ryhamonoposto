import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/stats.functions";
import type { StatLine } from "@/lib/stats-compute";

const FIELDS = [
  { key: "points", label: "Pisteet" }, { key: "wins", label: "Voitot" }, { key: "podiums", label: "Podiumit" }, { key: "poles", label: "Paalupaikat" },
  { key: "driverOfTheDay", label: "Päivän kuljettaja" }, { key: "fastestLaps", label: "Nopein kierros" }, { key: "starts", label: "Startit" }, { key: "best", label: "Paras sijoitus" },
  { key: "dnf", label: "DNF" }, { key: "dsq", label: "DSQ" }, { key: "dns", label: "DNS" }, { key: "ret", label: "RET" },
] as const;

type FieldKey = typeof FIELDS[number]["key"];
type Ranked = { rank: number; seasonRank: number; season: number | null };

function statValue(row: StatLine, key: FieldKey): number {
  const value = row[key];
  return value == null ? Number.POSITIVE_INFINITY : value;
}

function rankRows(rows: StatLine[], key: FieldKey): Map<string, number> {
  const values = rows.map(row => ({ key: row.key, value: statValue(row, key) }));
  const descending = key !== "best";
  values.sort((a, b) => {
    if (a.value === b.value) return 0;
    if (a.value === Number.POSITIVE_INFINITY) return 1;
    if (b.value === Number.POSITIVE_INFINITY) return -1;
    return descending ? b.value - a.value : a.value - b.value;
  });
  const ranks = new Map<string, number>();
  values.forEach((entry, index) => {
    const better = values.filter(other => descending ? other.value > entry.value : other.value < entry.value).length;
    ranks.set(entry.key, better + 1);
  });
  return ranks;
}

function medalClass(rank: number): string {
  if (rank === 1) return "bg-yellow-500/25 border border-yellow-400/60 text-yellow-200";
  if (rank === 2) return "bg-slate-300/20 border border-slate-300/50 text-slate-100";
  if (rank === 3) return "bg-orange-700/25 border border-orange-500/60 text-orange-200";
  return "";
}

export function EntityStats({ kind, slug }: { kind: "drivers" | "teams"; slug: string }) {
  const fn = useServerFn(getStandings);
  const q = useQuery({ queryKey: ["standings", "all"], queryFn: () => fn({ data: { year: null } }) });
  if (q.isLoading) return <div className="text-sm text-muted-foreground">Lasketaan tilastoja…</div>;
  const allRows = (kind === "drivers" ? q.data?.drivers : q.data?.teams) ?? [];
  const row = allRows.find(r => r.slug === slug);
  if (!row) return <p className="text-sm text-muted-foreground italic">Ei vielä tuloksia laskettavaksi.</p>;

  const seasonRows = kind === "drivers" ? q.data?.seasonDrivers ?? {} : q.data?.seasonTeams ?? {};
  const matchingSeasons = Object.entries(seasonRows)
    .filter(([, rows]) => rows.some(r => r.key === row.key || r.slug === slug))
    .map(([year]) => Number(year))
    .sort((a, b) => b - a);
  const lastSeason = matchingSeasons[0] ?? null;
  const lastSeasonRows = lastSeason == null ? [] : seasonRows[String(lastSeason)] ?? [];

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">Lasketaan automaattisesti kaikista sessioista ja kilpailun palkinnoista</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {FIELDS.map(f => {
          const historyRanks = rankRows(allRows, f.key);
          const seasonRanks = rankRows(lastSeasonRows, f.key);
          const rank = historyRanks.get(row.key) ?? 1;
          const seasonRow = lastSeasonRows.find(r => r.key === row.key || r.slug === slug);
          const seasonRank = seasonRow ? (seasonRanks.get(seasonRow.key) ?? 1) : 1;
          return (
            <div key={f.key} className="card-dark p-3 text-center min-h-[118px] flex flex-col items-center justify-center">
              <div className="font-display text-2xl text-primary">{row[f.key] ?? "–"}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{f.label}</div>
              <div className="text-[10px] text-muted-foreground leading-5">
                <div>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 ${medalClass(rank)}`}>Sija {rank}</span>
                  <span className="ml-1">kok. hist.</span>
                </div>
                {lastSeason != null && (
                  <div>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 ${medalClass(seasonRank)}`}>Sija {seasonRank}</span>
                    <span className="ml-1">- {lastSeason}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
