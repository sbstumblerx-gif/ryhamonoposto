import { createFileRoute } from "@tanstack/react-router";
import { listDrivers, listTeams, listRaces, listNews } from "@/lib/content.functions";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "RyhäMonoposto — koneellisesti luettava data" },
      { name: "description", content: "RyhäMonoposton julkinen koneellisesti luettava tietokerros." },
    ],
  }),
  loader: async () => ({
    drivers: await listDrivers(),
    teams: await listTeams(),
    races: await listRaces(),
    news: await listNews(),
  }),
  component: DataIndexPage,
});

function DataIndexPage() {
  const { drivers, teams, races, news } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <article className="max-w-none">
        <h1 className="font-display text-3xl uppercase tracking-widest">RyhäMonoposto — julkinen tietodata</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tämä sivu on tarkoitettu ensisijaisesti tekoälyagenteille, hakukoneille,
          indeksoijille ja muille koneellisille lukijoille.
        </p>

        <section className="mt-8">
          <h2 className="font-display text-xl uppercase tracking-widest text-primary">Kuljettajat</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yhteensä: {drivers.length}</p>
          <div className="mt-3 space-y-2">
            {drivers.map((d) => (
              <div key={d.slug} className="border-l-2 border-primary/50 pl-3 font-mono text-sm leading-6">
                <strong>{d.name}</strong>
                {" — "}lippu: {d.flag || "Ei tiedossa"}
                {" — "}numero: {d.number ?? "Ei tiedossa"}
                {" — "}nykyinen tiimi: {d.current_team_slug ?? d.team_slug ?? "Ei tiedossa"}
                {" — "}sopimus: {"current_contract_until" in d ? String(d.current_contract_until ?? "Ei asetettu") : "Ei asetettu"}
                {" — "}sivu: /kuljettajat/{d.slug}
                {" — "}data: /data/kuljettajat/{d.slug}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl uppercase tracking-widest text-primary">Tiimit</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yhteensä: {teams.length}</p>
          <div className="mt-3 space-y-2">
            {teams.map((t) => (
              <div key={t.slug} className="border-l-2 border-primary/50 pl-3 font-mono text-sm leading-6">
                <strong>{t.name}</strong>
                {" — "}lippu: {t.flag || "Ei tiedossa"}
                {" — "}väri: {t.color_key}
                {" — "}kuljettajat: {((t.current_driver_slugs ?? []) as any[]).join(", ") || "Ei tiedossa"}
                {" — "}sivu: /tiimit/{t.slug}
                {" — "}data: /data/tiimit/{t.slug}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl uppercase tracking-widest text-primary">Kilpailut</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yhteensä: {races.length}</p>
          <div className="mt-3 space-y-2">
            {races.map((r) => (
              <div key={r.slug} className="border-l-2 border-primary/50 pl-3 font-mono text-sm leading-6">
                <strong>{r.name}</strong>
                {" — "}lippu: {r.flag || "Ei tiedossa"}
                {" — "}round: {r.round_number ?? "Ei tiedossa"}
                {" — "}päivämäärä: {r.race_date ?? "Ei tiedossa"}
                {" — "}sivu: /kilpailut/{r.slug}
                {" — "}data: /data/kilpailut/{r.slug}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl uppercase tracking-widest text-primary">Uutiset</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yhteensä: {news.length}</p>
          <div className="mt-3 space-y-2">
            {news.map((n) => (
              <div key={n.slug} className="border-l-2 border-primary/50 pl-3 font-mono text-sm leading-6">
                <strong>{n.title}</strong>
                {" — "}julkaistu: {n.published_at ?? "Ei tiedossa"}
                {" — "}{n.excerpt ?? ""}
                {" — "}sivu: /uutiset/{n.slug}
                {" — "}data: /data/uutiset/{n.slug}
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
