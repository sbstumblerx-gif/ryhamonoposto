import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { followingOverview, followingPublications } from "@/lib/following.functions";
import { FollowButton } from "@/components/FollowButton";
import { colorFor } from "@/lib/team-colors";

export const Route = createFileRoute("/seuratut")({
  head: () => ({ meta: [{ title: "Seuratut — RyhäMonoposto" }] }),
  component: FollowedPage,
});

type Entity = { entity_type: "driver" | "team"; entity_slug: string; name: string; flag: string; color_key: string; fan_points: number; trend: "up" | "down" | "flat"; logo_url?: string | null };
type Tab = "following" | "posts";

function EntityLink({ entity, children }: { entity: { entity_type: "driver" | "team"; entity_slug: string }; children: React.ReactNode }) {
  return <Link to={entity.entity_type === "driver" ? "/kuljettajat/$slug" : "/tiimit/$slug"} params={{ slug: entity.entity_slug }} className="hover:text-primary transition">{children}</Link>;
}

function TrendCard({ entity }: { entity: Entity }) {
  return <div className="card-dark p-3 border-l-2 flex items-center justify-between gap-3" style={{ borderLeftColor: colorFor(entity.color_key) }}><EntityLink entity={entity}><div className="font-display uppercase tracking-wider text-sm">{entity.flag} {entity.name}</div><div className="text-[10px] text-muted-foreground mt-1">{entity.fan_points} fanipistettä / 7 vrk</div></EntityLink><FollowButton kind={entity.entity_type} slug={entity.entity_slug} name={entity.name} /></div>;
}

function TrendList({ rows, favorites }: { rows: Entity[]; favorites: Set<string> }) {
  return <div className="space-y-1.5">{rows.map((e, i) => <div key={`${e.entity_type}:${e.entity_slug}`} className="flex items-center gap-2 border-b border-primary/10 py-2"><span className="w-6 text-xs text-muted-foreground text-right">{i + 1}.</span><EntityLink entity={e}><span className="font-display text-sm">{favorites.has(`${e.entity_type}:${e.entity_slug}`) ? "♥️ " : ""}{e.flag} {e.name}</span></EntityLink><span className="ml-auto font-display text-sm">{e.fan_points} fp</span><span className={`w-5 text-center ${e.trend === "up" ? "text-green-400" : e.trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>{e.trend === "up" ? "📈" : e.trend === "down" ? "📉" : "—"}</span></div>)}</div>;
}

function ReportRow({ row }: { row: any }) {
  const pos = row.status === "FIN" ? `P${row.position ?? "—"}` : row.status;
  return <div className="flex items-center gap-2 py-1.5 px-2 border-l-2" style={{ borderLeftColor: colorFor(row.color_key) }}><EntityLink entity={{ entity_type: "driver", entity_slug: row.slug }}><span className="font-display text-sm">{row.flag} {row.name}</span></EntityLink><span className="ml-auto font-display text-sm">{pos}</span><span className="text-xs text-muted-foreground">+{row.points}p</span></div>;
}

function TeamReport({ row }: { row: any }) {
  return <div className="border-l-2 p-2" style={{ borderLeftColor: colorFor(row.color_key) }}><div className="flex items-center gap-2 mb-1"><span className="font-display text-sm">{row.flag} {row.name}</span><span className="ml-auto text-xs text-muted-foreground">+{row.points}p</span></div><div className="space-y-0.5 pl-2">{row.drivers.map((d: any) => <div key={d.slug ?? d.name} className="text-xs"><span>{d.flag} {d.name}</span><span className="ml-2 font-display">{d.status === "FIN" ? `P${d.position ?? "—"}` : d.status}</span></div>)}</div></div>;
}

function FollowedPage() {
  const overviewFn = useServerFn(followingOverview);
  const postsFn = useServerFn(followingPublications);
  const [uid, setUid] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("following");
  const [trendKind, setTrendKind] = useState<"drivers" | "teams">("drivers");

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) { setUid(data.user?.id ?? null); setLoaded(true); } });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) setUid(session?.user?.id ?? null); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const overviewQ = useQuery({ queryKey: ["following-overview", uid], queryFn: () => overviewFn(), enabled: !!uid, refetchInterval: 30_000 });
  const postsQ = useQuery({ queryKey: ["following-publications", uid], queryFn: () => postsFn(), enabled: !!uid && tab === "posts", refetchInterval: 30_000 });
  const data: any = overviewQ.data;
  const favorites = useMemo(() => new Set<string>((data?.follows ?? []).map((f: any) => `${f.entity_type}:${f.entity_slug}`)), [data]);

  if (!loaded || (uid && overviewQ.isLoading)) return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">Ladataan Seuratut-näkymää…</main>;
  if (!uid) return <main className="mx-auto max-w-md px-4 py-10 space-y-4 text-center"><div className="text-3xl">♥️</div><h1 className="font-display uppercase tracking-widest text-2xl text-primary">Seuratut</h1><div className="hairline-red" /><p className="text-sm text-muted-foreground">Kirjaudu sisään seurataksesi kuljettajia ja tiimejä sekä nähdäksesi henkilökohtaisen Seuratut-näkymän.</p><button onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/seuratut" })} className="rounded bg-white text-black px-4 py-2 text-xs font-display uppercase tracking-widest">Kirjaudu Googlella</button></main>;

  const report = data?.report;
  const trendRows: Entity[] = data?.trends?.[trendKind] ?? [];
  const trendNowDrivers: Entity[] = data?.trendNow?.drivers ?? [];
  const trendNowTeams: Entity[] = data?.trendNow?.teams ?? [];

  return <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
    <header><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-3xl">♥️</div><h1 className="font-display uppercase tracking-widest text-2xl text-primary mt-1">Seuratut</h1></div><div className="flex rounded border border-primary/40 p-1"><button onClick={() => setTab("following")} className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded ${tab === "following" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Seuratut</button><button onClick={() => setTab("posts")} className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded ${tab === "posts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Julkaisut</button></div></div><div className="hairline-red mt-4" /></header>
    {tab === "following" ? <>
      <section className="space-y-3"><div><h2 className="font-display uppercase tracking-widest text-sm text-primary">Trendaa tällä hetkellä</h2><p className="text-xs text-muted-foreground mt-1">3 kuljettajaa ja 2 tiimiä · eniten fanipisteitä viimeisen 7 päivän aikana</p></div><div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{trendNowDrivers.map(e => <TrendCard key={`d:${e.entity_slug}`} entity={e} />)}{trendNowTeams.map(e => <TrendCard key={`t:${e.entity_slug}`} entity={e} />)}</div></section>
      <section className="space-y-3"><div><h2 className="font-display uppercase tracking-widest text-sm text-primary">Löydä uusia seurattavia</h2><p className="text-xs text-muted-foreground mt-1">Ehdotukset perustuvat seuraamiisi tiimeihin, kuljettajiin ja maihin.</p></div>{(data?.suggestions ?? []).length ? <div className="grid gap-2 md:grid-cols-3">{data.suggestions.map((e: Entity) => <TrendCard key={`${e.entity_type}:${e.entity_slug}`} entity={e} />)}</div> : <div className="card-dark p-4 text-sm text-muted-foreground">Algoritmi ei vielä saanut tarpeeksi tietoa ehdotusten tekemiseen.</div>}</section>
      <section className="space-y-3"><div><h2 className="font-display uppercase tracking-widest text-sm text-primary">Omat suosikit</h2><p className="text-xs text-muted-foreground mt-1">Kaikki seuraamasi kuljettajat ja tiimit.</p></div>{(data?.follows ?? []).length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.follows.map((e: any) => <div key={`${e.entity_type}:${e.entity_slug}`} className="card-dark p-3 flex items-center justify-between gap-3"><EntityLink entity={e}><span className="font-display text-sm">{e.flag} {e.name}</span></EntityLink><FollowButton kind={e.entity_type} slug={e.entity_slug} name={e.name} /></div>)}</div> : <div className="card-dark p-4 text-sm text-muted-foreground">Et seuraa vielä yhtään kuljettajaa tai tiimiä.</div>}</section>
      <section className="space-y-3"><div><h2 className="font-display uppercase tracking-widest text-sm text-primary">Seurattujen kisaraportti</h2>{report && <p className="text-xs text-muted-foreground mt-1">{report.race.flag} {report.race.name} · R{report.race.round ?? "—"}</p>}</div>{!report ? <div className="card-dark p-4 text-sm text-muted-foreground">Viimeisimmän kilpailun raporttia ei ole vielä saatavilla.</div> : <div className="grid gap-3 lg:grid-cols-2"><div className="card-dark p-3 space-y-1"><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Kuljettajat</div>{report.drivers.length ? report.drivers.map((r: any) => <ReportRow key={r.slug} row={r} />) : <p className="text-xs text-muted-foreground">Seuraamasi kuljettajat eivät osallistuneet tähän kilpailuun.</p>}</div><div className="card-dark p-3 space-y-2"><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Tiimit</div>{report.teams.length ? report.teams.map((r: any) => <TeamReport key={r.slug} row={r} />) : <p className="text-xs text-muted-foreground">Et seuraa kilpailussa esiintyviä tiimejä.</p>}</div></div>}</section>
      <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display uppercase tracking-widest text-sm text-primary">Trendaavimmat</h2><p className="text-xs text-muted-foreground mt-1">Fanipisteet viimeiseltä 7 päivältä · uusi data tulee mukaan jatkuvasti, vanhin 7 vrk data putoaa pois.</p></div><div className="flex rounded border border-primary/40 p-1"><button onClick={() => setTrendKind("drivers")} className={`px-3 py-1.5 text-[10px] font-display uppercase tracking-widest rounded ${trendKind === "drivers" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Kuljettajat</button><button onClick={() => setTrendKind("teams")} className={`px-3 py-1.5 text-[10px] font-display uppercase tracking-widest rounded ${trendKind === "teams" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Tiimit</button></div></div><div className="card-dark p-3"><TrendList rows={trendRows} favorites={favorites} /></div><p className="text-[10px] text-muted-foreground">📈 = viimeisen 24 tunnin fanipistekertymä on suurempi kuin sitä edeltäneen 24 tunnin aikana · 📉 = pienempi.</p></section>
    </> : <section className="space-y-3"><div><h2 className="font-display uppercase tracking-widest text-sm text-primary">Julkaisut</h2><p className="text-xs text-muted-foreground mt-1">Seuraamiesi kuljettajien ja tiimien vahvistettujen virallisten tilien julkaisut uusimmasta alkaen.</p></div>{postsQ.isLoading ? <div className="card-dark p-4 text-sm text-muted-foreground">Ladataan julkaisuja…</div> : postsQ.isError ? <div className="card-dark p-4 text-sm text-muted-foreground">Julkaisujen lataus epäonnistui.</div> : !(postsQ.data ?? []).length ? <div className="card-dark p-6 text-sm text-muted-foreground">Seuraamiltasi virallisilta tileiltä ei ole vielä julkaisuja. Virallisten tilien vahvistaminen ja julkaisutoiminnot viimeistellään seuraavassa vaiheessa.</div> : <div className="space-y-3">{(postsQ.data ?? []).map((p: any) => <article key={p.id} className="card-dark p-4 border-l-2" style={{ borderLeftColor: colorFor(p.color_key) }}><div className="flex items-center gap-2"><EntityLink entity={{ entity_type: p.entity_type, entity_slug: p.entity_slug }}><span className="font-display text-sm">{p.flag} {p.name}</span></EntityLink><span className="ml-auto text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("fi-FI")}</span></div><p className="text-sm leading-6 mt-3 whitespace-pre-wrap">{p.body}</p>{p.media_url && <img src={p.media_url} alt="" className="mt-3 max-h-[520px] w-full object-contain rounded border border-primary/20" />}<div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"><button disabled className="border border-primary/20 rounded px-2 py-1 opacity-60">♥ Tykkää</button><button disabled className="border border-primary/20 rounded px-2 py-1 opacity-60">Kommentoi</button><button disabled className="border border-primary/20 rounded px-2 py-1 opacity-60">Jaa klubichattiin</button><button disabled className="border border-primary/20 rounded px-2 py-1 opacity-60">Viittaa</button></div></article>)}</div>}</section>}
  </main>;
}
