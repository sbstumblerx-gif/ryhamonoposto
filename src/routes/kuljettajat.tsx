import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDrivers } from "@/lib/content.functions";
import { gradientFor } from "@/lib/team-colors";

export const Route = createFileRoute("/kuljettajat")({
  head: () => ({
    meta: [
      { title: "Kuljettajat — RyhäMonoposto" },
      { name: "description", content: "Kaikki RyhäMonoposto-kuljettajat." },
    ],
  }),
  component: DriversList,
});

function DriversList() {
  const list = useServerFn(listDrivers);
  const q = useQuery({ queryKey: ["drivers"], queryFn: () => list() });

  if (q.isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-8">Ladataan kuljettajia…</div>;
  }

  if (q.isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-destructive">
        Virhe kuljettajien latauksessa.
      </div>
    );
  }

  const drivers = q.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">
        Kuljettajat
      </h1>
      <div className="hairline-red mt-3 mb-6" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {drivers.map((d) => {
          // Varmistetaan, että slug on olemassa ennen Link-komponentin luontia
          const slug = d.slug || d.id;

          return (
            <Link
              key={d.id}
              to="/kuljettajat/$slug"
              params={{ slug }}
              className="rounded-lg overflow-hidden border border-primary/30 hover:border-primary transition p-4 min-h-32 flex flex-col justify-between block cursor-pointer"
              style={{ background: gradientFor(d.color_key) }}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl">#{d.number}</span>
                <span className="text-2xl">{d.flag}</span>
              </div>
              <div className="font-display uppercase tracking-widest text-sm mt-2">
                {d.name}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
