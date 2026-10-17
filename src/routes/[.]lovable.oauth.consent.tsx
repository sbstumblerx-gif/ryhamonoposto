import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "" }),
  head: () => ({ meta: [
    { title: "Yhdistä avustaja — RyhäMonoposto" },
    { name: "description", content: "Tarkista ja hyväksy avustajan pääsy RyhäMonopostoon." },
    { property: "og:title", content: "Yhdistä avustaja — RyhäMonoposto" },
    { property: "og:description", content: "Hallitse avustajan yhteyttä omaan tiliisi." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Yhteyspyyntö puuttuu. Aloita yhdistäminen uudelleen avustajasta.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Kirjautumista ei voitu tarkistaa.");
    if (!data.session) throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr + location.hash } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!id) throw new Error("Yhteyspyyntö puuttuu.");
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (error || !data) throw new Error("Yhteyspyyntö on vanhentunut tai sitä ei voitu ladata. Aloita yhdistäminen uudelleen avustajasta.");
    if ("redirect_url" in data) throw redirect({ href: data.redirect_url });
    return data;
  },
  pendingComponent: () => <p className="mx-auto max-w-md px-4 py-12 text-muted-foreground">Ladataan yhteyspyyntöä…</p>,
  errorComponent: ({ error }) => <section className="mx-auto max-w-md px-4 py-12 space-y-4"><h1 className="font-display text-xl text-primary">Yhteyttä ei voitu avata</h1><p role="alert">{error.message}</p><Button asChild variant="outline"><a href="/">Etusivulle</a></Button></section>,
  component: Consent,
});
function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const name = details.client.name || "Avustaja";
  async function decide(approve: boolean) {
    setBusy(true); setError("");
    try {
      const { data, error } = approve ? await supabase.auth.oauth.approveAuthorization(authorization_id) : await supabase.auth.oauth.denyAuthorization(authorization_id);
      if (error || !data?.redirect_url) throw new Error("Päätöstä ei voitu tallentaa. Yritä uudelleen.");
      window.location.assign(data.redirect_url);
    } catch (e) { setError(e instanceof Error ? e.message : "Yhteys epäonnistui."); setBusy(false); }
  }
  return <section className="mx-auto max-w-lg px-4 py-12 space-y-5">
    <h1 className="font-display text-xl text-primary">Yhdistä {name} RyhäMonopostoon</h1>
    <p className="text-sm text-muted-foreground">Kirjautunut tilillä {details.user.email}</p>
    <p>{name} voi käyttää RyhäMonopostoa sinun oikeuksillasi.</p>
    <p className="break-all text-sm text-muted-foreground">Avustajan paluuosoite: {details.redirect_uri}</p>
    <ul className="list-disc pl-5 space-y-2 text-sm">{details.scope.split(/\s+/).filter(Boolean).map(scope => <li key={scope}>{scope === "openid" ? "Vahvista kirjautunut käyttäjä" : scope === "email" ? "Jaa sähköpostiosoitteesi" : scope === "profile" ? "Jaa perustiedot profiilistasi" : `Lisäoikeus: ${scope}`}</li>)}</ul>
    <p className="text-sm">Avustaja voi lukea kilpailuja, kuljettajia, kalenterin sessioita ja oman profiilisi nimen sekä avatarin. Se ei voi muokata, julkaista tai poistaa mitään.</p>
    <p className="text-sm text-muted-foreground">Yhteys ei ohita sovelluksen käyttöoikeuksia.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>Hyväksy yhteys</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>Peruuta yhteys</Button><Button variant="ghost" disabled={busy} onClick={async () => { try { const { error } = await supabase.auth.signOut(); if (error) throw error; window.location.reload(); } catch { setError("Uloskirjautuminen epäonnistui."); } }}>Vaihda tiliä</Button></div>
  </section>;
}
