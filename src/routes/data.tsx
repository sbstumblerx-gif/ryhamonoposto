import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDrivers, listTeams, listRaces, listNews } from "@/lib/content.functions";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "RyhäMonoposto — koneellisesti luettava data" },
      { name: "description", content: "RyhäMonoposton julkinen koneellisesti luettava tietokerros." },
    ],
  }),
  component: DataIndexPage,
});

function DataIndexPage() {
  const getDrivers = useServerFn(listDrivers);
  const getTeams = useServerFn(listTeams);
  const getRaces = useServerFn(listRaces);
  const getNews = useServerFn(listNews);

  const drivers = useQuery({ queryKey: ["machine-data", "drivers"], queryFn: () => getDrivers() });
  const teams = useQuery({ queryKey: ["machine-data", "teams"], queryFn: () => getTeams() });
  const races = useQuery({ queryKey: ["machine-data", "races"], queryFn: () => getRaces() });
  const news = useQuery({ queryKey: ["machine-data", "news"], queryFn: () => getNews() });

  const loading = drivers.isLoading || teams.isLoading || races.isLoading || news.isLoading;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <article className="prose prose-invert max-w-none">
        <h1>RyhäMonoposto — julkinen tietodata</h1>
        <p>
          Tämä sivu on tarkoitettu ensisijaisesti tekoälyagenteille, hakukoneille,
          indeksoijille ja muille koneellisille lukijoille.
        </p>

        {loading ? (
          <p>Ladataan tietokantaa…</p>
        ) : (
          <>
            <section>
              <h2>Kuljettajat</h2>
              <p>Yhteensä: {drivers.data?.length ?? 0}</p>
              {(drivers.data ?? []).map((d) => (
                <div key={d.slug}>
                  <strong>{d.name}</strong>
                  {" — "}
                  {d.flag || "Ei lippua"}
                  {" — "}
                  numero {d.number ?? "ei tiedossa"}
                  {" — "}
                  nykyinen tiimi: {d.current_team_slug ?? d.team_slug ?? "ei tiedossa"}
                  {" — "}
                  sopimus: {"current_contract_until" in d
                    ? String(d.current_contract_until ?? "ei asetettu")
                    : "ei asetettu"}
                  {" — "}
                  sivu: /kuljettajat/{d.slug}
                </div>
              ))}
            </section>

            <section>
              <h2>Tiimit</h2>
              <p>Yhteensä: {teams.data?.length ?? 0}</p>
              {(teams.data ?? []).map((t) => (
                <div key={t.slug}>
                  <strong>{t.name}</strong>
                  {" — "}
                  {t.flag || "Ei lippua"}
                  {" — "}
                  väri: {t.color_key}
                  {" — "}
                  kuljettajat: {(t.current_driver_slugs ?? []).join(", ") || "ei tiedossa"}
                  {" — "}
                  sivu: /tiimit/{t.slug}
                </div>
              ))}
            </section>

            <section>
              <h2>Kilpailut</h2>
              <p>Yhteensä: {races.data?.length ?? 0}</p>
              {(races.data ?? []).map((r) => (
                <div key={r.slug}>
                  <strong>{r.name}</strong>
                  {" — "}
                  {r.flag || "Ei lippua"}
                  {" — "}
                  round: {r.round_number ?? "ei tiedossa"}
                  {" — "}
                  päivämäärä: {r.race_date ?? "ei tiedossa"}
                  {" — "}
                  sivu: /kilpailut/{r.slug}
                </div>
              ))}
            </section>

            <section>
              <h2>Uutiset</h2>
              <p>Yhteensä: {news.data?.length ?? 0}</p>
              {(news.data ?? []).map((n) => (
                <div key={n.slug}>
                  <strong>{n.title}</strong>
                  {" — "}
                  {n.published_at ?? "ei julkaisuaikaa"}
                  {" — "}
                  {n.excerpt ?? ""}
                  {" — "}
                  sivu: /uutiset/{n.slug}
                </div>
              ))}
            </section>
          </>
        )}
      </article>
    </main>
  );
}
