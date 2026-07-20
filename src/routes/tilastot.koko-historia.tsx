import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaGallery } from "@/components/MediaGallery";
import { Comments } from "@/components/Comments";
import { useState } from "react";

export const Route = createFileRoute("/tilastot/koko-historia")({
  head: () => ({ meta: [{ title: "Koko historia — Tilastot" }] }),
  component: FullHistoryPage,
});

const SECTIONS = [
  { key: "overall", label: "Yleistilasto" },
  { key: "drivers", label: "Kuljettajat" },
  { key: "teams", label: "Valmistajat" },
] as const;

function FullHistoryPage() {
  const [sec, setSec] = useState<(typeof SECTIONS)[number]["key"]>("overall");
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
      <MediaGallery scope={`history:${sec}`} />
      <Comments entityType={`history:${sec}`} entityId="00000000-0000-0000-0000-000000000000" />
    </div>
  );
}
