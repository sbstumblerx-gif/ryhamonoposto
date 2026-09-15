import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHighlights, createHighlight } from "@/lib/highlights.functions";
import { useSeenHighlights, firstUnseen } from "@/lib/highlights-seen";
import { HighlightViewer } from "./HighlightViewer";
import { MediaUpload } from "./MediaUpload";
import { useAdmin } from "./admin-store";
import { toast } from "sonner";

function guessType(url: string): "image" | "video" {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? "video" : "image";
}

/** Highlights button + admin publishing panel, shown at the top of a race page. */
export function RaceHighlights({ raceSlug }: { raceSlug: string }) {
  const list = useServerFn(listHighlights);
  const create = useServerFn(createHighlight);
  const admin = useAdmin();
  const qc = useQueryClient();
  const seen = useSeenHighlights();
  const q = useQuery({ queryKey: ["highlights", raceSlug], queryFn: () => list({ data: { race_slug: raceSlug } }) });
  const items = q.data ?? [];
  const ids = items.map(h => h.id);
  const unseenId = firstUnseen(ids, seen);
  const unseenCount = ids.filter(id => !seen.has(id)).length;

  const [open, setOpen] = useState(false);
  const [startId, setStartId] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  async function publish() {
    if (!mediaUrl) { toast.error("Lisää ensin media"); return; }
    setSaving(true);
    try {
      await create({ data: { race_slug: raceSlug, media_url: mediaUrl, media_type: guessType(mediaUrl), caption } });
      setMediaUrl(null); setCaption("");
      await qc.invalidateQueries({ queryKey: ["highlights", raceSlug] });
      await qc.invalidateQueries({ queryKey: ["highlight-index"] });
      toast.success("Kohokohta julkaistu");
    } catch (e: any) {
      toast.error(e?.message ?? "Julkaisu epäonnistui");
    } finally { setSaving(false); }
  }

  function openHighlights() {
    // New highlights start from the oldest unseen one. Once everything has
    // been viewed, deliberately start from the first highlight so the user
    // can watch the whole set again.
    setStartId(unseenId ?? ids[0] ?? null);
    setOpen(true);
  }

  if (!items.length && !admin.isAdmin) return null;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {items.length > 0 && (
          <button
            onClick={openHighlights}
            className={`rounded px-4 py-2 text-xs font-display uppercase tracking-widest border transition ${unseenCount > 0 ? "border-primary bg-primary/20 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]" : "border-primary/40 hover:border-primary"}`}
          >
            {unseenCount > 0 ? `Uusia kohokohtia (${unseenCount})` : "Kohokohdat"}
          </button>
        )}
        {admin.isAdmin && (
          <button onClick={() => setAdminOpen(v => !v)} className="rounded border border-primary/40 px-3 py-2 text-xs font-display uppercase tracking-widest hover:border-primary">
            {adminOpen ? "Sulje" : "+ Uusi kohokohta"}
          </button>
        )}
      </div>

      {admin.isAdmin && adminOpen && (
        <div className="card-dark p-3 mt-3 space-y-3">
          <MediaUpload label="Media (kuva tai video)" currentUrl={mediaUrl} onUploaded={(url) => setMediaUrl(url)} />
          <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} placeholder="Teksti kohokohdalle…" className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm" />
          <button onClick={() => void publish()} disabled={saving || !mediaUrl} className="rounded bg-primary px-4 py-1.5 text-sm font-display uppercase tracking-widest text-primary-foreground disabled:opacity-50">Julkaise</button>
        </div>
      )}

      {open && <HighlightViewer raceSlug={raceSlug} startId={startId} onClose={() => setOpen(false)} />}
    </div>
  );
}
