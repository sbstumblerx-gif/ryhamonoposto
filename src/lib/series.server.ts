import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}
function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
export async function listSeries() {
  const db = await admin();
  const { data, error } = await db.from("series")
    .select("id,slug,name,description,created_at,owner_id")
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}
export async function createSeries(userId: string, input: {
  name: string; slug: string; description: string; adminPassword: string;
}) {
  const db = await admin();
  const slug = slugify(input.slug);
  if (slug.length < 3) throw new Error("Sarjan osoitteen pitää olla vähintään 3 merkkiä.");
  const { data: existing } = await db.from("series").select("id").eq("slug", slug).maybeSingle();
  if (existing) throw new Error("Tämä sarjan osoite on jo käytössä.");
  const passwordHash = await hashPassword(input.adminPassword);
  const { data, error } = await db.from("series").insert({
    owner_id: userId, name: input.name, slug, description: input.description,
  }).select("id,slug,name,description,created_at,owner_id").single();
  if (error) {
    if (error.code === "23505") throw new Error("Tämä sarjan osoite on jo käytössä.");
    throw error;
  }
  const { error: credentialError } = await db.from("series_admin_credentials").insert({
    series_id: data.id, password_hash: passwordHash,
  });
  if (credentialError) {
    await db.from("series").delete().eq("id", data.id);
    throw credentialError;
  }
  return data;
}
