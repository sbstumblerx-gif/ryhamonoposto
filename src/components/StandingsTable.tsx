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
];

export type StatFieldKey = typeof STAT_FIELDS[number]["key"];

function compareRows(a: StatLine, b: StatLine, key: StatFieldKey): number {
  if (key === "best") {
    const av = a.best ?? Number.POSITIVE_INFINITY;
    const bv = b.best ?? Number.POSITIVE_INFINITY;
    return av - bv || b.points - a.points || a.name.localeCompare(b.name);
  }
  return Number(b[key] ?? 0) - Number(a[key] ?? 0) || b.points - a.points || a.name.localeCompare(b.name);
}

export function StandingsTable({
  rows,
  kind,
  sortKey = null,
}: {
  rows: StatLine[];
  kind: "drivers" | "teams";
  sortKey?: StatFieldKey | null;
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground italic">Ei vielä tuloksia laskettavaksi.</p>;
  }

  const sortedRows = sortKey ? [...rows].sort((a, b) => compareRows(a, b, sortKey)) : rows;
  const columns = sortKey ? STAT_FIELDS.filter(c => c.key === sortKey) : STAT_FIELDS;

  return (
    <div className="overflow-x-auto card-dark">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary/40 text-primary">
            <th className="text-left px-2 py-2 font-display text-[11px] uppercase tracking-widest">#</th>
            <th className="text-left px-2 py-2 font-display text-[11px] uppercase tracking-widest">
              {kind === "drivers" ? "Kuljettaja" : "Valmistaja"}
            </th>
            {columns.map(c => (
              <th key={c.key} className="text-right px-2 py-2 font-display text-[11px] uppercase tracking-widest whitespace-nowrap">
                {c.shortLabel ?? c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, i) => (
            <tr key={r.key} className="border-b border-primary/10 last:border-0">
              <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-2 py-2 whitespace-nowrap">
                {r.slug ? (
                  <Link
                    to={kind === "drivers" ? "/kuljettajat/$slug" : "/tiimit/$slug"}
                    params={{ slug: r.slug }}
                    className="hover:text-primary underline decoration-primary/40"
                  >
                    {r.flag} {r.name}
                  </Link>
                ) : (
                  <span>{r.name}</span>
                )}
              </td>
              {columns.map(c => (
                <td key={c.key} className="px-2 py-2 text-right tabular-nums font-semibold">
                  {r[c.key] == null ? "–" : r[c.key] as number}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
