import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listTeams } from "@/lib/content.functions";
import { gradientFor } from "@/lib/team-colors";

export const Route = createFileRoute("/tiimit")({
  head: () => ({ meta: [{ title: "Tiimit — RyhäMonoposto" }] }),
  component: TeamsList,
});

function TeamsList() {
  const list = useServerFn(listTeams);
  const q = useQuery({ queryKey: ["teams"], queryFn: () => list() });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Tiimit</h1>
      <div className="hairline-red mt-3 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(q.data ?? []).map(t => (
          <Link key={t.id} to="/tiimit/$slug" params={{ slug: t.slug }}
            className="rounded-lg overflow-hidden border border-primary/30 hover:border-primary transition p-5 min-h-28 flex items-end"
            style={{ background: gradientFor(t.color_key) }}>
            <div>
              <div className="text-xl">{t.flag}</div>
              <div className="font-display uppercase tracking-widest">{t.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
