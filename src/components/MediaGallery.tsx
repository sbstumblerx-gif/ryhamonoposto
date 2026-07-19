import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMedia, addMedia, deleteMedia, updateMedia } from "@/lib/media.functions";
import { uploadMedia } from "@/lib/upload.functions";
import { useAdmin } from "./admin-store";
import { SmartText } from "./SmartText";
import { useEntityIndex } from "./useEntityIndex";
import { toast } from "sonner";

export function MediaGallery({ scope, title }: { scope: string; title?: string }) {
  const list = useServerFn(listMedia);
  const add = useServerFn(addMedia);
  const del = useServerFn(deleteMedia);
  const upd = useServerFn(updateMedia);
  const upload = useServerFn(uploadMedia);
  const qc = useQueryClient();
  const admin = useAdmin();
  const entities = useEntityIndex();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["media", scope], queryFn: () => list({ data: { scope } }) });
  const items = q.data ?? [];

  useEffect(() => { if (i >= items.length) setI(0); }, [items.length, i]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (items.length < 2) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") setI(v => (v - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") setI(v => (v + 1) % items.length);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [items.length]);

  async function handleFile(f: File) {
    setBusy(true);
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = ""; const cs = 0x8000;
      for (let k = 0; k < buf.length; k += cs) bin += String.fromCharCode.apply(null, Array.from(buf.subarray(k, k + cs)));
      const b64 = btoa(bin);
      const { url } = await upload({ data: { filename: f.name, contentType: f.type || "application/octet-stream", base64: b64 } });
      await add({ data: { scope, url, caption: "" } });
      await qc.invalidateQueries({ queryKey: ["media", scope] });
      toast.success("Lisätty");
    } catch (e: any) { toast.error(e?.message ?? "Lataus epäonnistui"); }
    finally { setBusy(false); }
  }

  const cur = items[i];

  return (
    <div className="card-dark p-3">
      {title && <div className="font-display uppercase tracking-widest text-sm text-primary mb-2">{title}</div>}

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground italic p-4 text-center">Ei tiedostoja vielä.</div>
      ) : (
        <div className="relative">
          <img src={cur.url} alt={cur.caption || ""} className="w-full rounded border border-primary/30 max-h-[70vh] object-contain bg-black" />
          {items.length > 1 && (
            <>
              <button aria-label="Edellinen" onClick={() => setI(v => (v - 1 + items.length) % items.length)}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/70 border border-primary/50 hover:bg-primary hover:text-primary-foreground rounded-full w-9 h-9 flex items-center justify-center">‹</button>
              <button aria-label="Seuraava" onClick={() => setI(v => (v + 1) % items.length)}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/70 border border-primary/50 hover:bg-primary hover:text-primary-foreground rounded-full w-9 h-9 flex items-center justify-center">›</button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {items.map((_, k) => (
                  <button key={k} onClick={() => setI(k)}
                    className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-primary" : "w-1.5 bg-white/40"}`} />
                ))}
              </div>
            </>
          )}
          {cur.caption && (
            <div className="mt-2 text-sm">
              <SmartText text={cur.caption} entities={entities} />
            </div>
          )}
          {admin.isAdmin && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <input
                defaultValue={cur.caption}
                onBlur={async (e) => {
                  const v = e.target.value;
                  if (v === cur.caption) return;
                  await upd({ data: { id: cur.id, caption: v } });
                  await qc.invalidateQueries({ queryKey: ["media", scope] });
                }}
                placeholder="Kuvateksti (nimet linkittyvät automaattisesti)"
                className="flex-1 min-w-[200px] bg-black/70 border border-primary/30 rounded p-1.5 text-xs"
              />
              <button
                onClick={async () => {
                  if (!confirm("Poistetaanko tämä tiedosto?")) return;
                  await del({ data: { id: cur.id } });
                  await qc.invalidateQueries({ queryKey: ["media", scope] });
                }}
                className="text-xs px-2 py-1 border border-primary/50 rounded hover:bg-primary/20"
              >Poista</button>
            </div>
          )}
        </div>
      )}

      {admin.isAdmin && (
        <label className="mt-3 inline-flex items-center gap-2 cursor-pointer">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Lisää tiedosto</span>
          <input type="file" disabled={busy}
            className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
          />
        </label>
      )}
    </div>
  );
}
