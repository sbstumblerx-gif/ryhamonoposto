import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listCalendarSessions, SESSION_TYPES } from "@/lib/calendar.functions";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Ilmoitus kaikille kävijöille, kun sessio on tänään tai huomenna. */
export function SessionNotice() {
  const fn = useServerFn(listCalendarSessions);
  const q = useQuery({ queryKey: ["calendar-sessions"], queryFn: () => fn(), staleTime: 5 * 60_000 });
  const [days, setDays] = useState<{ today: string; tomorrow: string } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => { const t = new Date(), tm = new Date(); tm.setDate(t.getDate() + 1); setDays({ today: ymd(t), tomorrow: ymd(tm) }); setDismissed(localStorage.getItem("session-notice-dismissed")); }, []);
  if (!days || !q.data) return null;
  const items = q.data.filter(s => s.race && (s.session_date === days.today || s.session_date === days.tomorrow));
  if (!items.length) return null;
  const key = items.map(s => s.id).join(",");
  if (dismissed === key) return null;
  return <div className="bg-primary/15 border-b border-primary/40">
    <div className="mx-auto max-w-6xl px-3 py-2 flex items-start gap-3 text-xs">
      <span className="text-base leading-none">🔔</span>
      <div className="flex-1 flex flex-col gap-0.5">{items.map(s => <Link key={s.id} to="/kilpailut/$slug" params={{ slug: s.race!.slug }} className="hover:text-primary"><span className="font-display uppercase tracking-widest text-primary">{s.session_date === days.today ? "Tänään" : "Huomenna"}:</span> {s.race!.flag} {s.race!.name} – {SESSION_TYPES[s.session_type]}</Link>)}</div>
      <Link to="/kalenteri" className="font-display uppercase tracking-widest text-primary hidden sm:block">Kalenteri →</Link>
      <button aria-label="Piilota ilmoitus" onClick={() => { localStorage.setItem("session-notice-dismissed", key); setDismissed(key); }} className="text-lg leading-none text-muted-foreground hover:text-primary">×</button>
    </div>
  </div>;
}
