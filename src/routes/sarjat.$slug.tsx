import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listSeries } from "@/lib/series.functions";

export const Route = createFileRoute("/sarjat/$slug")({
  head: () => ({ meta: [{ title: "Oma sarja — RyhäMonoposto" }] }),
  component: SeriesDetail,
});
function SeriesDetail() {
  const { slug } = Route.useParams();
  const listFn = useServerFn(listSeries);
  const query = useQuery({ queryKey: ["series-directory"], queryFn: () => listFn() });
  const series = (query.data ?? []).find((s: any) => s.slug === slug);
  if (query.isLoading) return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted-foreground">Ladataan sarjaa…</main>;
  if (!series) return <main className="mx-auto max-w-4xl px-4 py-8 space-y-4"><h1 className="font-display text-2xl text-primary">Sarjaa ei löytynyt</h1><Link to="/sarjat" className="text-primary hover:underline">← Takaisin sarjoihin</Link></main>;
  return <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
    <Link to="/sarjat" className="text-sm text-primary hover:underline">← Kaikki sarjat</Link>
    <header><p className="text-xs uppercase tracking-[0.3em] text-primary">Yhteisön sarja</p><h1 className="font-display uppercase tracking-widest text-3xl mt-2">{series.name}</h1><p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{series.description || "Sarjalla ei ole kuvausta vielä."}</p><div className="hairline-red mt-4"/></header>
    <section className="card-dark p-5 space-y-3"><h2 className="font-display uppercase tracking-widest text-xl">🏁 Sarja on valmis rakennettavaksi</h2><p className="text-sm text-muted-foreground">Tämä sarja on luotu omalla tietosisällöllään. Kuljettajien, tiimien, kilpailujen, tulosten ja muiden sarjakohtaisten hallintatoimintojen käyttöliittymä toteutetaan seuraavassa vaiheessa.</p><div className="grid gap-3 sm:grid-cols-3">{["Kuljettajat","Tiimit","Kilpailut"].map(label=><div key={label} className="rounded border border-primary/25 p-4"><p className="font-display">{label}</p><p className="text-xs text-muted-foreground mt-1">Ei vielä lisätty</p></div>)}</div></section>
  </main>;
}
