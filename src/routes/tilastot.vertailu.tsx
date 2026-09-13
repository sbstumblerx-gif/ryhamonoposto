import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/stats.functions";
import { StandingsTable } from "@/components/StandingsTable";
import { useState } from "react";

export const Route = createFileRoute("/tilastot/vertailu")({
  head: () => ({ meta: [{ title: "Valitse vertailu — Tilastot | RyhäMonoposto" }] }),
  component: ComparisonPage,
});

const METRICS = [
  { key: "points", label: "Eniten pisteitä" },
  { key: "wins", label: "Eniten voittoja" },
  { key: "podiums", label: "Eniten podiumeja" },
  { key: "poles", label: "Eniten paalupaikkoja" },
  { key: "dnf", label: "Eniten DNF" },
  { key: "dsq", label: "Eniten DSQ" },
  { key: "dns", label: "Eniten DNS" },
  { key: "ret", label: "Eniten RET" },
  { key: "fastestLaps", label: "Eniten nopeimpia kierroksia" },
  { key: "driverOfTheDay", label: "Eniten päivän kuljettaja" },
  { key: "starts", label: "Eniten startteja" },
] as const;

function ComparisonPage() {
  const standings = useServerFn(getStandings);
  const [kind, setKind] = useState<"drivers" | "teams">("drivers");
  const [year, setYear] = useState<string>("history");
  const [sortKey, setSortKey] = useState<(typeof METRICS)[number]["key"]>("points");
  const q = useQuery({
    queryKey: ["comparison", year],
    queryFn: () => standings({ data: { year: year === "history" ? null : Number(year) } }),
  });

  const rows = kind === "drivers" ? q.data?.drivers ?? [] : q.data?.teams ?? [];
  const sortedRows = [...rows].sort((a, b) => {
    const diff = Number(b[sortKey]) - Number(a[sortKey]);
    if (diff !== 0) return diff;
    if (a.points !== b.points) return b.points - a.points;
    return a.name.localeCompare(b.name, "fi");
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <Link to="/tilastot" className="text-xs text-muted-foreground uppercase tracking-widest hover:text-primary">← Tilastot</Link>
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary mt-2">Valitse vertailu</h1>
      <div className="hairline-red mt-3 mb-3" />
      <p className="text-sm text-muted-foreground mb-6">Valitse, minkä tilaston mukaan lista rankataan. Taulukossa näet samalla kaikki muut tilastot.</p>

      <section className="card-dark p-5 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <label className="text-sm">Vertailtavat
            <select value={kind} onChange={e => setKind(e.target.value as "drivers" | "teams")} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
              <option value="drivers">Kuljettajat</option>
              <option value="teams">Tiimit / valmistajat</option>
            </select>
          </label>
          <label className="text-sm">Kausi
            <select value={year} onChange={e => setYear(e.target.value)} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
              <option value="history">Koko historia</option>
              {(q.data?.seasons ?? []).map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </label>
          <label className="text-sm">Järjestä tämän mukaan
            <select value={sortKey} onChange={e => setSortKey(e.target.value as (typeof METRICS)[number]["key"])} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
              {METRICS.map(metric => <option key={metric.key} value={metric.key}>{metric.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">Nykyinen järjestys: <span className="text-primary">{METRICS.find(m => m.key === sortKey)?.label}</span>. Tasatilanteessa pisteet ratkaisevat, ja sen jälkeen nimi.</div>
      </section>

      {q.isLoading ? <div className="text-sm text-muted-foreground">Lasketaan vertailua…</div> : <StandingsTable rows={sortedRows} kind={kind} sortKey={sortKey} />}
    </div>
  );
}
