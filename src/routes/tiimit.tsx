import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTeams, createTeam, deleteTeam, listDrivers } from "@/lib/content.functions";
import { colorFor, gradientFor } from "@/lib/team-colors";
import { useAdmin } from "@/components/admin-store";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/tiimit")({
  head: () => ({ meta: [{ title: "Tiimit — RyhäMonoposto" }] }),
  component: () => <Outlet />,
});

type TeamFilter = "alpha" | "flag";

export function TeamsList() {
  const list = useServerFn(listTeams);
  const driversFn = useServerFn(listDrivers);
  const create = useServerFn(createTeam);
  const del = useServerFn(deleteTeam);
  const qc = useQueryClient();
  const admin = useAdmin();
  const q = useQuery({ queryKey: ["teams"], queryFn: () => list() });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: () => driversFn() });

  const [name, setName] = useState("");
  const [flag, setFlag] = useState("");
  const [color, setColor] = useState("#ef2929");
  const [filter, setFilter] = useState<TeamFilter>("alpha");

  async function add() {
    if (!name.trim()) return;
    try {
      await create({ data: { name: name.trim(), flag, color_key: color } });
      setName(""); setFlag(""); setColor("#ef2929");
      await qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Tiimi lisätty");
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Poistetaanko ${name}?`)) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["teams"] });
  }

  // Active = has at least one current driver assigned (from either side).
  const activeTeamSlugs = useMemo(() => {
    const s = new Set<string>();
    for (const t of q.data ?? []) {
      const cur = Array.isArray(t.current_driver_slugs) ? (t.current_driver_slugs as string[]) : [];
      if (cur.filter(Boolean).length > 0) s.add(t.slug);
    }
    for (const d of driversQ.data ?? []) {
      if (d.current_team_slug) s.add(d.current_team_slug);
    }
    return s;
  }, [q.data, driversQ.data]);

  const groups = useMemo(() => {
    const rows = [...(q.data ?? [])];
    const cmp = filter === "alpha"
      ? (a: any, b: any) => a.name.localeCompare(b.name, "fi")
      : (a: any, b: any) => (a.flag || "").localeCompare(b.flag || "") || a.name.localeCompare(b.name, "fi");
    rows.sort(cmp);
    return {
      active: rows.filter(t => activeTeamSlugs.has(t.slug)),
      inactive: rows.filter(t => !activeTeamSlugs.has(t.slug)),
    };
  }, [q.data, filter, activeTeamSlugs]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Tiimit</h1>
      <div className="hairline-red mt-3 mb-6" />

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-4 flex flex-wrap gap-2 items-center">
          <input placeholder="Tiimin nimi" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 min-w-[160px] bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input placeholder="🇫🇮" value={flag} onChange={e => setFlag(e.target.value)}
            className="w-20 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            Väri
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="h-9 w-12 bg-black border border-primary/40 rounded cursor-pointer" />
          </label>
          <button onClick={add} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
            Lisää tiimi
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-display">Suodatin:</span>
        <select value={filter} onChange={e => setFilter(e.target.value as TeamFilter)}
          className="bg-black/70 border border-primary/40 rounded p-2 text-xs font-display uppercase tracking-widest">
          <option value="alpha">Aakkosjärjestys</option>
          <option value="flag">Kansalaisuus</option>
        </select>
      </div>

      {(["active", "inactive"] as const).map(bucket => (
        groups[bucket].length > 0 && (
          <section key={bucket} className="mb-8">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">
              {bucket === "active" ? "Aktiiviset" : "Ei aktiiviset"}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {groups[bucket].map(t => (
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
                  <span className="sr-only" style={{ color: colorFor(t.color_key) }} />
                </div>
              ))}
            </div>
          </section>
        )
      ))}
    </div>
  );
}
