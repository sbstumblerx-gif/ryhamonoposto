import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listCalendarSessions, addCalendarSession, deleteCalendarSession, SESSION_TYPES, type CalendarSession, type SessionType } from "@/lib/calendar.functions";
import { listRaces } from "@/lib/content.functions";
import { useAdmin } from "@/components/admin-store";

export const Route = createFileRoute("/kalenteri")({
  head: () => ({ meta: [
    { title: "Kalenteri — RyhäMonoposto" },
    { name: "description", content: "RyhäMonoposton kisaviikonloppujen aikataulu 2026–2040: testaus, vapaat harjoitukset, aika-ajot, sprintit ja kilpailut." },
    { property: "og:title", content: "Kalenteri — RyhäMonoposto" },
    { property: "og:description", content: "Kisaviikonloppujen aikataulu 2026–2040: testaus, vapaat harjoitukset, aika-ajot, sprintit ja kilpailut." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CalendarPage,
});

const MONTHS = ["Tammikuu","Helmikuu","Maaliskuu","Huhtikuu","Toukokuu","Kesäkuu","Heinäkuu","Elokuu","Syyskuu","Lokakuu","Marraskuu","Joulukuu"];
const DAYS = ["Ma","Ti","Ke","To","Pe","La","Su"];
const YEARS = Array.from({ length: 15 }, (_, i) => 2026 + i);
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fiDate = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("fi-FI", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const roundLabel = (n: number | null | undefined) => n == null ? null : n === 0 ? "Talvitestit" : `R${n}`;

function CalendarPage() {
  const listFn = useServerFn(listCalendarSessions), racesFn = useServerFn(listRaces), addFn = useServerFn(addCalendarSession), delFn = useServerFn(deleteCalendarSession);
  const qc = useQueryClient(), admin = useAdmin();
  const q = useQuery({ queryKey: ["calendar-sessions"], queryFn: () => listFn() });
  const racesQ = useQuery({ queryKey: ["races"], queryFn: () => racesFn(), enabled: admin.isAdmin });
  const now = new Date();
  const [year, setYear] = useState(Math.min(2040, Math.max(2026, now.getFullYear())));
  const [month, setMonth] = useState(now.getFullYear() < 2026 ? 0 : now.getMonth());
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [raceId, setRaceId] = useState(""), [type, setType] = useState<SessionType>("R"), [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const byDay = useMemo(() => { const m = new Map<string, CalendarSession[]>(); for (const s of q.data ?? []) { const a = m.get(s.session_date) ?? []; a.push(s); m.set(s.session_date, a); } return m; }, [q.data]);
  const first = new Date(year, month, 1), offset = (first.getDay() + 6) % 7, daysIn = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const races = ((racesQ.data ?? []) as any[]).slice().sort((a, b) => a.name.localeCompare(b.name, "fi"));
  const daySessions = openDay ? byDay.get(openDay) ?? [] : [];
  const icsUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/kalenteri/ics` : "/api/public/kalenteri/ics";

  function shift(d: number) { let m = month + d, y = year; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } if (y < 2026 || y > 2040) return; setMonth(m); setYear(y); }
  async function add() {
    if (!openDay || !raceId) { toast.error("Valitse kilpailu"); return; }
    setBusy(true);
    try { await addFn({ data: { race_id: raceId, session_type: type, session_date: openDay } }); await qc.invalidateQueries({ queryKey: ["calendar-sessions"] }); toast.success("Sessio lisätty"); setRaceId(""); }
    catch (e: any) { toast.error(e?.message ?? "Lisäys epäonnistui"); } finally { setBusy(false); }
  }
  async function remove(id: string) { if (!confirm("Poistetaanko sessio?")) return; await delFn({ data: { id } }); await qc.invalidateQueries({ queryKey: ["calendar-sessions"] }); }

  return <div className="mx-auto max-w-5xl px-4 py-8">
    <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Kalenteri</h1>
    <div className="hairline-red mt-3 mb-6" />
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button onClick={() => shift(-1)} aria-label="Edellinen kuukausi" className="px-3 py-2 border border-primary/40 rounded hover:bg-primary/20">‹</button>
      <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-black/70 border border-primary/40 rounded p-2 text-sm font-display uppercase tracking-widest">{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
      <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-black/70 border border-primary/40 rounded p-2 text-sm font-display">{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
      <button onClick={() => shift(1)} aria-label="Seuraava kuukausi" className="px-3 py-2 border border-primary/40 rounded hover:bg-primary/20">›</button>
      <div className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground font-display">T = Testaus · P = Vapaat harjoitukset · T = Testaus · P = Vapaat harjoitukset · SQ = Sprintin aika-ajot · S = Sprintti · Q = Aika-ajot · R = Kilpailu</div>
    </div>
    <div className="grid grid-cols-7 gap-1">
      {DAYS.map(d => <div key={d} className="text-center text-[10px] font-display uppercase tracking-widest text-muted-foreground py-1">{d}</div>)}
      {cells.map((d, i) => {
        if (d == null) return <div key={i} />;
        const key = iso(year, month, d), list = byDay.get(key) ?? [], top = list[0];
        const clickable = list.length > 0 || admin.isAdmin;
        return <button key={i} disabled={!clickable} onClick={() => setOpenDay(key)} className={`relative aspect-square card-dark p-1 flex flex-col items-center justify-center transition ${clickable ? "hover:border-primary" : "cursor-default"} ${key === today ? "border-primary" : ""}`}>
          <span className={`absolute top-1 left-1.5 text-[10px] font-display ${key === today ? "text-primary" : "text-muted-foreground"}`}>{d}</span>
          {top?.race && <span className="relative flex flex-col items-center"><span className="text-2xl md:text-3xl leading-none">{top.race.flag}</span><span className="mt-0.5 font-display text-[10px] md:text-xs px-1 rounded bg-primary text-primary-foreground leading-tight">{top.session_type}</span></span>}
          {list.length > 1 && <span className="absolute top-1 right-1 min-w-[20px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-display flex items-center justify-center">+{list.length}</span>}
        </button>;
      })}
    </div>

    <div className="card-dark p-4 mt-6">
      <h2 className="font-display uppercase tracking-widest text-sm text-primary mb-2">Synkronoi omaan kalenteriin</h2>
      <p className="text-sm text-muted-foreground mb-3">Tilaa kalenteri Google Kalenteriin: avaa Google Kalenteri → Muut kalenterit → <b>+</b> → <b>URL-osoitteesta</b> ja liitä alla oleva osoite. Uudet sessiot päivittyvät automaattisesti koko päivän tapahtumina.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input readOnly value={icsUrl} onFocus={e => e.currentTarget.select()} className="flex-1 bg-black/70 border border-primary/40 rounded p-2 text-xs" />
        <button onClick={async () => { await navigator.clipboard.writeText(icsUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="rounded border border-primary/60 text-primary text-xs font-display uppercase tracking-widest px-3 py-2 hover:bg-primary/20">{copied ? "Kopioitu ✓" : "Kopioi osoite"}</button>
        <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl.replace(/^https?:/, "webcal:"))}`} target="_blank" rel="noreferrer" className="rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-3 py-2 text-center">Lisää Google Kalenteriin</a>
      </div>
    </div>

    {openDay && <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" onClick={() => setOpenDay(null)}>
      <div className="absolute inset-0 bg-black/80" />
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-md card-dark p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-3"><h3 className="font-display uppercase tracking-widest text-primary text-sm">{fiDate(openDay)}</h3><button aria-label="Sulje" onClick={() => setOpenDay(null)} className="text-2xl leading-none text-muted-foreground hover:text-primary">×</button></div>
        <div className="space-y-3">
          {daySessions.length === 0 && <p className="text-sm text-muted-foreground italic">Ei sessioita tänä päivänä.</p>}
          {daySessions.map(s => <div key={s.id} className="border border-primary/30 rounded p-3">
            <div className="flex items-center gap-3"><span className="text-3xl">{s.race?.flag}</span><div className="min-w-0"><div className="font-display uppercase tracking-widest text-sm">{SESSION_TYPES[s.session_type]}</div><div className="text-xs text-muted-foreground truncate">{s.race?.name}</div></div><span className="ml-auto font-display text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{s.session_type}</span></div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-3"><dt className="text-muted-foreground">Kilpailu</dt><dd>{s.race?.name}</dd><dt className="text-muted-foreground">Kierros</dt><dd>{roundLabel(s.race?.round_number) ?? "—"}</dd><dt className="text-muted-foreground">Sessio</dt><dd>{SESSION_TYPES[s.session_type]} ({s.session_type})</dd><dt className="text-muted-foreground">Päivä</dt><dd>{new Date(s.session_date + "T12:00:00").toLocaleDateString("fi-FI")}</dd></dl>
            <div className="flex items-center gap-2 mt-3">{s.race && <Link to="/kilpailut/$slug" params={{ slug: s.race.slug }} className="flex-1 text-center rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-3 py-2">Katso kilpailut-sivulla</Link>}{admin.isAdmin && <button onClick={() => remove(s.id)} className="text-xs text-primary underline">Poista</button>}</div>
          </div>)}
        </div>
        {admin.isAdmin && <div className="mt-4 pt-4 border-t border-primary/30 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Admin: lisää sessio</div>
          <select value={raceId} onChange={e => setRaceId(e.target.value)} className="w-full bg-black/70 border border-primary/40 rounded p-2 text-sm"><option value="">— Valitse kilpailu —</option>{races.map(r => <option key={r.id} value={r.id}>{r.flag} {r.round_number != null ? `${roundLabel(r.round_number)} — ` : ""}{r.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">{(Object.keys(SESSION_TYPES) as SessionType[]).map(t => <button key={t} onClick={() => setType(t)} className={`text-xs font-display uppercase tracking-widest rounded border px-2 py-2 ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-primary/40"}`}>{SESSION_TYPES[t]}</button>)}</div>
          <button disabled={busy} onClick={add} className="w-full rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2 disabled:opacity-60">{busy ? "Tallennetaan…" : "Lisää tapahtuma"}</button>
        </div>}
      </div>
    </div>}
  </div>;
}
