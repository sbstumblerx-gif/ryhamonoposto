import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRace, upsertRace } from "@/lib/content.functions";
import { useEntityIndex } from "@/components/useEntityIndex";
import { SmartText } from "@/components/SmartText";
import { Comments } from "@/components/Comments";
import { MediaUpload } from "@/components/MediaUpload";
import { EditableText } from "@/components/EditableText";
import { useAdmin } from "@/components/admin-store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/kilpailut/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Kilpailu` }, { name: "description", content: "Aika-ajon ja kisan tulokset." }] }),
  component: RaceDetail,
});

function RaceDetail() {
  const { slug } = Route.useParams();
  const get = useServerFn(getRace);
  const save = useServerFn(upsertRace);
  const qc = useQueryClient();
  const admin = useAdmin();
  const entities = useEntityIndex();

  const q = useQuery({ queryKey: ["race", slug], queryFn: () => get({ data: { slug } }) });
  const [tab, setTab] = useState<"qualifying" | "race">("qualifying");

  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8">Ladataan…</div>;
  const r = q.data;
  if (!r) return <div className="mx-auto max-w-4xl px-4 py-8">Kilpailua ei löydy.</div>;

  async function patch(partial: Partial<{ qualifying_content: string; race_content: string; qualifying_media_url: string | null; race_media_url: string | null }>) {
    if (!r) return;
    await save({ data: { id: r.id, name: r.name, flag: r.flag, race_date: r.race_date,
      qualifying_content: partial.qualifying_content ?? r.qualifying_content ?? "",
      race_content: partial.race_content ?? r.race_content ?? "",
      qualifying_media_url: partial.qualifying_media_url ?? r.qualifying_media_url ?? null,
      race_media_url: partial.race_media_url ?? r.race_media_url ?? null,
    }});
    await qc.invalidateQueries({ queryKey: ["race", slug] });
    toast.success("Tallennettu");
  }

  const activeContent = tab === "qualifying" ? (r.qualifying_content ?? "") : (r.race_content ?? "");
  const activeMedia = tab === "qualifying" ? r.qualifying_media_url : r.race_media_url;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{r.flag}</span>
        <h1 className="font-display uppercase tracking-widest text-2xl md:text-3xl">{r.name}</h1>
      </div>
      <div className="hairline-red mt-3 mb-6" />

      <div className="flex gap-2 mb-4">
        {(["qualifying", "race"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded border ${tab === k ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 hover:border-primary"}`}>
            {k === "qualifying" ? "Aika-ajo" : "Kisa"}
          </button>
        ))}
      </div>

      {activeMedia && (
        <img src={activeMedia} alt="" className="w-full rounded border border-primary/30 mb-4" />
      )}

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-4 space-y-3">
          <MediaUpload
            label={tab === "qualifying" ? "Aika-ajokuva" : "Kisakuva"}
            currentUrl={activeMedia}
            onUploaded={(url) => patch(tab === "qualifying" ? { qualifying_media_url: url } : { race_media_url: url })}
          />
          <EditableText
            value={activeContent}
            multiline
            placeholder="Kirjoita tulostiedot… nimet linkittyvät automaattisesti."
            onSave={(v) => patch(tab === "qualifying" ? { qualifying_content: v } : { race_content: v })}
          />
        </div>
      )}

      <SmartText text={activeContent} entities={entities} className="text-sm leading-6" />

      <Comments entityType={`race:${tab}`} entityId={r.id} />
    </div>
  );
}
