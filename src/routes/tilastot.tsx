import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listSeasons, upsertSeason, deleteSeason } from "@/lib/seasons.functions";
import { useAdmin } from "@/components/admin-store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/tilastot")({
  head: () => ({ meta: [{ title: "Tilastot — RyhäMonoposto" }] }),
  component: StatsIndex,
});

function StatsIndex() {
  const list = useServerFn(listSeasons);
  const save = useServerFn(upsertSeason);
  const del = useServerFn(deleteSeason);
  const qc = useQueryClient();
  const admin = useAdmin();
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  const q = useQuery({ queryKey: ["seasons"], queryFn: () => list() });
  const seasons = q.data ?? [];

  async function add() {
    if (!name.trim()) return;
    await save({ data: { name: name.trim(), sort_order: year } });
    setName("");
    await qc.invalidateQueries({ queryKey: ["seasons"] });
    toast.success("Kausi lisätty");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Tilastot</h1>
      <div className="hairline-red mt-3 mb-6" />
      <p className="text-sm text-muted-foreground mb-4">Valitse kausi.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link
          to="/tilastot/koko-historia"
          className="block card-dark p-6 hover:border-primary transition text-center border-primary/60"
        >
          <div className="font-display uppercase tracking-widest text-primary">Koko historia</div>
        </Link>
        {seasons.map(s => (
          <div key={s.id} className="relative group">
            <Link
              to="/tilastot/$season"
              params={{ season: s.slug }}
              className="block card-dark p-6 hover:border-primary transition text-center"
            >
              <div className="font-display uppercase tracking-widest">{s.name}</div>
            </Link>
            {admin.isAdmin && (
              <button
                onClick={async () => {
                  if (!confirm(`Poistetaanko ${s.name}?`)) return;
                  await del({ data: { id: s.id } });
                  await qc.invalidateQueries({ queryKey: ["seasons"] });
                }}
                className="absolute top-1 right-1 text-xs bg-black/80 border border-primary/50 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100"
              >×</button>
            )}
          </div>
        ))}
      </div>


      {admin.isAdmin && (
        <div className="card-dark p-3 mt-6 flex flex-wrap gap-2 items-center">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Kauden nimi (esim. Kausi 2027)"
            className="flex-1 min-w-[200px] bg-black/70 border border-primary/30 rounded p-2 text-sm" />
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
            className="w-24 bg-black/70 border border-primary/30 rounded p-2 text-sm" />
          <button onClick={add} className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest">Lisää kausi</button>
        </div>
      )}
    </div>
  );
}
