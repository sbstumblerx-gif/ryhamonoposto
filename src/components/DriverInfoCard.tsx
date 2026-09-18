import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTeams, updateDriver } from "@/lib/content.functions";
import { updateDriverContract, ContractUntil, type ContractUntilValue } from "@/lib/driver-contract.functions";
import { EditableText } from "@/components/EditableText";
import { SmartText } from "@/components/SmartText";
import { useEntityIndex } from "@/components/useEntityIndex";
import { toast } from "sonner";

type FormerTeam = { slug: string; from: number; to: number; is_reserve?: boolean };
type Driver = {
  slug: string;
  name: string;
  number: number | null;
  flag: string;
  info_card: string | null;
  current_team_slug: string | null;
  current_team_since: number | null;
  current_team_is_reserve?: boolean | null;
  current_contract_until?: ContractUntilValue | null;
  contract_start_year?: number | null;
  former_teams: FormerTeam[] | null;
};

const YEARS = Array.from({ length: 2100 - 2025 + 1 }, (_, i) => 2025 + i);
const CONTRACT_OPTIONS = ["none", ...Array.from({ length: 2040 - 2026 + 1 }, (_, i) => String(2026 + i)), "unknown"] as const;

function contractLabel(value: ContractUntilValue | null | undefined) {
  if (value === "none") return "Ei sopimusta";
  if (value === "unknown") return "Ei tietoa";
  if (value) return value;
  return "Ei asetettu";
}

export function DriverInfoCard({ driver, isAdmin }: { driver: Driver; isAdmin: boolean }) {
  const teamsQ = useQuery({ queryKey: ["teams-list"], queryFn: () => useServerFnListTeams() });
  const teams = teamsQ.data ?? [];
  const teamBySlug = useMemo(() => new Map(teams.map(t => [t.slug, t] as const)), [teams]);
  const save = useServerFn(updateDriver);
  const saveContract = useServerFn(updateDriverContract);
  const qc = useQueryClient();
  const entities = useEntityIndex();
  const former: FormerTeam[] = Array.isArray(driver.former_teams) ? driver.former_teams : [];

  async function patch(p: Partial<Pick<Driver, "info_card" | "current_team_slug" | "current_team_since" | "current_team_is_reserve" | "number" | "flag"> & { former_teams: FormerTeam[] }>) {
    try {
      await save({ data: { slug: driver.slug, ...p } });
      await qc.invalidateQueries({ queryKey: ["driver", driver.slug] });
      toast.success("Tallennettu");
    } catch (e: any) {
      toast.error(e?.message ?? "Tallennus epäonnistui");
    }
  }

  async function patchContract(contractStartYear: number | null, value: ContractUntilValue | null) {
    try {
      await saveContract({ data: { slug: driver.slug, contract_start_year: contractStartYear, current_contract_until: value } });
      await qc.invalidateQueries({ queryKey: ["driver", driver.slug] });
      toast.success("Sopimustieto tallennettu");
    } catch (e: any) {
      toast.error(e?.message ?? "Sopimustiedon tallennus epäonnistui");
    }
  }

  const currentTeam = driver.current_team_slug ? teamBySlug.get(driver.current_team_slug) : null;

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Numero">
          {isAdmin ? (
            <select value={driver.number ?? ""} onChange={e => patch({ number: Number(e.target.value) })}
              className="w-full bg-black/70 border border-primary/30 rounded p-2 font-display text-lg">
              {Array.from({ length: 99 }, (_, i) => i + 1).map(n => <option key={n} value={n}>#{n}</option>)}
            </select>
          ) : <span className="font-display text-2xl">#{driver.number ?? "—"}</span>}
        </Stat>
        <Stat label="Kansalaisuus">
          {isAdmin ? (
            <input value={driver.flag ?? ""} onChange={e => patch({ flag: e.target.value })}
              placeholder="🇫🇮 FIN"
              className="w-full bg-black/70 border border-primary/30 rounded p-2 font-display" />
          ) : <span className="font-display text-xl">{driver.flag || "—"}</span>}
        </Stat>
      </div>

      {/* Nykyinen sopimus */}
      <div className="card-dark p-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-display">Nykyinen sopimus</div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <select
              value={driver.contract_start_year ?? ""}
              onChange={e => patchContract(e.target.value ? Number(e.target.value) : null, driver.current_contract_until ?? null)}
              className="flex-1 min-w-[150px] bg-black/70 border border-primary/30 rounded p-2 font-display"
            >
              <option value="">— Alkamisaika —</option>
              {YEARS.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select
              value={driver.current_contract_until ?? ""}
              onChange={e => patchContract(driver.contract_start_year ?? null, (e.target.value || null) as ContractUntilValue | null)}
              className="flex-1 min-w-[150px] bg-black/70 border border-primary/30 rounded p-2 font-display"
            >
              <option value="">— Päättymisaika —</option>
              {CONTRACT_OPTIONS.map(value => (
                <option key={value} value={value}>{contractLabel(value)}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="font-display text-lg">
            {driver.contract_start_year ? `Alkoi ${driver.contract_start_year} · ` : ""}
            {contractLabel(driver.current_contract_until)}
          </div>
        )}
      </div>

      {/* Nykyinen tiimi */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-display">Nykyinen tiimi</div>
        {isAdmin ? (
          <div className="flex gap-2 flex-wrap items-center">
            <select value={driver.current_team_slug ?? ""} onChange={e => patch({ current_team_slug: e.target.value || null })}
              className="bg-black/70 border border-primary/30 rounded p-2 font-display flex-1 min-w-[180px]">
              <option value="">Ei aktiivinen</option>
              {teams.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
            <select value={driver.current_team_since ?? ""} onChange={e => patch({ current_team_since: e.target.value ? Number(e.target.value) : null })}
              className="bg-black/70 border border-primary/30 rounded p-2 font-display">
              <option value="">— vuosi —</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-muted-foreground">
              <input type="checkbox" checked={!!driver.current_team_is_reserve}
                onChange={e => patch({ current_team_is_reserve: e.target.checked })} />
              Varakuljettaja
            </label>
          </div>
        ) : currentTeam ? (
          <Link to="/tiimit/$slug" params={{ slug: currentTeam.slug }} className="inline-flex items-center gap-3 card-dark p-3 hover:border-primary transition">
            <span className="font-display uppercase tracking-widest text-primary">{currentTeam.name}</span>
            {driver.current_team_since && <span className="text-xs text-muted-foreground">alkaen {driver.current_team_since}</span>}
            {driver.current_team_is_reserve && <span className="text-xs text-muted-foreground">(varakuljettaja)</span>}
          </Link>
        ) : <div className="italic text-muted-foreground text-sm">Ei asetettu.</div>}
      </div>

      {/* Entiset tiimit */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-display">Entiset tiimit</div>
          {isAdmin && (
            <button onClick={() => patch({ former_teams: [...former, { slug: teams[0]?.slug ?? "", from: 2025, to: 2025 }] })}
              className="text-xs bg-primary text-primary-foreground rounded px-3 py-1 font-display uppercase tracking-widest">+ Lisää tiimi</button>
          )}
        </div>
        {former.length === 0 && !isAdmin && <div className="italic text-muted-foreground text-sm">Ei entisiä tiimejä.</div>}
        <ul className="space-y-2">
          {former.map((ft, i) => {
            const team = teamBySlug.get(ft.slug);
            return (
              <li key={i} className="card-dark p-3 flex flex-wrap items-center gap-2">
                {isAdmin ? (
                  <>
                    <select value={ft.slug} onChange={e => {
                      const next = [...former]; next[i] = { ...ft, slug: e.target.value }; patch({ former_teams: next });
                    }} className="bg-black/70 border border-primary/30 rounded p-2 font-display flex-1 min-w-[160px]">
                      {teams.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                    </select>
                    <select value={ft.from} onChange={e => { const next = [...former]; next[i] = { ...ft, from: Number(e.target.value) }; patch({ former_teams: next }); }}
                      className="bg-black/70 border border-primary/30 rounded p-2 font-display">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span>–</span>
                    <select value={ft.to} onChange={e => { const next = [...former]; next[i] = { ...ft, to: Number(e.target.value) }; patch({ former_teams: next }); }}
                      className="bg-black/70 border border-primary/30 rounded p-2 font-display">
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-muted-foreground">
                      <input type="checkbox" checked={!!ft.is_reserve}
                        onChange={e => { const next = [...former]; next[i] = { ...ft, is_reserve: e.target.checked }; patch({ former_teams: next }); }} />
                      Varakuljettaja
                    </label>
                    <button onClick={() => patch({ former_teams: former.filter((_, j) => j !== i) })}
                      className="text-xs border border-primary/50 rounded px-2 py-1 hover:bg-primary/20">Poista</button>
                  </>
                ) : team ? (
                  <>
                    <Link to="/tiimit/$slug" params={{ slug: team.slug }} className="font-display uppercase tracking-widest text-primary hover:underline">{team.name}</Link>
                    <span className="text-xs text-muted-foreground">{ft.from}{ft.from !== ft.to ? `–${ft.to}` : ""}</span>
                    {ft.is_reserve && <span className="text-xs text-muted-foreground">(varakuljettaja)</span>}
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Vapaa teksti */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-display">Tietoja</div>
        {isAdmin ? (
          <EditableText value={driver.info_card ?? ""} multiline placeholder="Kirjoita tietoja kuljettajasta…"
            onSave={(v) => patch({ info_card: v })} />
        ) : (
          <SmartText text={driver.info_card || "Ei kuvausta."} entities={entities} className="font-display text-sm leading-6" />
        )}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card-dark p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-display">{label}</div>
      {children}
    </div>
  );
}

function useServerFnListTeams() {
  return listTeams();
}
