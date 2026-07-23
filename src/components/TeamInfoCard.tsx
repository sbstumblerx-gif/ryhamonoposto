import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listDrivers, updateTeam } from "@/lib/content.functions";
import { EditableText } from "@/components/EditableText";
import { SmartText } from "@/components/SmartText";
import { useEntityIndex } from "@/components/useEntityIndex";
import { toast } from "sonner";

type TeamLineup = { from: number; to: number; driver_slugs: [string, string] };
type Team = {
  slug: string;
  name: string;
  flag: string;
  info_card: string | null;
  current_driver_slugs: unknown;
  former_lineups: unknown;
};

const YEARS = Array.from({ length: 2100 - 2025 + 1 }, (_, i) => 2025 + i);

export function TeamInfoCard({ team, isAdmin }: { team: Team; isAdmin: boolean }) {
  const list = useServerFn(listDrivers);
  const save = useServerFn(updateTeam);
  const qc = useQueryClient();
  const entities = useEntityIndex();
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: () => list() });
  const drivers = driversQ.data ?? [];
  const driverBySlug = useMemo(() => new Map(drivers.map((driver) => [driver.slug, driver] as const)), [drivers]);
  const current = asDriverPair(team.current_driver_slugs);
  const lineups = asLineups(team.former_lineups);

  async function patch(p: Partial<Pick<Team, "flag" | "info_card"> & { current_driver_slugs: string[]; former_lineups: TeamLineup[] }>) {
    await save({ data: { slug: team.slug, ...p } });
    await qc.invalidateQueries({ queryKey: ["team", team.slug] });
    await qc.invalidateQueries({ queryKey: ["teams"] });
    toast.success("Tallennettu");
  }

  function driverSelect(value: string, onChange: (slug: string) => void) {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className="bg-black/70 border border-primary/30 rounded p-2 font-display flex-1 min-w-[160px]">
        <option value="">Ei aktiivinen</option>
        {drivers.map((driver) => <option key={driver.slug} value={driver.slug}>{driver.name}</option>)}
      </select>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card-dark p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-display">Kansalaisuus</div>
          {isAdmin ? (
            <input value={team.flag ?? ""} onChange={(event) => patch({ flag: event.target.value })} placeholder="🇫🇮" className="w-full bg-black/70 border border-primary/30 rounded p-2 font-display" />
          ) : <span className="font-display text-xl">{team.flag || "—"}</span>}
        </div>
        {isAdmin && (
          <div className="card-dark p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-display">Tiimin väri</div>
            <input type="color"
              value={(team as any).color_key?.startsWith?.("#") ? (team as any).color_key : "#ef2929"}
              onChange={(e) => patch({ color_key: e.target.value } as any)}
              className="h-10 w-full bg-black border border-primary/30 rounded cursor-pointer" />
          </div>
        )}
      </div>

      <section>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-display">Nykyiset kuljettajat</div>
        {isAdmin ? (
          <div className="grid md:grid-cols-2 gap-2">
            {[0, 1].map((slot) => driverSelect(current[slot] ?? "", (slug) => {
              const next = [...current];
              next[slot] = slug;
              patch({ current_driver_slugs: next.filter(Boolean) });
            }))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {current.filter(Boolean).map((slug) => {
              const driver = driverBySlug.get(slug);
              return driver ? (
                <Link key={slug} to="/kuljettajat/$slug" params={{ slug: driver.slug }} className="card-dark px-3 py-2 font-display uppercase tracking-widest text-primary hover:border-primary transition">
                  {driver.name}
                </Link>
              ) : null;
            })}
            {current.filter(Boolean).length === 0 && <span className="italic text-muted-foreground text-sm">Ei asetettu.</span>}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-display">Entiset kokoonpanot</div>
          {isAdmin && (
            <button onClick={() => patch({ former_lineups: [...lineups, { from: 2025, to: 2025, driver_slugs: [drivers[0]?.slug ?? "", drivers[1]?.slug ?? drivers[0]?.slug ?? ""] }] })} className="text-xs bg-primary text-primary-foreground rounded px-3 py-1 font-display uppercase tracking-widest">
              + Lisää kokoonpano
            </button>
          )}
        </div>
        <ul className="space-y-2">
          {lineups.map((lineup, index) => (
            <li key={index} className="card-dark p-3 flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <>
                  <select value={lineup.from} onChange={(event) => { const next = [...lineups]; next[index] = { ...lineup, from: Number(event.target.value) }; patch({ former_lineups: next }); }} className="bg-black/70 border border-primary/30 rounded p-2 font-display">
                    {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <span>–</span>
                  <select value={lineup.to} onChange={(event) => { const next = [...lineups]; next[index] = { ...lineup, to: Number(event.target.value) }; patch({ former_lineups: next }); }} className="bg-black/70 border border-primary/30 rounded p-2 font-display">
                    {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  {[0, 1].map((slot) => driverSelect(lineup.driver_slugs[slot] ?? "", (slug) => {
                    const next = [...lineups];
                    const pair = [...lineup.driver_slugs] as [string, string];
                    pair[slot] = slug;
                    next[index] = { ...lineup, driver_slugs: pair };
                    patch({ former_lineups: next });
                  }))}
                  <button onClick={() => patch({ former_lineups: lineups.filter((_, i) => i !== index) })} className="text-xs border border-primary/50 rounded px-2 py-1 hover:bg-primary/20">Poista</button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground font-display">{lineup.from}{lineup.from !== lineup.to ? `–${lineup.to}` : ""}</span>
                  {lineup.driver_slugs.map((slug) => {
                    const driver = driverBySlug.get(slug);
                    return driver ? <Link key={slug} to="/kuljettajat/$slug" params={{ slug: driver.slug }} className="font-display uppercase tracking-widest text-primary hover:underline">{driver.name}</Link> : null;
                  })}
                </>
              )}
            </li>
          ))}
        </ul>
        {lineups.length === 0 && !isAdmin && <div className="italic text-muted-foreground text-sm">Ei entisiä kokoonpanoja.</div>}
      </section>

      <section>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-display">Pikatietokortti</div>
        {isAdmin ? (
          <EditableText value={team.info_card ?? ""} multiline placeholder="Kirjoita tiimin pikatiedot… nimet linkittyvät automaattisesti." onSave={(value) => patch({ info_card: value })} />
        ) : (
          <SmartText text={team.info_card || "Ei pikatietoja."} entities={entities} className="font-display text-sm leading-6" />
        )}
      </section>
    </div>
  );
}

function asDriverPair(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 2) : [];
}

function asLineups(value: unknown): TeamLineup[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { from?: unknown; to?: unknown; driver_slugs?: unknown };
    if (typeof row.from !== "number" || typeof row.to !== "number" || !Array.isArray(row.driver_slugs)) return [];
    const pair = row.driver_slugs.filter((driver): driver is string => typeof driver === "string").slice(0, 2);
    if (pair.length < 2) return [];
    return [{ from: row.from, to: row.to, driver_slugs: [pair[0], pair[1]] as [string, string] }];
  });
}