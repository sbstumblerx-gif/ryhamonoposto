import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTeams, createTeam, deleteTeam } from "@/lib/content.functions";
import { gradientFor, TEAM_COLOR_OPTIONS } from "@/lib/team-colors";
import { useAdmin } from "@/components/admin-store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/tiimit")({
  head: () => ({ meta: [{ title: "Tiimit — RyhäMonoposto" }] }),
  component: () => <Outlet />,
});

export function TeamsList() {
  const list = useServerFn(listTeams);
  const create = useServerFn(createTeam);
  const del = useServerFn(deleteTeam);
  const qc = useQueryClient();
  const admin = useAdmin();
  const q = useQuery({ queryKey: ["teams"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [flag, setFlag] = useState("");
  const [color, setColor] = useState("red");

  async function add() {
    if (!name.trim()) return;
    try {
      await create({ data: { name: name.trim(), flag, color_key: color } });
      setName(""); setFlag(""); setColor("red");
      await qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Tiimi lisätty");
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Poistetaanko ${name}?`)) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["teams"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Tiimit</h1>
      <div className="hairline-red mt-3 mb-6" />

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-6 flex flex-wrap gap-2 items-center">
          <input placeholder="Tiimin nimi" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 min-w-[160px] bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input placeholder="🇫🇮" value={flag} onChange={e => setFlag(e.target.value)}
            className="w-20 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <select value={color} onChange={e => setColor(e.target.value)}
            className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
            {TEAM_COLOR_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button onClick={add} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
            Lisää tiimi
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(q.data ?? []).map(t => (
          <div key={t.id} className="relative group">
            <Link to="/tiimit/$slug" params={{ slug: t.slug }}
              className="rounded-lg overflow-hidden border border-primary/30 hover:border-primary transition p-5 min-h-28 flex items-end"
              style={{ background: gradientFor(t.color_key) }}>
              <div>
                <div className="text-xl">{t.flag}</div>
                <div className="font-display uppercase tracking-widest">{t.name}</div>
              </div>
            </Link>
            {admin.isAdmin && (
              <button onClick={() => remove(t.id, t.name)} className="absolute top-1 right-1 text-xs bg-black/80 border border-primary/50 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100">×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
