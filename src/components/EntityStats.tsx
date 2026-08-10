import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/stats.functions";

const FIELDS = [
  { key: "points", label: "Pisteet" },
  { key: "wins", label: "Voitot" },
  { key: "podiums", label: "Podiumit" },
  { key: "poles", label: "Paalupaikat" },
  { key: "starts", label: "Startit" },
  { key: "best", label: "Paras sijoitus" },
  { key: "dnf", label: "DNF" },
  { key: "dsq", label: "DSQ" },
  { key: "dns", label: "DNS" },
  { key: "ret", label: "RET" },
] as const;

/** Automatic career statistics for a single driver or team. */
export function EntityStats({ kind, slug }: { kind: "drivers" | "teams"; slug: string }) {
  const fn = useServerFn(getStandings);
  const q = useQuery({ queryKey: ["standings", "all"], queryFn: () => fn({ data: { year: null } }) });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Lasketaan tilastoja…</div>;
  const row = (kind === "drivers" ? q.data?.drivers : q.data?.teams)?.find(r => r.slug === slug);
  if (!row) return <p className="text-sm text-muted-foreground italic">Ei vielä tuloksia laskettavaksi.</p>;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">Lasketaan automaattisesti kaikista sessioista</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {FIELDS.map(f => (
          <div key={f.key} className="card-dark p-3 text-center">
            <div className="font-display text-2xl text-primary">{row[f.key] ?? "–"}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
