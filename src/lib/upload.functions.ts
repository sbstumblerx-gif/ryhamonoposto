import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UploadInput = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  base64: z.string().min(1),
});

export const uploadMedia = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UploadInput.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;
    const buf = Buffer.from(data.base64, "base64");

    const { error } = await supabaseAdmin.storage.from("media").upload(key, buf, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw error;

    // Signed URL valid 10 years
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(key, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;

    return { url: signed.signedUrl, key };
  });

const UserUploadInput = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  base64: z.string().min(1).max(20_000_000),
});

/** Upload for any signed-in user (avatars, club chat attachments, voice notes). */
export const uploadUserMedia = createServerFn({ method: "POST" })
  .middleware([(await import("@/integrations/supabase/auth-middleware")).requireSupabaseAuth])
  .inputValidator((d: unknown) => UserUploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const ok = /^(image|audio|video)\//.test(data.contentType);
    if (!ok) throw new Error("Vain kuva-, ääni- ja videotiedostot ovat sallittuja");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `users/${context.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;
    const buf = Buffer.from(data.base64, "base64");
    if (buf.length > 15 * 1024 * 1024) throw new Error("Tiedosto on liian suuri (max 15 MB)");

    const { error } = await supabaseAdmin.storage.from("media").upload(key, buf, { contentType: data.contentType, upsert: false });
    if (error) throw error;
    const { data: signed, error: sErr } = await supabaseAdmin.storage.from("media").createSignedUrl(key, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;
    return { url: signed.signedUrl, key };
  });
