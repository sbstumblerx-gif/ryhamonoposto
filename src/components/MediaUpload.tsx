import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { uploadMedia } from "@/lib/upload.functions";
import { toast } from "sonner";

export function MediaUpload({
  currentUrl,
  onUploaded,
  label = "Kuva",
}: {
  currentUrl?: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  label?: string;
}) {
  const upload = useServerFn(uploadMedia);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      // chunked base64 encode for large files
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < buf.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunkSize)));
      }
      const base64 = btoa(binary);
      const { url } = await upload({ data: { filename: file.name, contentType: file.type || "application/octet-stream", base64 } });
      await onUploaded(url);
      await qc.invalidateQueries();
      toast.success("Kuva ladattu");
    } catch (e) {
      console.error(e);
      toast.error("Lataus epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="file"
        className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
        disabled={busy}
      />
      {currentUrl && <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">nykyinen</a>}
    </label>
  );
}
