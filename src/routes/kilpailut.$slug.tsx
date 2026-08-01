import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRace, upsertRace } from "@/lib/content.functions";
import { generateResultList } from "@/lib/ai-results.functions";
import { useEntityIndex } from "@/components/useEntityIndex";
import { SmartText } from "@/components/SmartText";
import { Comments } from "@/components/Comments";
import { MediaUpload } from "@/components/MediaUpload";
import { EditableText } from "@/components/EditableText";
import { useAdmin } from "@/components/admin-store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/kilpailut/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Kilpailu` }] }),
  component: RaceDetail,
});

function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.searchParams.get("v")) id = u.searchParams.get("v") ?? "";
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/embed/")[1] ?? "";
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/shorts/")[1] ?? "";
    if (!id) return null;
    return `https://www.youtube.com/embed/${id.split(/[?&]/)[0]}`;
  } catch {
    return null;
  }
}

function YouTubePreview({ url }: { url: string | null | undefined }) {
  const embed = youtubeEmbedUrl(url);
  if (!embed) return null;
  return (
    <div className="mt-2 aspect-video w-full rounded overflow-hidden border border-primary/30 bg-black">
      <iframe src={embed} title="YouTube-esikatselu" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
    </div>
  );
}

function RaceDetail() {
  const { slug } = Route.useParams();
  const get = useServerFn(getRace);
  const save = useServerFn(upsertRace);
  const genResults = useServerFn(generateResultList);
  const qc = useQueryClient();
  const admin = useAdmin();
  const entities = useEntityIndex();

  const q = useQuery({ queryKey: ["race", slug], queryFn: () => get({ data: { slug } }) });
  // Users most often want the race result, so the race tab is the default.
  const [tab, setTab] = useState<"qualifying" | "race">("race");
  const [aiBusy, setAiBusy] = useState(false);

  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8">Ladataan…</div>;
  const r = q.data;
  if (!r) return <div className="mx-auto max-w-4xl px-4 py-8">Kilpailua ei löydy.</div>;

  async function patch(partial: Partial<{ qualifying_content: string; race_content: string; qualifying_media_url: string | null; race_media_url: string | null; youtube_url: string | null; qualifying_youtube_url: string | null; race_youtube_url: string | null; round_number: number | null }>) {
    if (!r) return;
    await save({ data: { id: r.id, name: r.name, flag: r.flag, race_date: r.race_date,
      round_number: partial.round_number !== undefined ? partial.round_number : (r.round_number ?? null),
      qualifying_content: partial.qualifying_content ?? r.qualifying_content ?? "",
      race_content: partial.race_content ?? r.race_content ?? "",
      qualifying_media_url: partial.qualifying_media_url ?? r.qualifying_media_url ?? null,
      race_media_url: partial.race_media_url ?? r.race_media_url ?? null,
      youtube_url: partial.youtube_url ?? r.youtube_url ?? null,
      qualifying_youtube_url: partial.qualifying_youtube_url ?? r.qualifying_youtube_url ?? null,
      race_youtube_url: partial.race_youtube_url ?? r.race_youtube_url ?? null,
    }});
    await qc.invalidateQueries({ queryKey: ["race", slug] });
    toast.success("Tallennettu");
  }

  const activeContent = tab === "qualifying" ? (r.qualifying_content ?? "") : (r.race_content ?? "");
  const activeMedia = tab === "qualifying" ? r.qualifying_media_url : r.race_media_url;
  const activeYoutube = tab === "qualifying" ? (r.qualifying_youtube_url ?? r.youtube_url) : (r.race_youtube_url ?? r.youtube_url);
  const embed = youtubeEmbedUrl(activeYoutube);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{r.flag}</span>
        {r.round_number != null && (
          <span className="font-display text-sm px-2 py-1 rounded border border-primary/60 text-primary">R{r.round_number}</span>
        )}
        <h1 className="font-display uppercase tracking-widest text-2xl md:text-3xl">{r.name}</h1>
      </div>
      <div className="hairline-red mt-3 mb-6" />

      {embed && (
        <div className="mb-6 aspect-video w-full rounded overflow-hidden border border-primary/30 bg-black">
          <iframe src={embed} title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
        </div>
      )}

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
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{tab === "qualifying" ? "Aika-ajon YouTube-linkki" : "Kisan YouTube-linkki"}</span>
            <input key={`${tab}-youtube-${activeYoutube ?? ""}`} defaultValue={activeYoutube ?? ""} onBlur={(e) => {
              const v = e.target.value.trim();
              const old = activeYoutube ?? null;
              if ((v || null) !== old) void patch(tab === "qualifying" ? { qualifying_youtube_url: v || null } : { race_youtube_url: v || null });
            }} placeholder="https://youtu.be/…" className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-sm" />
          </div>
          <YouTubePreview url={activeYoutube} />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Kilpailun järjestysnumero (R1–R50)</span>
            <input
              key={`round-${r.round_number ?? ""}`}
              type="number"
              min={1}
              max={50}
              defaultValue={r.round_number ?? ""}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const v = raw ? Math.min(50, Math.max(1, Number(raw))) : null;
                if (v !== (r.round_number ?? null)) void patch({ round_number: v });
              }}
              className="w-24 bg-black/70 border border-primary/30 rounded p-2 text-sm"
            />
          </div>
          <MediaUpload
            label={tab === "qualifying" ? "Aika-ajokuva" : "Kisakuva"}
            currentUrl={activeMedia}
            onUploaded={async (url) => {
              await patch(tab === "qualifying" ? { qualifying_media_url: url } : { race_media_url: url });
              setAiBusy(true);
              try {
                const yearMatch = r.name.match(/(20\d\d)/);
                const res = await genResults({ data: {
                  image_url: url,
                  session_label: `${r.name} ${tab === "qualifying" ? "aika-ajot" : "kisa"}`,
                  year: yearMatch ? Number(yearMatch[1]) : null,
                }});
                if (res.text.trim()) {
                  await patch(tab === "qualifying" ? { qualifying_content: res.text } : { race_content: res.text });
                  toast.success("Tekoäly loi tuloslistan — voit muokata sitä");
                }
              } catch (e: any) {
                toast.error(`Tuloslistan luonti epäonnistui: ${e?.message ?? ""}`);
              } finally {
                setAiBusy(false);
              }
            }}
          />
          {aiBusy && <p className="text-xs text-muted-foreground">Tekoäly lukee tuloskuvaa…</p>}
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
