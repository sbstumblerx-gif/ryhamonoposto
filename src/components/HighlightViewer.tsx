import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHighlights, deleteHighlight, type Highlight } from "@/lib/highlights.functions";
import { markSeen } from "@/lib/highlights-seen";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Comments } from "./Comments";
import { useAdmin } from "./admin-store";
import { toast } from "sonner";

function LikeBar({ highlight }: { highlight: Highlight }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(highlight.like_count);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCount(highlight.like_count);
  }, [highlight.id, highlight.like_count]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      if (!id) { setLiked(false); return; }
      const { data: mine } = await supabase.from("highlight_likes").select("id").eq("highlight_id", highlight.id).eq("user_id", id).maybeSingle();
      if (active) setLiked(!!mine);
    });
    return () => { active = false; };
  }, [highlight.id]);

  async function toggle() {
    if (!userId) {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      return;
    }
    setBusy(true);
    try {
      if (liked) {
        const { error } = await supabase.from("highlight_likes").delete().eq("highlight_id", highlight.id).eq("user_id", userId);
        if (error) throw error;
        setLiked(false); setCount(c => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.from("highlight_likes").insert({ highlight_id: highlight.id, user_id: userId });
        if (error) throw error;
        setLiked(true); setCount(c => c + 1);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Tykkäys epäonnistui");
    } finally { setBusy(false); }
  }

  return (
    <button onClick={toggle} disabled={busy} className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm ${liked ? "border-primary bg-primary/15 text-primary" : "border-primary/40 hover:border-primary"}`}>
      <span>{liked ? "♥" : "♡"}</span>
      <span className="font-display tracking-widest text-xs">{count}</span>
    </button>
  );
}

export function HighlightViewer({ raceSlug, startId, onClose }: { raceSlug: string; startId?: string | null; onClose: () => void }) {
  const list = useServerFn(listHighlights);
  const del = useServerFn(deleteHighlight);
  const admin = useAdmin();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["highlights", raceSlug], queryFn: () => list({ data: { race_slug: raceSlug } }) });
  const items = q.data ?? [];
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (started || items.length === 0) return;
    const i = startId ? items.findIndex(h => h.id === startId) : 0;
    setIndex(i >= 0 ? i : 0);
    setStarted(true);
  }, [items, startId, started]);

  const current = items[index];

  useEffect(() => {
    if (current) markSeen(current.id);
  }, [current?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex(i => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, onClose]);

  async function remove(id: string) {
    if (!confirm("Poistetaanko kohokohta?")) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["highlights", raceSlug] });
    await qc.invalidateQueries({ queryKey: ["highlight-index"] });
    setIndex(i => Math.max(0, i - 1));
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/97 flex flex-col">
      <div className="px-3 pt-3 flex gap-1">
        {items.map((h, i) => (
          <span key={h.id} className={`h-1 flex-1 rounded-full ${i < index ? "bg-primary/60" : i === index ? "bg-primary" : "bg-muted-foreground/30"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-display uppercase tracking-widest text-xs text-primary">Kohokohdat {items.length ? `${index + 1}/${items.length}` : ""}</span>
        <button onClick={onClose} aria-label="Poistu" className="text-3xl leading-none text-muted-foreground hover:text-primary px-2">×</button>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {q.isLoading && <p className="text-sm text-muted-foreground">Ladataan…</p>}
        {!q.isLoading && !current && <p className="text-sm text-muted-foreground italic">Ei kohokohtia.</p>}
        {current && (current.media_type === "video"
          ? <video src={current.media_url} controls autoPlay playsInline className="max-h-full max-w-full object-contain" />
          : <img src={current.media_url} alt={current.caption || "Kohokohta"} className="max-h-full max-w-full object-contain" />)}

        {items.length > 0 && (
          <>
            <button
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
              aria-label="Edellinen"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-primary/50 bg-black/60 text-xl disabled:opacity-30"
            >‹</button>
            <button
              onClick={() => setIndex(i => Math.min(items.length - 1, i + 1))}
              disabled={index >= items.length - 1}
              aria-label="Seuraava"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-primary/50 bg-black/60 text-xl disabled:opacity-30"
            >›</button>
          </>
        )}
      </div>

      {current && (
        <div className="border-t border-primary/30 p-3 space-y-3 max-h-[45vh] overflow-y-auto">
          {current.caption && <p className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{current.caption}</p>}
          <div className="flex items-center gap-2">
            <LikeBar highlight={current} />
            <button onClick={() => setShowComments(v => !v)} className="rounded border border-primary/40 px-3 py-1.5 text-xs font-display uppercase tracking-widest hover:border-primary">
              {showComments ? "Piilota kommentit" : "Kommentit"}
            </button>
            {admin.isAdmin && <button onClick={() => void remove(current.id)} className="ml-auto text-xs text-primary underline">Poista</button>}
          </div>
          {showComments && <Comments entityType="highlight" entityId={current.id} />}
        </div>
      )}
    </div>
  );
}
