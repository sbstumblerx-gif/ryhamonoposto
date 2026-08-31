import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listDrivers, listTeams, createDriver, deleteDriver } from "@/lib/content.functions";
import { gradientFor } from "@/lib/team-colors";
import { useAdmin } from "@/components/admin-store";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/kuljettajat")({
  head: () => ({ meta: [{ title: "Kuljettajat — RyhäMonoposto" }, { name: "description", content: "Kaikki RyhäMonoposto-kuljettajat." }] }),
  component: () => <Outlet />,
});

type DriverFilter = "team" | "number" | "flag" | "alpha";

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
  const [filter, setFilter] = useState<DriverFilter>("team");

  async function add() {
    if (!name.trim()) return;
    try {
      await create({ data: { name: name.trim(), flag, number, team_slug: team || null, color_key: "red" } });
      setName(""); setFlag(""); setNumber(1); setTeam("");
      await qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Kuljettaja lisätty");
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Poistetaanko ${name}?`)) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["drivers"] });
  }

  const teams = teamsQ.data ?? [];
  const teamName = useMemo(() => new Map(teams.map(t => [t.slug, t.name] as const)), [teams]);
  const drivers = q.data ?? [];

  function isActive(d: any) { return !!d.current_team_slug; }

  // A driver counts as a "reserve" for badge/sorting purposes either through
  // their current team assignment, or — once they've moved on — through the
  // most recent former-team stint that's flagged as a reserve spell.
  function isReserveDisplay(d: any): boolean {
    if (d.current_team_slug) return !!d.current_team_is_reserve;
    const former = Array.isArray(d.former_teams) ? d.former_teams : [];
    return !!(former[0] as any)?.is_reserve;
  }

  function sortWithin(rows: any[]): any[] {
    const arr = [...rows];
    if (filter === "number") arr.sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
    else if (filter === "flag") arr.sort((a, b) => (a.flag || "").localeCompare(b.flag || "") || a.name.localeCompare(b.name, "fi"));
    else arr.sort((a, b) => a.name.localeCompare(b.name, "fi"));
    return arr;
  }

  // Grouped view (default = team). Active teams first, then inactive teams, then "Ei tiimiä".
  // Within each team, drivers are ordered: active seat drivers, then reserve
  // drivers (current or former reserve stint for that team), then the rest
  // of the team's former (non-reserve) drivers.
  const teamGroups = useMemo(() => {
    if (filter !== "team") return null;
    const activeMap = new Map<string, any[]>();
    const reserveMap = new Map<string, any[]>();
    const formerMap = new Map<string, any[]>();
    const noTeam: any[] = [];
    for (const d of drivers) {
      if (d.current_team_slug) {
        const map = d.current_team_is_reserve ? reserveMap : activeMap;
        const arr = map.get(d.current_team_slug) ?? [];
        arr.push(d);
        map.set(d.current_team_slug, arr);
      } else {
        // Attach to first former team if any, else "no team"
        const former = Array.isArray(d.former_teams) ? (d.former_teams as any[]) : [];
        const first = former[0] as any;
        const slug = typeof first === "object" && first ? first.slug : undefined;
        if (slug) {
          const map = first.is_reserve ? reserveMap : formerMap;
          const arr = map.get(slug) ?? [];
          arr.push(d);
          map.set(slug, arr);
        } else {
          noTeam.push(d);
        }
      }
    }
    const sections: { label: string; color: string | null; drivers: any[] }[] = [];
    // Active teams (any team that has at least 1 active/reserve/former driver)
    for (const t of teams) {
      const active = activeMap.get(t.slug) ?? [];
      const reserve = reserveMap.get(t.slug) ?? [];
      const former = formerMap.get(t.slug) ?? [];
      if (active.length === 0 && reserve.length === 0 && former.length === 0) continue;
      sections.push({
        label: t.name,
        color: t.color_key,
        drivers: [
          ...active.sort((a, b) => a.name.localeCompare(b.name, "fi")),
          ...reserve.sort((a, b) => a.name.localeCompare(b.name, "fi")),
          ...former.sort((a, b) => a.name.localeCompare(b.name, "fi")),
        ],
      });
    }
    // Sort sections: those with any active first
    sections.sort((a, b) => {
      const aActive = a.drivers.some(isActive) ? 1 : 0;
      const bActive = b.drivers.some(isActive) ? 1 : 0;
      return bActive - aActive || a.label.localeCompare(b.label, "fi");
    });
    if (noTeam.length) sections.push({ label: "Ei tiimiä", color: null, drivers: noTeam.sort((a, b) => a.name.localeCompare(b.name, "fi")) });
    return sections;
  }, [filter, drivers, teams]);

  const flat = useMemo(() => {
    if (filter === "team") return null;
    return {
      active: sortWithin(drivers.filter(isActive)),
      inactive: sortWithin(drivers.filter(d => !isActive(d))),
    };
  }, [filter, drivers]);

  function Card({ d }: { d: any }) {
    return (
      <div className="relative group">
        <Link to="/kuljettajat/$slug" params={{ slug: d.slug }}
          className="rounded-lg overflow-hidden border border-primary/30 hover:border-primary transition p-4 min-h-32 flex flex-col justify-between"
          style={{ background: gradientFor(d.color_key) }}>
          <div className="flex items-center justify-between">
            <span className="font-display text-3xl">#{d.number}</span>
            <span className="text-2xl">{d.flag}</span>
          </div>
          <div className="font-display uppercase tracking-widest text-sm mt-2">
            {d.name}
            {isReserveDisplay(d) ? (
              <span className="ml-2 text-[10px] text-muted-foreground">(varakuljettaja)</span>
            ) : !isActive(d) ? (
              <span className="ml-2 text-[10px] text-muted-foreground">(ei aktiivinen)</span>
            ) : null}
          </div>
        </Link>
        {admin.isAdmin && (
          <button onClick={() => remove(d.id, d.name)} className="absolute top-1 right-1 text-xs bg-black/80 border border-primary/50 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100">×</button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Kuljettajat</h1>
      <div className="hairline-red mt-3 mb-6" />

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-4 flex flex-wrap gap-2 items-center">
          <input placeholder="Nimi" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 min-w-[160px] bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input placeholder="🇫🇮" value={flag} onChange={e => setFlag(e.target.value)}
            className="w-16 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input type="number" min={1} max={99} value={number} onChange={e => setNumber(Number(e.target.value))}
            className="w-20 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <select value={team} onChange={e => setTeam(e.target.value)}
            className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
            <option value="">Ei aktiivinen</option>
            {teams.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
          <button onClick={add} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
            Lisää kuljettaja
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-display">Suodatin:</span>
        <select value={filter} onChange={e => setFilter(e.target.value as DriverFilter)}
          className="bg-black/70 border border-primary/40 rounded p-2 text-xs font-display uppercase tracking-widest">
          <option value="team">Tiimit</option>
          <option value="number">Numero</option>
          <option value="flag">Kansalaisuus</option>
          <option value="alpha">Aakkosjärjestys</option>
        </select>
      </div>

      {teamGroups ? (
        <div className="space-y-8">
          {teamGroups.map(sec => (
            <section key={sec.label}>
              <div className="flex items-center gap-3 mb-2">
                {sec.color && <span className="inline-block h-3 w-6 rounded" style={{ background: `linear-gradient(90deg, #000, ${sec.color?.startsWith('#') ? sec.color : ''})` }} />}
                <h2 className="font-display uppercase tracking-widest text-sm text-primary">
                  {sec.label}
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sec.drivers.map(d => <Card key={d.id} d={d} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {flat!.active.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">Aktiiviset</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {flat!.active.map(d => <Card key={d.id} d={d} />)}
              </div>
            </section>
          )}
          {flat!.inactive.length > 0 && (
            <section>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">Ei aktiiviset</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {flat!.inactive.map(d => <Card key={d.id} d={d} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
