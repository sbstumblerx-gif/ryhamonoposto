import { ArrowDown, ArrowUp } from "lucide-react";

export function RankChange({ change }: { change: number | undefined }) {
  if (!change) return null;
  const up = change > 0;
  const label = `${up ? "Noussut" : "Laskenut"} ${Math.abs(change)} sijaa edellisestä kilpailusta`;
  const Icon = up ? ArrowUp : ArrowDown;
  return <span title={label} aria-label={label} className={`inline-flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums font-semibold ${up ? "text-rank-up" : "text-rank-down"}`}><Icon aria-hidden="true" className="size-3" />{Math.abs(change)}</span>;
}