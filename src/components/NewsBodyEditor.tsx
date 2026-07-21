import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadMedia } from "@/lib/upload.functions";
import { toast } from "sonner";

export function NewsBodyEditor({ value, onSave }: { value: string; onSave: (value: string) => Promise<void> | void }) {
  const upload = useServerFn(uploadMedia);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setText(value); setDirty(false); }, [value]);

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)));
      const caption = window.prompt("Kuvateksti", "") ?? "";
      const { url } = await upload({ data: { filename: file.name, contentType: file.type || "application/octet-stream", base64: btoa(bin) } });
      const textarea = ref.current;
      const start = textarea?.selectionStart ?? text.length;
      const end = textarea?.selectionEnd ?? text.length;
      const insert = `\n\n![${caption}](${url})\n\n`;
      const next = text.slice(0, start) + insert + text.slice(end);
      setText(next);
      setDirty(true);
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(start + insert.length, start + insert.length);
      });
    } catch (error: any) {
      toast.error(error?.message ?? "Kuvan lisäys epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await onSave(text);
      setDirty(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea ref={ref} value={text} onChange={(event) => { setText(event.target.value); setDirty(true); }} placeholder="Sisältö… Enter tekee kappalejaon." rows={12} className="w-full min-h-64 bg-black/60 border border-primary/40 rounded p-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-primary/50 px-3 py-1 text-xs font-display uppercase tracking-widest hover:bg-primary/20">
          Lisää kuva kohtaan
          <input type="file" accept="image/*" disabled={busy} className="hidden" onChange={(event) => { void handleImage(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
        {dirty && (
          <button onClick={save} disabled={busy} className="rounded bg-primary text-primary-foreground text-xs px-3 py-1 font-display uppercase tracking-widest disabled:opacity-50">
            {busy ? "Tallennetaan…" : "Tallenna"}
          </button>
        )}
      </div>
    </div>
  );
}