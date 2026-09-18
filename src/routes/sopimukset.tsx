import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDrivers, listTeams } from "@/lib/content.functions";
import { listCircuitContracts, updateCircuitContract, updateTeamEngine, engineOptions } from "@/lib/contract-resources.functions";
import { colorFor } from "@/lib/team-colors";
import { useAdmin } from "@/components/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/sopimukset")({
  head: () => ({ meta: [
    { title: "Sopimukset — RyhäMonoposto" },
    { name: "description", content: "RyhäMonoposton kuljettajien, moottoreiden ja ratojen sopimukset." },
  ]}),
  component: ContractsPage,
});

type Tab = "drivers" | "engines" | "circuits";
type SortMode = "expiring" | "longest";
const CONTRACT_YEARS = Array.from({ length: 16 }, (_, i) => 2025 + i);

function contractEndText(year: number | null | undefined) {
  if (!year) return "Sopimusta ei ole määritetty";
  return year <= 2025 ? `Vanheni ${year}` : `Vanhenee ${year}`;
}

function contractPeriodText(start: number | null | undefined, end: number | null | undefined) {
  const startText = start ? `Alkoi ${start}` : "Alkamisaikaa ei määritetty";
  const endText = end ? contractEndText(end) : "Erääntymisaikaa ei määritetty";
  return `${startText} · ${endText}`;
}

function contractText(value: string | null | undefined) {
  if (!value) return "Ei asetettu";
  if (value === "none") return "Ei sopimusta";
  if (value === "unknown") return "Ei tietoa";
  return `Kauden ${value} loppuun`;
}

function contractYear(value: string | null | undefined) {
  return value && /^20\\d{2}$/.test(value) ? Number(value) : null;
}

function yearsRemaining(value: string | null | undefined) {
  const year = contractYear(value);
  return year == null ? null : Math.max(0, year - new Date().getFullYear());
}

function CircuitContract({ circuit, admin, onSaved }: {
  circuit: any;
  admin: boolean;
  onSaved: () => void;
}) {
  const save = useServerFn(updateCircuitContract);
  const [startYear, setStartYear] = useState<number | "">(circuit.contract_start_year ?? "");
  const [year, setYear] = useState<number | "">(circuit.contract_year ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: {
        slug: circuit.slug,
        contract_status: year === "" ? "unknown" : Number(year) <= 2025 ? "expired" : "active",
        contract_start_year: startYear === "" ? null : Number(startYear),
        contract_year: year === "" ? null : Number(year),
      }});
      onSaved();
      toast.success(`${circuit.name}: sopimus päivitetty`);
    } catch (e: any) {
      toast.error(e?.message ?? "Sopimuksen tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-dark p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display uppercase tracking-widest text-base">{circuit.name}</div>
          <div className={`text-sm mt-1 ${circuit.contract_status === "active" ? "text-primary" : circuit.contract_status === "expired" ? "text-red-400" : "text-muted-foreground"}`}>
            {contractPeriodText(circuit.contract_start_year, circuit.contract_year)}
          </div>
        </div>
        {admin && <div className="flex flex-wrap items-center gap-2">
          <select value={startYear} onChange={e => setStartYear(e.target.value === "" ? "" : Number(e.target.value))}
            className="bg-black/70 border border-primary/30 rounded p-2 text-xs font-display uppercase tracking-widest">
            <option value="">Alkamisaika</option>
            {CONTRACT_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value === "" ? "" : Number(e.target.value))}
            className="bg-black/70 border border-primary/30 rounded p-2 text-xs font-display uppercase tracking-widest">
            <option value="">Ei määritetty</option>
            {CONTRACT_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button disabled={saving} onClick={submit}
            className="bg-primary text-primary-foreground rounded px-3 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50">
            {saving ? "Tallennetaan…" : "Tallenna"}
          </button>
        </div>}
      </div>
    </div>
  );
}

export function ContractsPage() {
  const driversFn = useServerFn(listDrivers);
  const teamsFn = useServerFn(listTeams);
  const circuitsFn = useServerFn(listCircuitContracts);
  const saveEngine = useServerFn(updateTeamEngine);
  const qc = useQueryClient();
  const admin = useAdmin();
  const [tab, setTab] = useState<Tab>("drivers");
  const [sort, setSort] = useState<SortMode>("expiring");
  const driversQ = useQuery({ queryKey: ["contracts-drivers"], queryFn: () => driversFn() });
  const teamsQ = useQuery({ queryKey: ["contracts-teams"], queryFn: () => teamsFn() });
  const circuitsQ = useQuery({ queryKey: ["contracts-circuits"], queryFn: () => circuitsFn() });

  const teams = teamsQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const circuits = circuitsQ.data ?? [];
  const teamBySlug = new Map(teams.map(t => [t.slug, t]));

  const sorted = [...drivers].sort((a: any, b: any) => {
    const aNone = a.current_contract_until === "none";
    const bNone = b.current_contract_until === "none";
    if (aNone !== bNone) return aNone ? 1 : -1;
    const ay = contractYear(a.current_contract_until);
    const by = contractYear(b.current_contract_until);
    const av = ay ?? 9999;
    const bv = by ?? 9999;
    return (sort === "expiring" ? av - bv : bv - av) || a.name.localeCompare(b.name, "fi");
  });

  async function changeEngine(slug: string, value: string, year: number | null) {
    try {
      await saveEngine({ data: { slug, engine_supplier: value === "" ? null : value as any, engine_contract_start_year: teamBySlug.get(slug)?.engine_contract_start_year ?? null, engine_contract_year: year } });
      await qc.invalidateQueries({ queryKey: ["contracts-teams"] });
      toast.success("Moottori päivitetty");
    } catch (e: any) {
      toast.error(e?.message ?? "Moottorin tallennus epäonnistui");
    }
  }

  const loading = tab === "drivers" ? driversQ.isLoading || teamsQ.isLoading :
    tab === "engines" ? teamsQ.isLoading : circuitsQ.isLoading;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Sopimukset</h1>
      <div className="hairline-red mt-3 mb-4" />

      <div className="grid grid-cols-3 gap-1 card-dark p-1 mb-5">
        {([
          ["drivers", "Kuljettajat"],
          ["engines", "Moottorit"],
          ["circuits", "Radat"],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded px-3 py-3 font-display uppercase tracking-widest text-xs transition ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Ladataan sopimuksia…</div> : tab === "drivers" ? (
        <>
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
          </div>
        </>
      ) : tab === "engines" ? (
        <>
          <div className="card-dark p-3 mb-5">
            <div className="font-display uppercase tracking-widest text-sm">Moottorit</div>
            <div className="text-xs text-muted-foreground mt-1">Valitse jokaiselle tiimille käytössä oleva moottori.</div>
          </div>
          <div className="space-y-3">
            {teams.map((team: any) => {
              const color = colorFor(team.color_key);
              return (
                <div key={team.slug} className="card-dark p-4 border-l-2" style={{ borderLeftColor: color }}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {team.logo_url && <img src={team.logo_url} alt="" className="h-10 w-10 object-contain" />}
                      <div>
                        <div className="font-display uppercase tracking-widest" style={{ color }}>{team.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">Moottori: {team.engine_supplier ?? "Ei määritetty"}{team.engine_contract_year || team.engine_contract_start_year ? ` · ${contractPeriodText(team.engine_contract_start_year, team.engine_contract_year)}` : ""}</div>
                      </div>
                    </div>
                    {admin.isAdmin && <div className="flex flex-wrap gap-2">
                      <select value={team.engine_supplier ?? ""} onChange={e => changeEngine(team.slug, e.target.value, team.engine_contract_year ?? null)}
                        className="bg-black/70 border border-primary/30 rounded p-2 text-xs font-display uppercase tracking-widest">
                        <option value="">Ei määritetty</option>
                        {engineOptions.map(engine => <option key={engine} value={engine}>{engine}</option>)}
                      </select>
                      <select value={team.engine_contract_start_year ?? ""} onChange={e => changeEngine(team.slug, team.engine_supplier ?? "", team.engine_contract_year ?? null)}
                        className="bg-black/70 border border-primary/30 rounded p-2 text-xs font-display uppercase tracking-widest">
                        <option value="">Alkamisaika</option>
                        {CONTRACT_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select value={team.engine_contract_year ?? ""} onChange={e => changeEngine(team.slug, team.engine_supplier ?? "", e.target.value === "" ? null : Number(e.target.value))}
                        className="bg-black/70 border border-primary/30 rounded p-2 text-xs font-display uppercase tracking-widest">
                        <option value="">Erääntymisaika</option>
                        {CONTRACT_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 text-xs text-muted-foreground">Moottorilista: {engineOptions.join(" · ")}</div>
        </>
      ) : (
        <>
          <div className="card-dark p-3 mb-5">
            <div className="font-display uppercase tracking-widest text-sm">Ratojen sopimukset</div>
            <div className="text-xs text-muted-foreground mt-1">Admin määrittää jokaiselle radalle, onko sopimus voimassa vai jo umpeutunut.</div>
          </div>
          <div className="space-y-3">
            {circuits.map((circuit: any) => <CircuitContract key={circuit.slug} circuit={circuit} admin={admin.isAdmin}
              onSaved={() => qc.invalidateQueries({ queryKey: ["contracts-circuits"] })} />)}
          </div>
        </>
      )}
    </div>
  );
}
