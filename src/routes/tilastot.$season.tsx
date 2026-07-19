import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSeason } from "@/lib/seasons.functions";
import { MediaGallery } from "@/components/MediaGallery";
import { Comments } from "@/components/Comments";
import { useState } from "react";

export const Route = createFileRoute("/tilastot/$season")({
  head: ({ params }) => ({ meta: [{ title: `${params.season} — Tilastot` }] }),
  component: SeasonPage,
});

const SECTIONS = [
  { key: "overall", label: "Koko historia" },
  { key: "drivers", label: "Kuljettajat" },
  { key: "teams", label: "Valmistajat" },
] as const;

function SeasonPage() {
  const { season } = Route.useParams();
  const get = useServerFn(getSeason);
  const q = useQuery({ queryKey: ["season", season], queryFn: () => get({ data: { slug: season } }) });
  const [sec, setSec] = useState<(typeof SECTIONS)[number]["key"]>("overall");

  const s = q.data;

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

      <MediaGallery scope={`season:${season}:${sec}`} />

      {s && <Comments entityType={`season:${season}:${sec}`} entityId={s.id} />}
    </div>
  );
}
