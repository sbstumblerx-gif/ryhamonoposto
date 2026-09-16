import { Link } from "@tanstack/react-router";
import type { StatLine } from "@/lib/stats-compute";

export const STAT_FIELDS: { key: keyof StatLine; label: string; shortLabel?: string }[] = [
  { key: "points", label: "Pisteet" },
  { key: "wins", label: "Voitot" },
  { key: "podiums", label: "Podiumit" },
  { key: "poles", label: "Paalupaikat" },
  { key: "fastestLaps", label: "Nopeimmat kierrokset", shortLabel: "FL:s" },
  { key: "driverOfTheDay", label: "Päivän kuljettaja", shortLabel: "DOTD" },
  { key: "starts", label: "Startit" },
  { key: "dnf", label: "DNF" },
  { key: "dsq", label: "DSQ" },
  { key: "dns", label: "DNS" },
  { key: "ret", label: "RET" },
  { key: "best", label: "Paras sijoitus" },
  { key: "sprintPoints", label: "Sprinttipisteet", shortLabel: "SP" },
  { key: "sprintWins", label: "Sprinttivoitot", shortLabel: "SW" },
  { key: "sprintPodiums", label: "Sprinttipodiumit", shortLabel: "SPod" },
  { key: "sprintPoles", label: "Sprinttipaalut", shortLabel: "SPole" },
  { key: "sprintFastestLaps", label: "Sprintin nopeimmat kierrokset", shortLabel: "SFL" },
  { key: "sprintStarts", label: "Sprinttistartit", shortLabel: "SS" },
  { key: "sprintDnf", label: "Sprintti-DNF:t", shortLabel: "SDNF" },
  { key: "sprintDsq", label: "Sprintti-DSQ:t", shortLabel: "SDSQ" },
  { key: "sprintDns", label: "Sprintti-DNS:t", shortLabel: "SDNS" },
  { key: "sprintRet", label: "Sprintti-RET:t", shortLabel: "SRET" },
  { key: "sprintBest", label: "Sprintin paras sijoitus", shortLabel: "SBest" },
];

export type StatFieldKey = typeof STAT_FIELDS[number]["key"];

function compareRows(a: StatLine, b: StatLine, key: StatFieldKey): number {
  if (key === "best" || key === "sprintBest") {
    const av = a[key] ?? Number.POSITIVE_INFINITY;
    const bv = b[key] ?? Number.POSITIVE_INFINITY;
    return Number(av) - Number(bv) || b.points - a.points || a.name.localeCompare(b.name);
  }
  return Number(b[key] ?? 0) - Number(a[key] ?? 0) || b.points - a.points || a.name.localeCompare(b.name);
}

export function StandingsTable({ rows, kind, sortKey = null }: { rows: StatLine[]; kind: "drivers" | "teams"; sortKey?: StatFieldKey | null }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground italic">Ei vielä tuloksia laskettavaksi.</p>;
  const sortedRows = sortKey ? [...rows].sort((a, b) => compareRows(a, b, sortKey)) : rows;
  const columns = sortKey ? STAT_FIELDS.filter(c => c.key === sortKey) : STAT_FIELDS;
  return (
    <div className="overflow-x-auto card-dark">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-primary/40 text-primary"><th className="text-left px-2 py-2 font-display text-[11px] uppercase tracking-widest">#</th><th className="text-left px-2 py-2 font-display text-[11px] uppercase tracking-widest">{kind === "drivers" ? "Kuljettaja" : "Valmistaja"}</th>{columns.map(c => <th key={c.key} className="text-right px-2 py-2 font-display text-[11px] uppercase tracking-widest whitespace-nowrap">{c.shortLabel ?? c.label}</th>)}</tr></thead>
        <tbody>{sortedRows.map((r, i) => <tr key={r.key} className="border-b border-primary/10 last:border-0"><td className="px-2 py-2 text-muted-foreground">{i + 1}</td><td className="px-2 py-2 whitespace-nowrap">{r.slug ? <Link to={kind === "drivers" ? "/kuljettajat/$slug" : "/tiimit/$slug"} params={{ slug: r.slug }} className="hover:text-primary underline decoration-primary/40">{r.flag} {r.name}</Link> : <span>{r.name}</span>}</td>{columns.map(c => <td key={c.key} className="px-2 py-2 text-right tabular-nums font-semibold">{r[c.key] == null ? "–" : r[c.key] as number}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
