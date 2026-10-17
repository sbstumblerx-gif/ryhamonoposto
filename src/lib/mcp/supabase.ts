import { createClient } from "@supabase/supabase-js";
import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function runtimeEnv(name: string) {
  return (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]?.trim();
}
function projectUrl() {
  const value = runtimeEnv("SUPABASE_URL") ?? runtimeEnv("VITE_SUPABASE_URL") ?? import.meta.env.VITE_SUPABASE_URL;
  if (!value) throw new ToolError("Database configuration is unavailable.");
  return value;
}
function publishableKey() {
  const direct = runtimeEnv("SUPABASE_PUBLISHABLE_KEY") ?? runtimeEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (direct) return direct;
  try {
    const values: unknown = JSON.parse(runtimeEnv("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (values && typeof values === "object" && !Array.isArray(values)) {
      const keys = values as Record<string, unknown>;
      const key = [keys.default, ...Object.values(keys)].find((v): v is string => typeof v === "string" && v.startsWith("sb_publishable_"));
      if (key) return key;
    }
  } catch { /* Keep legacy and build-time fallbacks. */ }
  const key = runtimeEnv("SUPABASE_ANON_KEY") ?? runtimeEnv("VITE_SUPABASE_ANON_KEY") ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new ToolError("Database configuration is unavailable.");
  return key;
}
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!ctx.isAuthenticated() || !token) throw new ToolError("Sign in to use RyhäMonoposto tools.");
  return createClient<Database>(projectUrl(), publishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}