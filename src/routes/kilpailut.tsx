import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listRaces, upsertRace, deleteRace } from "@/lib/content.functions";
import { seasonYearFromName, countryFromRaceName } from "@/lib/stats-compute";
import { useAdmin } from "@/components/admin-store";

import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/kilpailut")({
  head: () => ({ meta: [{ title: "Kilpailut — RyhäMonoposto" }, { name: "description", content: "Kaikki RyhäMonoposto-kilpailut uusiusjärjestyksessä." }] }),
  component: RacesLayout,
});

function RacesLayout() {
  return <Outlet />;
}

export function RacesIndex() {
  const list = useServerFn(listRaces);
  const create = useServerFn(upsertRace);
  const del = useServerFn(deleteRace);
  const qc = useQueryClient();
  const admin = useAdmin();
  const q = useQuery({ queryKey: ["races"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [flag, setFlag] = useState("");
  const [round, setRound] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  const races = q.data ?? [];
  const seasonOptions = [...new Set(races.map(r => seasonYearFromName(r.name)).filter((y): y is number => y != null))].sort((a, b) => b - a);
  const countryOptions = [...new Set(races.map(r => countryFromRaceName(r.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filtered = races.filter(r =>
    (seasonFilter === "all" || String(seasonYearFromName(r.name)) === seasonFilter)
    && (countryFilter === "all" || countryFromRaceName(r.name) === countryFilter));

  async function add() {
    if (!name.trim()) return;
    try {
      const r = round.trim() ? Math.min(50, Math.max(1, Number(round))) : null;
      await create({ data: { name, flag, round_number: r, qualifying_content: "", race_content: "" } });
      setName(""); setFlag(""); setRound("");
      await qc.invalidateQueries({ queryKey: ["races"] });
      toast.success("Kilpailu lisätty");
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Poistetaanko kilpailu?")) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["races"] });
  }


  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Kilpailut</h1>
      <div className="hairline-red mt-3 mb-6" />

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-6 flex flex-col md:flex-row gap-2">
          <input placeholder="Kilpailun nimi (esim. Kiina 2025)" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input placeholder="🇨🇳" value={flag} onChange={e => setFlag(e.target.value)}
            className="w-24 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input type="number" min={1} max={50} placeholder="R#" value={round} onChange={e => setRound(e.target.value)}
            className="w-20 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <button onClick={add} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
            Lisää
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)}
          className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
          <option value="all">Kaikki kaudet</option>
          {seasonOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
          className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
          <option value="all">Kaikki radat / maat</option>
          {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <ul className="space-y-2">
        {filtered.map(r => (

          <li key={r.id} className="card-dark p-4 flex items-center justify-between hover:border-primary transition">
            <Link to="/kilpailut/$slug" params={{ slug: r.slug }} className="flex-1 flex items-center gap-3">
              <span className="text-2xl">{r.flag}</span>
              {r.round_number != null && (
                <span className="font-display text-[10px] px-1.5 py-0.5 rounded border border-primary/60 text-primary">R{r.round_number}</span>
              )}
              <span className="font-display uppercase tracking-widest">{r.name}</span>
              {r.race_date && <span className="text-xs text-muted-foreground ml-auto mr-3">{new Date(r.race_date).toLocaleDateString("fi-FI")}</span>}
            </Link>
            {admin.isAdmin && (
              <button onClick={() => remove(r.id)} className="text-xs text-primary underline ml-3">Poista</button>
            )}
          </li>
        ))}
        {(q.data ?? []).length === 0 && <li className="text-sm text-muted-foreground italic">Ei kilpailuja vielä.</li>}
      </ul>
    </div>
  );
}
