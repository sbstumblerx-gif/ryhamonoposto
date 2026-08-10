import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/stats.functions";
import { StandingsTable } from "@/components/StandingsTable";
import { Comments } from "@/components/Comments";
import { useState } from "react";

export const Route = createFileRoute("/tilastot/koko-historia")({
  head: () => ({
    meta: [
      { title: "Koko historia — Tilastot | RyhäMonoposto" },
      { name: "description", content: "Kaikkien kausien yhteenlasketut kuljettaja- ja valmistajatilastot." },
      { property: "og:title", content: "Koko historia — Tilastot" },
      { property: "og:description", content: "Kaikkien kausien yhteenlasketut kuljettaja- ja valmistajatilastot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FullHistoryPage,
});

const SECTIONS = [
  { key: "drivers", label: "Kuljettajat" },
  { key: "teams", label: "Valmistajat" },
] as const;

function FullHistoryPage() {
  const [sec, setSec] = useState<(typeof SECTIONS)[number]["key"]>("drivers");
  const standings = useServerFn(getStandings);
  const st = useQuery({ queryKey: ["standings", "all"], queryFn: () => standings({ data: { year: null } }) });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/tilastot" className="text-xs text-muted-foreground uppercase tracking-widest hover:text-primary">← Kaudet</Link>
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary mt-2">Koko historia</h1>
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
      <Comments entityType={`history:${sec}`} entityId="00000000-0000-0000-0000-000000000000" />
    </div>
  );
}
