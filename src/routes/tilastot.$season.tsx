import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSeason } from "@/lib/seasons.functions";
import { getStandings } from "@/lib/stats.functions";
import { seasonYearFromName } from "@/lib/stats-compute";
import { StandingsTable } from "@/components/StandingsTable";
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

  const s = q.data;
  const year = seasonYearFromName(s?.name) ?? seasonYearFromName(season) ?? (s?.sort_order && s.sort_order > 2000 ? s.sort_order : null);

  const st = useQuery({
    queryKey: ["standings", year],
    queryFn: () => standings({ data: { year } }),
    enabled: !q.isLoading,
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

      {st.isLoading ? (
        <div className="text-sm text-muted-foreground">Lasketaan tilastoja…</div>
      ) : (
        <StandingsTable rows={(sec === "drivers" ? st.data?.drivers : st.data?.teams) ?? []} kind={sec} />
      )}

      {s && <Comments entityType={`season:${season}:${sec}`} entityId={s.id} />}
    </div>
  );
}
