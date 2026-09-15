import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSeason } from "@/lib/seasons.functions";
import { getStandings } from "@/lib/stats.functions";
import { seasonYearFromName } from "@/lib/stats-compute";
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
] as const;

function SeasonPage() {
  const { season } = Route.useParams();
  const get = useServerFn(getSeason);
  const standings = useServerFn(getStandings);
  const q = useQuery({ queryKey: ["season", season], queryFn: () => get({ data: { slug: season } }) });
  const [sec, setSec] = useState<(typeof SECTIONS)[number]["key"]>("drivers");
  const [comparison, setComparison] = useState<StatFieldKey | "all">("all");

  const s = q.data;
  const year = seasonYearFromName(s?.name) ?? seasonYearFromName(season) ?? (s?.sort_order && s.sort_order > 2000 ? s.sort_order : null);

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
      <Link to="/tilastot" className="text-xs text-muted-foreground uppercase tracking-widest hover:text-primary">← Kaudet</Link>
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
        <StandingsTable rows={(sec === "drivers" ? st.data?.drivers : st.data?.teams) ?? []} kind={sec} sortKey={comparison === "all" ? null : comparison} />
      )}

      {s && <Comments entityType={`season:${season}:${sec}`} entityId={s.id} />}
    </div>
  );
}
