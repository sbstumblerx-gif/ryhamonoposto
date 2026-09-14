import { Link } from "@tanstack/react-router";
import type { StatLine } from "@/lib/stats-compute";

const COLS: { key: keyof StatLine; label: string }[] = [
  { key: "points", label: "Pist" },
  { key: "wins", label: "Voitot" },
  { key: "podiums", label: "Podiumit" },
  { key: "poles", label: "Paalut" },
  { key: "starts", label: "Startit" },
  { key: "dnf", label: "DNF" },
  { key: "dsq", label: "DSQ" },
  { key: "dns", label: "DNS" },
  { key: "ret", label: "RET" },
];

export function StandingsTable({ rows, kind }: { rows: StatLine[]; kind: "drivers" | "teams" }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground italic">Ei vielä tuloksia laskettavaksi.</p>;
  }
  return (
    <div className="overflow-x-auto card-dark">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary/40 text-primary">
            <th className="text-left px-2 py-2 font-display text-[11px] uppercase tracking-widest">#</th>
            <th className="text-left px-2 py-2 font-display text-[11px] uppercase tracking-widest">
              {kind === "drivers" ? "Kuljettaja" : "Valmistaja"}
            </th>
            {COLS.map(c => (
              <th key={c.key} className="text-right px-2 py-2 font-display text-[11px] uppercase tracking-widest whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
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
              {COLS.map(c => (
                <td key={c.key} className="px-2 py-2 text-right tabular-nums">{r[c.key] as number}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
