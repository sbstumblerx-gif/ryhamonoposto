import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSeason, listSeasons } from "@/lib/seasons.functions";
import { getStandings } from "@/lib/stats.functions";
import { seasonYearFromName, aggregateNationalityRows } from "@/lib/stats-compute";
import { StandingsTable, STAT_FIELDS, type StatFieldKey } from "@/components/StandingsTable";
import { Comments } from "@/components/Comments";
import { useState } from "react";

export const Route = createFileRoute("/tilastot/$season")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.season} — Tilastot | RyhäMonoposto` },
      { name: "description", content: "Kauden automaattiset kuljettaja- ja valmistajatilastot." },
      { property: "og:title", content: `${params.season} — Tilastot` },
      { property: "og:description", content: "Kauden automaattiset kuljettaja- ja valmistajatilastot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeasonPage,
});

const SECTIONS = [
  { key: "drivers", label: "Kuljettajat" },
  { key: "teams", label: "Valmistajat" },
  { key: "driver-nationalities", label: "Kuljettajakansallisuudet" },
  { key: "team-nationalities", label: "Valmistajakansallisuudet" },
] as const;

function SeasonPage() {
  const { season } = Route.useParams();
  const get = useServerFn(getSeason);
  const listAllSeasons = useServerFn(listSeasons);
  const standings = useServerFn(getStandings);
  const q = useQuery({ queryKey: ["season", season], queryFn: () => get({ data: { slug: season } }) });
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: () => listAllSeasons() });
  const [sec, setSec] = useState<(typeof SECTIONS)[number]["key"]>("drivers");
  const [comparison, setComparison] = useState<StatFieldKey | "all">("all");

  const s = q.data;
  const year = seasonYearFromName(s?.name) ?? seasonYearFromName(season) ?? (s?.sort_order && s.sort_order > 2000 ? s.sort_order : null);
  const orderedSeasons = [...(seasonsQuery.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const seasonIndex = orderedSeasons.findIndex(item => item.slug === season);
  const previousSeason = seasonIndex > 0 ? orderedSeasons[seasonIndex - 1] : null;
  const nextSeason = seasonIndex >= 0 && seasonIndex < orderedSeasons.length - 1 ? orderedSeasons[seasonIndex + 1] : null;

  const st = useQuery({
    queryKey: ["standings", year],
    queryFn: () => standings({ data: { year } }),
    enabled: !q.isLoading,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav aria-label="Tilastokausien selaus" className="flex items-center justify-between gap-3 mb-4">
        {previousSeason ? <Link to="/tilastot/$season" params={{ season: previousSeason.slug }} className="inline-flex items-center gap-2 rounded border border-primary/40 px-3 py-2 text-sm hover:border-primary hover:bg-primary/10 transition" aria-label={`Edellinen kausi: ${previousSeason.name}`}><span aria-hidden="true">←</span><span className="hidden sm:inline">Edellinen</span></Link> : <Link to="/tilastot/koko-historia" className="inline-flex items-center gap-2 rounded border border-primary/40 px-3 py-2 text-sm hover:border-primary hover:bg-primary/10 transition" aria-label="Koko historia"><span aria-hidden="true">←</span><span className="hidden sm:inline">Koko historia</span></Link>}
        <Link to="/tilastot" className="text-xs text-muted-foreground uppercase tracking-widest hover:text-primary">Kaudet</Link>
        {nextSeason ? <Link to="/tilastot/$season" params={{ season: nextSeason.slug }} className="inline-flex items-center gap-2 rounded border border-primary/40 px-3 py-2 text-sm hover:border-primary hover:bg-primary/10 transition" aria-label={`Seuraava kausi: ${nextSeason.name}`}><span className="hidden sm:inline">Seuraava</span><span aria-hidden="true">→</span></Link> : <span aria-disabled="true" aria-label="Ei seuraavaa kautta" className="px-3 py-2 opacity-30">→</span>}
      </nav>
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary mt-2">{s?.name ?? season}</h1>
      <div className="hairline-red mt-3 mb-6" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {SECTIONS.map(x => (
          <button key={x.key} onClick={() => setSec(x.key)}
            className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded border ${sec === x.key ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 hover:border-primary"}`}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="card-dark p-3 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-display uppercase tracking-widest text-primary" htmlFor="season-stat">Vertailu</label>
        <select id="season-stat" value={comparison} onChange={e => setComparison(e.target.value as StatFieldKey | "all")}
          className="bg-black/70 border border-primary/30 rounded px-3 py-2 text-sm min-w-[220px]">
          <option value="all">Pisteet + kaikki tilastot</option>
          {STAT_FIELDS.map(f => <option key={f.key} value={f.key}>Vain {f.label.toLowerCase()}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">Oletus näyttää kaikki tilastot pisteiden mukaan. Yksittäinen vertailu näyttää vain valitun tilaston.</span>
      </div>

      {st.isLoading ? (
        <div className="text-sm text-muted-foreground">Lasketaan tilastoja…</div>
      ) : st.isError ? (
        <div className="text-sm text-muted-foreground">Tilastojen lataus epäonnistui. <button onClick={() => void st.refetch()} className="text-primary underline">Yritä uudelleen</button></div>
      ) : (
        <StandingsTable previousRows={sec === "drivers" ? (st.data?.previousDrivers ?? []) : sec === "teams" ? (st.data?.previousTeams ?? []) : aggregateNationalityRows(sec === "driver-nationalities" ? (st.data?.previousDrivers ?? []) : (st.data?.previousTeams ?? []))} rows={sec === "drivers" ? (st.data?.drivers ?? []) : sec === "teams" ? (st.data?.teams ?? []) : aggregateNationalityRows(sec === "driver-nationalities" ? (st.data?.drivers ?? []) : (st.data?.teams ?? []))} kind={sec === "drivers" ? "drivers" : sec === "teams" ? "teams" : "nationalities"} sortKey={comparison === "all" ? null : comparison} />
      )}

      {s && <Comments entityType={`season:${season}:${sec}`} entityId={s.id} />}
    </div>
  );
}
