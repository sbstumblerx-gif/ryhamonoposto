import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listDrivers, listTeams, createDriver, deleteDriver } from "@/lib/content.functions";
import { gradientFor, TEAM_COLOR_OPTIONS } from "@/lib/team-colors";
import { useAdmin } from "@/components/admin-store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/kuljettajat")({
  head: () => ({ meta: [{ title: "Kuljettajat — RyhäMonoposto" }, { name: "description", content: "Kaikki RyhäMonoposto-kuljettajat." }] }),
  component: () => <Outlet />,
});

export function DriversList() {
  const list = useServerFn(listDrivers);
  const teamsFn = useServerFn(listTeams);
  const create = useServerFn(createDriver);
  const del = useServerFn(deleteDriver);
  const qc = useQueryClient();
  const admin = useAdmin();
  const q = useQuery({ queryKey: ["drivers"], queryFn: () => list() });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });

  const [name, setName] = useState("");
  const [flag, setFlag] = useState("");
  const [number, setNumber] = useState<number>(1);
  const [team, setTeam] = useState("");
  const [color, setColor] = useState("red");

  async function add() {
    if (!name.trim()) return;
    try {
      await create({ data: { name: name.trim(), flag, number, team_slug: team || null, color_key: color } });
      setName(""); setFlag(""); setNumber(1); setTeam(""); setColor("red");
      await qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Kuljettaja lisätty");
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Poistetaanko ${name}?`)) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["drivers"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Kuljettajat</h1>
      <div className="hairline-red mt-3 mb-6" />

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-6 flex flex-wrap gap-2 items-center">
          <input placeholder="Nimi" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 min-w-[160px] bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input placeholder="🇫🇮" value={flag} onChange={e => setFlag(e.target.value)}
            className="w-16 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input type="number" min={1} max={99} value={number} onChange={e => setNumber(Number(e.target.value))}
            className="w-20 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <select value={team} onChange={e => {
            setTeam(e.target.value);
            const t = (teamsQ.data ?? []).find(x => x.slug === e.target.value);
            if (t?.color_key) setColor(t.color_key);
          }} className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
            <option value="">— tiimi —</option>
            {(teamsQ.data ?? []).map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
          <select value={color} onChange={e => setColor(e.target.value)}
            className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
            {TEAM_COLOR_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button onClick={add} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
            Lisää kuljettaja
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {(q.data ?? []).map(d => (
          <div key={d.id} className="relative group">
            <Link to="/kuljettajat/$slug" params={{ slug: d.slug }}
              className="rounded-lg overflow-hidden border border-primary/30 hover:border-primary transition p-4 min-h-32 flex flex-col justify-between"
              style={{ background: gradientFor(d.color_key) }}>
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl">#{d.number}</span>
                <span className="text-2xl">{d.flag}</span>
              </div>
              <div className="font-display uppercase tracking-widest text-sm mt-2">{d.name}</div>
            </Link>
            {admin.isAdmin && (
              <button onClick={() => remove(d.id, d.name)} className="absolute top-1 right-1 text-xs bg-black/80 border border-primary/50 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100">×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
