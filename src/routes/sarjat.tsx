import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listSeries, createSeries } from "@/lib/series.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sarjat")({
  head: () => ({ meta: [
    { title: "Sarjat — RyhäMonoposto" },
    { name: "description", content: "Etsi muiden luomia moottoriurheilusarjoja tai aloita oma sarjasi." },
  ] }),
  component: SeriesPage,
});
function SeriesPage() {
  const listFn = useServerFn(listSeries), createFn = useServerFn(createSeries);
  const qc = useQueryClient(), router = useRouter();
  const query = useQuery({ queryKey: ["series-directory"], queryFn: () => listFn() });
  const [uid, setUid] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState(""), [slug, setSlug] = useState(""), [description, setDescription] = useState("");
  const [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  useEffect(() => { let active = true; void supabase.auth.getUser().then(({ data }) => { if (active) setUid(data.user?.id ?? null); }); const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUid(session?.user?.id ?? null)); return () => { active = false; listener.subscription.unsubscribe(); }; }, []);
  const filtered = (query.data ?? []).filter((s: any) => (s.name + " " + s.description).toLowerCase().includes(search.toLowerCase()));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const result = await createFn({ data: { name, slug, description, adminPassword: password } });
      setSuccess("Sarja luotiin! Sarjakohtaiset hallintatyökalut ja tietojen muokkaus tulevat seuraavassa vaiheessa.");
      setName(""); setSlug(""); setDescription(""); setPassword("");
      await qc.invalidateQueries({ queryKey: ["series-directory"] });
      await router.navigate({ to: "/sarjat/$slug", params: { slug: result.slug } } as any);
    } catch (err) { setError(err instanceof Error ? err.message : "Sarjan luominen epäonnistui."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
    <header><p className="text-xs uppercase tracking-[0.3em] text-primary">RyhäMonoposto · Yhteisö</p><h1 className="font-display uppercase tracking-widest text-3xl text-primary mt-2">Sarjat</h1><p className="mt-3 text-sm text-muted-foreground max-w-2xl">Löydä yhteisön omia moottoriurheilusarjoja tai rakenna kokonaan oma mestaruussarjasi. Jokainen sarja alkaa tyhjänä.</p><div className="hairline-red mt-4"/></header>
    <section className="card-dark p-5 space-y-4"><h2 className="font-display uppercase tracking-widest text-xl">🔎 Etsi sarjoja</h2><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sarjan nimi tai kuvaus…" className="w-full rounded border border-primary/30 bg-background px-3 py-2 text-sm"/>{query.isLoading?<p className="text-sm text-muted-foreground">Ladataan sarjoja…</p>:filtered.length?<div className="grid gap-3 sm:grid-cols-2">{filtered.map((s:any)=><article key={s.id} className="rounded border border-primary/25 p-4"><h3 className="font-display text-lg">{s.name}</h3><p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{s.description || "Ei kuvausta vielä."}</p><p className="text-xs text-muted-foreground mt-3">/{s.slug}</p><Link to="/sarjat/$slug" params={{slug:s.slug}} className="inline-block mt-3 text-sm text-primary hover:underline">Avaa sarja →</Link></article>)}</div>:<p className="text-sm text-muted-foreground">Ei vielä sarjoja tällä haulla. Voit olla ensimmäinen!</p>}</section>
    <section className="card-dark p-5 space-y-4"><h2 className="font-display uppercase tracking-widest text-xl">🏁 Aloita oma sarja</h2>{!uid?<><p className="text-sm text-muted-foreground">Sarjan luominen edellyttää kirjautumista.</p><Link to="/login" search={{next:"/sarjat"}} className="inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Kirjaudu sisään</Link></>:<form onSubmit={submit} className="space-y-4"><label className="block text-sm">Sarjan nimi<input required minLength={3} maxLength={60} value={name} onChange={e=>{setName(e.target.value);if(!slug) setSlug(e.target.value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""));}} className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2"/></label><label className="block text-sm">Osoite (URL)<input required minLength={3} maxLength={48} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="oma-f1-sarja" className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2"/><span className="text-xs text-muted-foreground">ryhamonoposto…/sarjat/{slug || "oma-sarja"}</span></label><label className="block text-sm">Kuvaus<textarea maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2" rows={3}/></label><label className="block text-sm">Sarjan admin-salasana<input required type="password" minLength={10} maxLength={200} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded border border-primary/30 bg-background px-3 py-2"/><span className="text-xs text-muted-foreground">Vähintään 10 merkkiä. Säilytä salasana turvallisesti.</span></label>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{success&&<p className="text-sm text-primary">{success}</p>}<Button disabled={busy} type="submit">{busy?"Luodaan sarjaa…":"Luo sarja"}</Button></form>}</section>
  </main>;
}
