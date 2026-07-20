import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaGallery } from "@/components/MediaGallery";
import { Comments } from "@/components/Comments";
import { useState } from "react";

export const Route = createFileRoute("/tilastot/koko-historia")({
  head: () => ({ meta: [{ title: "Koko historia — Tilastot" }] }),
  component: FullHistoryPage,
});

const SECTIONS = [
  { key: "drivers", label: "Kuljettajat" },
  { key: "teams", label: "Valmistajat" },
] as const;

function FullHistoryPage() {
  const [sec, setSec] = useState<(typeof SECTIONS)[number]["key"]>("drivers");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/tilastot"
        className="text-xs text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors inline-block mb-2"
      >
        ← Kaudet
      </Link>
      
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary mt-2">
        Koko historia
      </h1>
      <div className="hairline-red mt-3 mb-6" />

      {/* Osiolehti-painikkeet */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {SECTIONS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setSec(x.key)}
            className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded border transition-colors ${
              sec === x.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-primary/40 hover:border-primary"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* Galleriamedia osion mukaan */}
      <MediaGallery scope={`history:${sec}`} />

      {/* Kommentit eroteltuina osion mukaan */}
      <Comments entityType="history" entityId={`history-page-${sec}`} />
    </div>
  );
}
