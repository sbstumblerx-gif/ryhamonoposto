// SV Account -yhteys. Julkinen avain on tarkoitettu selaimeen.
import { createClient } from "@supabase/supabase-js";

export const SV_APP_ID = "ryha_monoposto" as const;
export const SV_DATA_TABLE = "ryha_monoposto_data" as const;

const SV_URL = import.meta.env.VITE_SV_URL || "https://lrwonltkuqbissvjmewf.supabase.co";
const SV_PUBLISHABLE_KEY =
  import.meta.env.VITE_SV_PUBLISHABLE_KEY || "sb_publishable_r3L6uewJ_qMz0dbP5YKVcg_F9UJ5wqO";

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function svFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, k) => headers.set(k, value));
    if (isNewKey(key) && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

let _sv: ReturnType<typeof createClient> | undefined;

function create() {
  return createClient(SV_URL, SV_PUBLISHABLE_KEY, {
    global: { fetch: svFetch(SV_PUBLISHABLE_KEY) },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      storageKey: "sv-account-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/** SV Account -asiakas (erillinen sessio sovelluksen omasta kirjautumisesta). */
export const sv = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop, receiver) {
    if (!_sv) _sv = create();
    return Reflect.get(_sv, prop, receiver);
  },
});
