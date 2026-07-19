import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDriver, updateDriver } from "@/lib/content.functions";
import { useEntityIndex } from "@/components/useEntityIndex";
import { SmartText } from "@/components/SmartText";
import { Comments } from "@/components/Comments";
import { MediaUpload } from "@/components/MediaUpload";
import { EditableText } from "@/components/EditableText";
import { MediaGallery } from "@/components/MediaGallery";
import { useAdmin } from "@/components/admin-store";
import { gradientFor } from "@/lib/team-colors";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/kuljettajat/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Kuljettaja` }] }),
  component: DriverPage,
});

function DriverPage() {
  const { slug } = Route.useParams();
  const get = useServerFn(getDriver);
  const save = useServerFn(updateDriver);
  const qc = useQueryClient();
  const admin = useAdmin();
  const entities = useEntityIndex();
  const [tab, setTab] = useState<"stats" | "history">("stats");

  const q = useQuery({ queryKey: ["driver", slug], queryFn: () => get({ data: { slug } }) });
  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8">Ladataan…</div>;
  const d = q.data;
  if (!d) return <div className="mx-auto max-w-4xl px-4 py-8">Kuljettajaa ei löydy.</div>;

  async function patch(p: Partial<{ content: string; hero_media_url: string | null }>) {
    await save({ data: { slug, ...p } });
    await qc.invalidateQueries({ queryKey: ["driver", slug] });
    toast.success("Tallennettu");
  }

  return (
    <div>
      <div className="w-full py-14 border-b border-primary/40" style={{ background: gradientFor(d.color_key) }}>
        <div className="mx-auto max-w-4xl px-4 flex items-center gap-4">
          <span className="font-display text-6xl md:text-7xl">#{d.number}</span>
          <div>
            <div className="text-2xl">{d.flag}</div>
            <h1 className="font-display uppercase tracking-widest text-2xl md:text-4xl">{d.name}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {d.hero_media_url && <img src={d.hero_media_url} alt={d.name} className="w-full rounded border border-primary/30 mb-4" />}

        {admin.isAdmin && (
          <div className="card-dark p-3 mb-4 space-y-3">
            <MediaUpload currentUrl={d.hero_media_url} onUploaded={(url) => patch({ hero_media_url: url })} label="Pääkuva" />
            <EditableText value={d.content ?? ""} multiline placeholder="Kuljettajan esittely…" onSave={(v) => patch({ content: v })} />
          </div>
        )}

        <SmartText text={d.content} entities={entities} className="text-sm leading-6 mb-6" />

        <div className="flex gap-2 mb-3">
          {(["stats", "history"] as const).map(k => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded border ${tab === k ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 hover:border-primary"}`}>
              {k === "stats" ? "Tilastot" : "Kisahistoria"}
            </button>
          ))}
        </div>

        <MediaGallery scope={`driver:${slug}:${tab}`} />

        <Comments entityType="driver" entityId={d.id} />
      </div>
    </div>
  );
}
