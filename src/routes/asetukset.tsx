import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loginAdmin } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAdmin } from "@/components/admin-store";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/asetukset")({
  head: () => ({ meta: [{ title: "Asetukset — RyhäMonoposto" }, { name: "description", content: "Admin-kirjautuminen ja Google-kirjautuminen." }] }),
  component: Settings,
});

function Settings() {
  const login = useServerFn(loginAdmin);
  const router = useRouter();
  const admin = useAdmin();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email ?? undefined, name: (data.user.user_metadata as any)?.full_name });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setUser({ email: session.user.email ?? undefined, name: (session.user.user_metadata as any)?.full_name });
      else setUser(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await login({ data: { password: pw } });
      if (r.ok) {
        toast.success("Admin-oikeudet aktivoitu");
        setPw("");
        router.invalidate();
        // trigger admin status refresh
        window.location.reload();
      } else {
        toast.error("Väärä salasana");
      }
    } finally { setBusy(false); }
  }

  async function google() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/asetukset" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Asetukset</h1>
        <div className="hairline-red mt-3" />
      </div>

      <section className="card-dark p-4">
        <h2 className="font-display uppercase tracking-widest text-sm mb-3">Admin</h2>
        {admin.isAdmin ? (
          <p className="text-sm">Admin-tila on aktiivinen. Voit muokata sisältöä kaikkialla.</p>
        ) : (
          <form onSubmit={submit} className="space-y-2">
            <label className="text-sm block">Enter admin password:</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full bg-black/70 border border-primary/40 rounded p-2 text-sm"
              autoComplete="current-password"
            />
            <button disabled={busy} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
              {busy ? "…" : "Enter"}
            </button>
          </form>
        )}
      </section>

      <section className="card-dark p-4">
        <h2 className="font-display uppercase tracking-widest text-sm mb-3">Google-kirjautuminen</h2>
        {user ? (
          <div className="text-sm space-y-2">
            <div>Kirjautuneena: <span className="text-primary">{user.name ?? user.email}</span></div>
            <button onClick={() => supabase.auth.signOut()} className="text-xs underline">Kirjaudu ulos</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">Valinnainen. Kirjautuneena voit kommentoida.</p>
            <button onClick={google} className="rounded bg-white text-black text-sm font-display uppercase tracking-widest px-4 py-2">
              Kirjaudu Googlella
            </button>
          </>
        )}
      </section>
    </div>
  );
}
