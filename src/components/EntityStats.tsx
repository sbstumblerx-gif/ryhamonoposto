import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/stats.functions";
import { statRanks, rankingChanges } from "@/lib/stats-compute";
import { RankChange } from "@/components/RankChange";

const FIELDS = [
  { key: "points", label: "Pisteet" }, { key: "positionChange", label: "Sijoitusmuutos" }, { key: "wins", label: "Voitot" }, { key: "podiums", label: "Podiumit" }, { key: "poles", label: "Paalupaikat" },
  { key: "driverOfTheDay", label: "Päivän kuljettaja" }, { key: "fastestLaps", label: "Nopeimmat kierrokset" }, { key: "starts", label: "Startit" }, { key: "best", label: "Paras sijoitus" },
  { key: "dnf", label: "DNF" }, { key: "dsq", label: "DSQ" }, { key: "dns", label: "DNS" }, { key: "ret", label: "RET" },
  { key: "sprintPoints", label: "Sprinttipisteet" }, { key: "sprintWins", label: "Sprinttivoitot" }, { key: "sprintPodiums", label: "Sprinttipodiumit" }, { key: "sprintPoles", label: "Sprinttipaalut" },
  { key: "sprintFastestLaps", label: "Sprintin nopeimmat kierrokset" }, { key: "sprintStarts", label: "Sprinttistartit" }, { key: "sprintBest", label: "Sprintin paras sijoitus" },
  { key: "sprintDnf", label: "Sprintti-DNF" }, { key: "sprintDsq", label: "Sprintti-DSQ" }, { key: "sprintDns", label: "Sprintti-DNS" }, { key: "sprintRet", label: "Sprintti-RET" },
] as const;
function medalClass(rank: number): string { if (rank === 1) return "bg-yellow-500/25 border border-yellow-400/60 text-yellow-200"; if (rank === 2) return "bg-slate-300/20 border border-slate-300/50 text-slate-100"; if (rank === 3) return "bg-orange-700/25 border border-orange-500/60 text-orange-200"; return ""; }

export function EntityStats({ kind, slug }: { kind: "drivers" | "teams"; slug: string }) {
  const fn = useServerFn(getStandings);
  const q = useQuery({ queryKey: ["standings", "all"], queryFn: () => fn({ data: { year: null } }), retry: 3, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000), staleTime: 60_000 });
  if (q.isLoading) return <div className="text-sm text-muted-foreground">Lasketaan tilastoja…</div>;
  if (q.isError) return <div className="text-sm text-muted-foreground">Tilastojen lataus epäonnistui. <button onClick={() => void q.refetch()} className="text-primary underline">Yritä uudelleen</button></div>;
  const allRows = (kind === "drivers" ? q.data?.drivers : q.data?.teams) ?? [];
  const row = allRows.find(r => r.slug === slug);
  if (!row) return <p className="text-sm text-muted-foreground italic">Ei vielä tuloksia laskettavaksi.</p>;
  const seasonRows = kind === "drivers" ? q.data?.seasonDrivers ?? {} : q.data?.seasonTeams ?? {};
  const matchingSeasons = Object.entries(seasonRows).filter(([, rows]) => rows.some(r => r.key === row.key || r.slug === slug)).map(([year]) => Number(year)).sort((a, b) => b - a);
  const lastSeason = matchingSeasons[0] ?? null;
  const lastSeasonRows = lastSeason == null ? [] : seasonRows[String(lastSeason)] ?? [];
  const previousRows = (kind === "drivers" ? q.data?.previousDrivers : q.data?.previousTeams) ?? [];
  const previousSeasonRows = (kind === "drivers" ? q.data?.previousSeasonDrivers : q.data?.previousSeasonTeams) ?? {};
  return <div><p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">Sijoitukset lasketaan koko historiasta ja viimeisimmästä kilpailukaudesta</p><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{FIELDS.map(f => { const historyRank = statRanks(allRows, f.key).get(row.key) ?? 1; const seasonRow = lastSeasonRows.find(r => r.key === row.key || r.slug === slug); const seasonRank = seasonRow ? (statRanks(lastSeasonRows, f.key).get(seasonRow.key) ?? 1) : null; return <div key={f.key} className="card-dark p-3 text-center min-h-[118px] flex flex-col items-center justify-center"><div className="font-display text-2xl text-primary">{f.key === "positionChange" && row.positionChange > 0 ? `+${row.positionChange}` : row[f.key] ?? "–"}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{f.label}</div><div className="text-[10px] text-muted-foreground leading-5"><div><span className={`inline-flex items-center rounded px-1.5 py-0.5 ${medalClass(historyRank)}`}>Sija {historyRank}</span><RankChange change={rankingChanges(allRows, previousRows, f.key).get(row.key)} /><span className="ml-1">kok. hist.</span></div>{lastSeason != null && seasonRank != null && <div><span className={`inline-flex items-center rounded px-1.5 py-0.5 ${medalClass(seasonRank)}`}>Sija {seasonRank}</span><RankChange change={rankingChanges(lastSeasonRows, previousSeasonRows[String(lastSeason)] ?? [], f.key).get(seasonRow?.key ?? row.key)} /><span className="ml-1">- {lastSeason}</span></div>}</div></div>; })}</div></div>;
}
