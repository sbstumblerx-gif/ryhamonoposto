import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: oauthReturnPath(s.next) }),
  head: () => ({ meta: [
    { title: "Kirjautuminen — RyhäMonoposto" },
    { name: "description", content: "Kirjaudu hyväksyäksesi avustajan yhteyden RyhäMonopostoon." },
    { property: "og:title", content: "Kirjautuminen — RyhäMonoposto" },
    { property: "og:description", content: "Turvallinen kirjautuminen avustajayhteyksiä varten." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Login,
});
function Login() {
  const { next } = Route.useSearch();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active && data.session) window.location.assign(next); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (session) window.location.assign(next); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [next]);
  async function signIn() {
    setBusy(true); setError("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: new URL(next, window.location.origin).href });
      if (result.error) throw result.error;
      if (!result.redirected) window.location.assign(next);
    } catch { setError("Kirjautuminen epäonnistui. Yritä uudelleen."); setBusy(false); }
  }
  return <section className="mx-auto max-w-md px-4 py-12 space-y-5">
    <h1 className="font-display text-xl text-primary">Kirjaudu RyhäMonopostoon</h1>
    <p className="text-sm text-muted-foreground">Kirjautumisen jälkeen voit tarkistaa ja hyväksyä avustajan yhteyden. Uusi käyttäjä voi luoda tilin samalla Google-kirjautumisella.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button disabled={busy} onClick={signIn}>{busy ? "Kirjaudutaan…" : "Jatka Googlella"}</Button>
  </section>;
}
