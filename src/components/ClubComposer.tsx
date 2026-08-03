import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { uploadUserMedia } from "@/lib/upload.functions";
import { fileToBase64 } from "@/lib/file-base64";

type Media = { url: string; type: "image" | "audio" | "video"; duration?: number | null };

function kindOf(mime: string): Media["type"] | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return null;
}

export function ClubComposer({ onSend }: { onSend: (body: string, media?: Media | null) => Promise<void> }) {
  const upload = useServerFn(uploadUserMedia);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function put(blob: Blob, filename: string, type: Media["type"], duration?: number) {
    setBusy(true);
    try {
      const base64 = await fileToBase64(blob);
      const { url } = await upload({ data: { filename, contentType: blob.type || "application/octet-stream", base64 } });
      setMedia({ url, type, duration: duration ?? null });
    } catch (e: any) {
      toast.error(e?.message ?? "Liitteen lataus epäonnistui");
    } finally { setBusy(false); }
  }

  async function pickFile(file: File) {
    const type = kindOf(file.type);
    if (!type) { toast.error("Vain kuva-, ääni- ja videotiedostot"); return; }
    await put(file, file.name, type);
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const secs = seconds;
        setRecording(false);
        setSeconds(0);
        const blob = new Blob(chunks, { type: mime });
        await put(blob, `aaniviesti.${mime.includes("webm") ? "webm" : "m4a"}`, "audio", secs);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Mikrofonia ei voitu käyttää");
    }
  }

  function stopRec() { recRef.current?.stop(); }

  function cancelRec() {
    const rec = recRef.current;
    if (rec) { rec.onstop = null as any; rec.stop(); rec.stream.getTracks().forEach((t) => t.stop()); }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setSeconds(0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || recording) return;
    const body = text.trim();
    if (!body && !media) return;
    setText("");
    const m = media;
    setMedia(null);
    await onSend(body, m);
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {media && (
        <div className="flex items-center gap-2 rounded border border-primary/30 p-2">
          <span className="text-[10px] uppercase tracking-widest text-primary">
            {media.type === "image" ? "Kuva" : media.type === "audio" ? "Ääniviesti" : "Video"} liitetty
          </span>
          {media.type === "image" && <img src={media.url} alt="Liite" className="h-12 w-12 object-cover rounded" />}
          {media.type === "audio" && <audio src={media.url} controls className="h-8" />}
          <button type="button" onClick={() => setMedia(null)} className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">Poista</button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-2 rounded border border-primary p-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-display uppercase tracking-widest text-primary">Nauhoitetaan {seconds}s</span>
          <button type="button" onClick={stopRec} className="ml-auto bg-primary text-primary-foreground rounded px-3 py-1 text-[10px] uppercase tracking-widest">Valmis</button>
          <button type="button" onClick={cancelRec} className="border border-primary/40 rounded px-3 py-1 text-[10px] uppercase tracking-widest">Peru</button>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kirjoita viesti… (tägää @nimellä)"
            className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-sm"
          />
          <label
            title="Liitä kuva, video tai ääni"
            className="cursor-pointer border border-primary/40 rounded px-3 py-2 text-xs hover:border-primary"
          >
            📎
            <input
              type="file"
              accept="image/*,audio/*,video/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickFile(f); e.target.value = ""; }}
            />
          </label>
          <button type="button" title="Nauhoita ääniviesti" onClick={startRec} disabled={busy}
            className="border border-primary/40 rounded px-3 py-2 text-xs hover:border-primary disabled:opacity-50">🎙️</button>
          <button disabled={busy} className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50">
            {busy ? "…" : "Lähetä"}
          </button>
        </div>
      )}
    </form>
  );
}
