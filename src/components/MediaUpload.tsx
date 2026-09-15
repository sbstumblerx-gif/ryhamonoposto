import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createMediaUploadUrl, finalizeMediaUpload } from "@/lib/upload.functions";
import { toast } from "sonner";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Videon tietoja ei voitu lukea"));
    };
    video.src = url;
  });
}

export function MediaUpload({
  currentUrl,
  onUploaded,
  label = "Media",
}: {
  currentUrl?: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  label?: string;
}) {
  const createUploadUrl = useServerFn(createMediaUploadUrl);
  const finalizeUpload = useServerFn(finalizeMediaUpload);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) {
        throw new Error("Valitse kuva tai video");
      }

      if (isVideo) {
        if (file.size > MAX_VIDEO_BYTES) {
          throw new Error("Video on liian suuri (max 50 MB)");
        }
        const duration = await getVideoDuration(file);
        if (!Number.isFinite(duration) || duration > MAX_VIDEO_SECONDS) {
          throw new Error("Video saa olla enintään 30 sekuntia pitkä");
        }
      } else if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Kuva on liian suuri (max 15 MB)");
      }

      const { key, token } = await createUploadUrl({
        data: {
          filename: file.name,
          contentType: file.type,
        },
      });

      const { error } = await supabase.storage
        .from("media")
        .uploadToSignedUrl(key, token, file);
      if (error) throw error;

      const { url } = await finalizeUpload({ data: { key } });
      await onUploaded(url);
      await qc.invalidateQueries();
      toast.success(isVideo ? "Video ladattu" : "Kuva ladattu");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Lataus epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="file"
        accept="image/*,video/*"
        className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.currentTarget.value = "";
        }}
        disabled={busy}
      />
      {busy && <span className="text-xs text-muted-foreground">Ladataan…</span>}
      {currentUrl && <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">nykyinen</a>}
    </label>
  );
}
