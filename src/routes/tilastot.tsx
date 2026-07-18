import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStatsPage, updateStats } from "@/lib/content.functions";
import { useEntityIndex } from "@/components/useEntityIndex";
import { SmartText } from "@/components/SmartText";
import { Comments } from "@/components/Comments";
import { MediaUpload } from "@/components/MediaUpload";
import { EditableText } from "@/components/EditableText";
import { useAdmin } from "@/components/admin-store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/tilastot")({
  head: () => ({ meta: [{ title: "Tilastot — RyhäMonoposto" }] }),
  component: Stats,
});

function Stats() {
  const [tab, setTab] = useState<"drivers" | "teams">("drivers");
  const get = useServerFn(getStatsPage);
  const save = useServerFn(updateStats);
  const qc = useQueryClient();
  const admin = useAdmin();
  const entities = useEntityIndex();
  const q = useQuery({ queryKey: ["stats", tab], queryFn: () => get({ data: { id: tab } }) });

  const p = q.data;

  async function patch(patch: Partial<{ content: string; hero_media_url: string | null }>) {
    await save({ data: { id: tab, ...patch } });
    await qc.invalidateQueries({ queryKey: ["stats", tab] });
    toast.success("Tallennettu");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Tilastot</h1>
      <div className="hairline-red mt-3 mb-6" />

      <div className="flex gap-2 mb-4">
        {(["drivers", "teams"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded border ${tab === k ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 hover:border-primary"}`}>
            {k === "drivers" ? "Kuljettajat" : "Valmistajat"}
          </button>
        ))}
      </div>

      {p?.hero_media_url && <img src={p.hero_media_url} alt="" className="w-full rounded border border-primary/30 mb-4" />}

      {admin.isAdmin && p && (
        <div className="card-dark p-3 mb-4 space-y-3">
          <MediaUpload currentUrl={p.hero_media_url} onUploaded={(url) => patch({ hero_media_url: url })} label="Tilastokuva" />
          <EditableText value={p.content ?? ""} multiline placeholder="Tilastot…" onSave={(v) => patch({ content: v })} />
        </div>
      )}

      <SmartText text={p?.content} entities={entities} className="text-sm leading-6" />

      {p && <Comments entityType={`stats:${tab}`} entityId={p.id} />}
    </div>
  );
}
