import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listDrivers, listTeams } from "@/lib/content.functions";
import { colorFor } from "@/lib/team-colors";

export const Route = createFileRoute("/sopimukset")({
  head: () => ({ meta: [
    { title: "Sopimukset — RyhäMonoposto" },
    { name: "description", content: "RyhäMonoposton kuljettajien nykyiset sopimukset ja niiden kestot." },
  ]}),
  component: ContractsPage,
});

type SortMode = "expiring" | "longest";

function contractText(value: string | null | undefined) {
  if (!value) return "Ei asetettu";
  if (value === "none") return "Ei sopimusta";
  if (value === "unknown") return "Ei tietoa";
  return `Kauden ${value} loppuun`;
}

function contractYear(value: string | null | undefined) {
  return value && /^20\d{2}$/.test(value) ? Number(value) : null;
}

function yearsRemaining(value: string | null | undefined) {
  const year = contractYear(value);
  return year == null ? null : Math.max(0, year - new Date().getFullYear());
}

export function ContractsPage() {
  const driversFn = useServerFn(listDrivers);
  const teamsFn = useServerFn(listTeams);
  const driversQ = useQuery({ queryKey: ["contracts-drivers"], queryFn: () => driversFn() });
  const teamsQ = useQuery({ queryKey: ["contracts-teams"], queryFn: () => teamsFn() });
  const [sort, setSort] = useState<SortMode>("expiring");

  const teams = teamsQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const teamBySlug = new Map(teams.map(t => [t.slug, t]));

  const sorted = [...drivers].sort((a: any, b: any) => {
    const aNone = a.current_contract_until === "none";
    const bNone = b.current_contract_until === "none";

    // "Ei sopimusta" is always last, regardless of sort direction.
    if (aNone !== bNone) return aNone ? 1 : -1;

    const ay = contractYear(a.current_contract_until);
    const by = contractYear(b.current_contract_until);
    const av = ay ?? 9999;
    const bv = by ?? 9999;
    return (sort === "expiring" ? av - bv : bv - av) || a.name.localeCompare(b.name, "fi");
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Sopimukset</h1>
      <div className="hairline-red mt-3 mb-4" />
      <div className="card-dark p-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display uppercase tracking-widest text-sm">Kuljettajien sopimukset</div>
          <div className="text-xs text-muted-foreground mt-1">Nykyinen tiimi ja sopimuksen voimassaolo.</div>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as SortMode)}
          className="bg-black/70 border border-primary/40 rounded p-2 text-xs font-display uppercase tracking-widest">
          <option value="expiring">Vanhenee lähimpänä</option>
          <option value="longest">Eniten aikaa jäljellä</option>
        </select>
      </div>

      {driversQ.isLoading || teamsQ.isLoading ? <div className="text-sm text-muted-foreground">Ladataan sopimuksia…</div> :
        <div className="space-y-3">
          {sorted.map((driver: any) => {
            const team = driver.current_team_slug ? teamBySlug.get(driver.current_team_slug) : null;
            const color = colorFor(team?.color_key ?? driver.color_key);
            const year = contractYear(driver.current_contract_until);
            const remaining = yearsRemaining(driver.current_contract_until);
            return (
              <Link key={driver.slug} to="/kuljettajat/$slug" params={{ slug: driver.slug }}
                className="card-dark block p-4 border-l-2 hover:border-primary transition" style={{ borderLeftColor: color }}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl shrink-0">{driver.flag}</span>
                    <div className="min-w-0">
                      <div className="font-display uppercase tracking-widest text-base" style={{ color }}>{driver.name}</div>
                      <div className="text-xs mt-1">
                        {team ? <Link to="/tiimit/$slug" params={{ slug: team.slug }}
                          className="inline-flex items-center gap-2 text-muted-foreground hover:underline" onClick={e => e.stopPropagation()}>
                          <span>{team.name}</span>
                          {team.logo_url && <img src={team.logo_url} alt="" className="h-7 w-7 object-contain" />}
                        </Link> : <span className="text-muted-foreground">Ei nykyistä tiimiä</span>}
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Sopimus voimassa</div>
                    <div className="font-display text-lg" style={{ color }}>{contractText(driver.current_contract_until)}</div>
                    {year != null && <div className="text-xs text-muted-foreground mt-1">
                      {remaining === 0 ? "Päättyy tämän kauden lopussa" : `${remaining} kautta jäljellä`}
                    </div>}
                  </div>
                </div>
              </Link>
            );
          })}
          {!sorted.length && <div className="card-dark p-5 text-sm text-muted-foreground italic">Ei kuljettajia.</div>}
        </div>}
    </div>
  );
}
