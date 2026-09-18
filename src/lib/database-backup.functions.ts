import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gzipSync, gunzipSync } from "node:zlib";
import { requireAdmin } from "@/lib/admin-session.server";

const TABLES = [
  "clubs",
  "profiles",
  "user_roles",
  "teams",
  "drivers",
  "seasons",
  "races",
  "cards",
  "prediction_sessions",
  "predictions",
  "polls",
  "poll_options",
  "poll_votes",
  "club_join_requests",
  "club_members",
  "club_messages",
  "club_message_reactions",
  "comments",
  "duel_drafts",
  "duel_matches",
  "follows",
  "graphs",
  "highlight_likes",
  "highlight_views",
  "highlights",
  "media_items",
  "news",
  "notifications",
  "stats_pages",
  "card_packs",
  "user_cards",
  "user_vault",
] as const;

const RESTORE_CONFLICT: Record<string, string> = {
  user_vault: "user_id",
};

const PAGE_SIZE = 1000;

async function readAllRows(supabaseAdmin: any, table: string) {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Backup failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export const createDatabaseBackup = createServerFn({ method: "POST" })
  .handler(async () => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    for (const table of TABLES) {
      tables[table] = await readAllRows(supabaseAdmin, table);
      counts[table] = tables[table].length;
    }

    const authUsers: unknown[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw new Error(`Backup failed for auth users: ${error.message}`);
      const users = data.users ?? [];
      authUsers.push(
        ...users.map((user) => ({
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_sign_in_at: user.last_sign_in_at ?? null,
          user_metadata: user.user_metadata ?? {},
          app_metadata: user.app_metadata ?? {},
          email_confirmed_at: user.email_confirmed_at ?? null,
          phone_confirmed_at: user.phone_confirmed_at ?? null,
        })),
      );
      if (users.length < 1000) break;
    }

    let storageManifest: unknown[] = [];
    try {
      const storageDb = supabaseAdmin as any;
      const { data, error } = await storageDb
        .from("storage.objects")
        .select("id,bucket_id,name,created_at,updated_at,last_accessed_at,metadata");
      if (!error) storageManifest = data ?? [];
    } catch {
      // Storage metadata is supplementary.
    }

    const payload = {
      format: "ryhamonoposto-backup",
      version: 1,
      created_at: new Date().toISOString(),
      tables,
      counts,
      auth_users: authUsers,
      storage_manifest: storageManifest,
      notes: [
        "Public application-table data is included.",
        "Auth passwords are not exported.",
        "Storage binary files are not embedded; storage_manifest records their metadata.",
      ],
    };

    const compressed = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 9 });
    const filename = `backups/ryhamonoposto-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("media")
      .upload(filename, compressed, {
        contentType: "application/gzip",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(filename, 60 * 60 * 24 * 365);

    if (signedError) throw signedError;

    return {
      filename,
      url: signed.signedUrl,
      bytes: compressed.length,
      counts,
      authUserCount: authUsers.length,
    };
  });

const RestoreInput = z.object({
  filename: z.string().min(1).max(500),
  base64Gzip: z.string().min(1).max(50_000_000),
});

export const restoreDatabaseBackup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RestoreInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const raw = gunzipSync(Buffer.from(data.base64Gzip, "base64")).toString("utf8");
    const backup = JSON.parse(raw) as {
      format?: string;
      version?: number;
      tables?: Record<string, unknown[]>;
    };

    if (backup.format !== "ryhamonoposto-backup" || backup.version !== 1 || !backup.tables) {
      throw new Error("Tiedosto ei ole kelvollinen RyhäMonoposto-varmuuskopio.");
    }

    const restored: Record<string, number> = {};

    for (const table of TABLES) {
      const rows = backup.tables[table] ?? [];
      if (!rows.length) {
        restored[table] = 0;
        continue;
      }

      for (let offset = 0; offset < rows.length; offset += 500) {
        const chunk = rows.slice(offset, offset + 500);
        const onConflict = RESTORE_CONFLICT[table] ?? "id";
        const { error } = await supabaseAdmin.from(table).upsert(chunk, { onConflict });
        if (error) {
          throw new Error(`Restore failed for ${table}: ${error.message}`);
        }
      }
      restored[table] = rows.length;
    }

    return {
      filename: data.filename,
      restored,
      warning: "Palautus tekee upsertin eikä poista nykyisestä tietokannasta rivejä, joita varmuuskopiossa ei ole.",
    };
  });

export const listDatabaseBackups = createServerFn({ method: "GET" })
  .handler(async () => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin.storage
      .from("media")
      .list("backups", {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "desc" },
      });

    if (error) throw error;

    const backups = [];
    for (const item of data ?? []) {
      if (!item.name.endsWith(".json.gz")) continue;
      const path = `backups/${item.name}`;
      const { data: signed, error: signedError } = await supabaseAdmin.storage
        .from("media")
        .createSignedUrl(path, 60 * 60);
      if (signedError) continue;
      backups.push({
        name: item.name,
        path,
        url: signed.signedUrl,
        updated_at: item.updated_at,
        size: item.metadata?.size ?? null,
      });
    }

    return backups;
  });
