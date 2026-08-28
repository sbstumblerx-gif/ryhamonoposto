import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listRaces, upsertRace, deleteRace } from "@/lib/content.functions";
import { seasonYearFromName, countryFromRaceName } from "@/lib/stats-compute";
import { useAdmin } from "@/components/admin-store";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/kilpailut")({
  head: () => ({ meta: [{ title: "Kilpailut — RyhäMonoposto" }, { name: "description", content: "Kaikki RyhäMonoposto-kilpailut uusiusjärjestyksessä." }] }),
  component: RacesLayout,
});

function RacesLayout() {
  return <Outlet />;
}

type RaceListItem = {
  id: string;
  slug: string;
  name: string;
  flag: string;
  race_date: string | null;
  round_number: number | null;
  created_at: string;
  qualifying_content: string | null;
  race_content: string | null;
};

function hasContent(v: string | null | undefined): boolean {
  return !!v && v.trim().length > 0;
}

// Sort upcoming races by soonest first (smallest round_number leads)
function compareUpcoming(a: RaceListItem, b: RaceListItem): number {
  const ra = a.round_number ?? Infinity;
  const rb = b.round_number ?? Infinity;
  if (ra !== rb) return ra - rb;
  const da = a.race_date ? new Date(a.race_date).getTime() : Infinity;
  const db = b.race_date ? new Date(b.race_date).getTime() : Infinity;
  if (da !== db) return da - db;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

// Sort past races by newest first (largest round_number leads)
function comparePast(a: RaceListItem, b: RaceListItem): number {
  const ra = a.round_number ?? -Infinity;
  const rb = b.round_number ?? -Infinity;
  if (ra !== rb) return rb - ra;
  const da = a.race_date ? new Date(a.race_date).getTime() : -Infinity;
  const db = b.race_date ? new Date(b.race_date).getTime() : -Infinity;
  if (da !== db) return db - da;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function LiveStatusLabel({ race }: { race: RaceListItem }) {
  const qualifyingDone = hasContent(race.qualifying_content);
  const raceDone = hasContent(race.race_content);
  if (!qualifyingDone) return <>Aika-ajot tulossa</>;
  if (!raceDone) return <>Aika-ajot suoritettu<br />Kilpailu tulossa</>;
  return <>Tulokset</>;
}

function LiveBanner({
  race, allRaces, isAdmin, onChange, liveStatus,
}: {
  race: RaceListItem | undefined;
  liveStatus: string | null;
  allRaces: RaceListItem[];
  isAdmin: boolean;
  onChange: (value: string | null) => void;
}) {
  const currentYear = new Date().getFullYear().toString();

  if (!race && !isAdmin && liveStatus !== "kesätauko" && liveStatus !== "talvitauko") return null;

  return (
    <div className="card-dark p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="font-display text-[10px] uppercase tracking-widest text-primary">Käynnissä</span>
      </div>

      {race ? (
        <Link to="/kilpailut/$slug" params={{ slug: race.slug }} className="flex items-center gap-3 hover:opacity-80 transition">
          <span className="text-2xl">{race.flag}</span>
          {race.round_number != null && (
            <span className="font-display text-[10px] px-1.5 py-0.5 rounded border border-primary/60 text-primary">R{race.round_number}</span>
          )}
          <span className="font-display uppercase tracking-widest">{race.name}</span>
          <span className="ml-auto font-display uppercase tracking-widest text-sm text-primary text-right leading-tight">
            <LiveStatusLabel race={race} />
          </span>
        </Link>
      ) : liveStatus === "kesätauko" ? (
        <Link to="/tilastot/$season" params={{ season: currentYear }} className="flex items-center gap-3 hover:opacity-80 transition">
          <span className="text-2xl">☀️</span>
          <span className="font-display uppercase tracking-widest">Kesätauko</span>
          <span className="ml-auto font-display uppercase tracking-widest text-sm text-primary text-right">→ Tilastot</span>
        </Link>
      ) : liveStatus === "talvitauko" ? (
        <Link to="/tilastot/$season" params={{ season: currentYear }} className="flex items-center gap-3 hover:opacity-80 transition">
          <span className="text-2xl">❄️</span>
          <span className="font-display uppercase tracking-widest">Talvitauko</span>
          <span className="ml-auto font-display uppercase tracking-widest text-sm text-primary text-right">→ Tilastot</span>
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground italic">Ei valittua kilpailua.</p>
      )}

      {isAdmin && (
        <div className="mt-3 pt-3 border-t border-primary/20">
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground font-display mb-1">
            Admin: valitse käynnissä oleva kilpailu tai tauko
          </label>
          <select
            value={liveStatus ?? ""}
            onChange={e => onChange(e.target.value || null)}
            className="w-full bg-black/70 border border-primary/40 rounded p-2 text-sm disabled:opacity-60"
          >
            <option value="">— Ei käynnissä —</option>
            <option value="kesätauko">☀️ Kesätauko</option>
            <option value="talvitauko">❄️ Talvitauko</option>
            <optgroup label="Kilpailut">
              {allRaces.map(r => (
                <option key={r.id} value={r.id}>
                  {r.round_number != null ? `R${r.round_number} — ` : ""}{r.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}
    </div>
  );
}

export function RacesIndex() {
  const list = useServerFn(listRaces);
  const create = useServerFn(upsertRace);
  const del = useServerFn(deleteRace);
  const qc = useQueryClient();
  const admin = useAdmin();
  const q = useQuery({ queryKey: ["races"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [flag, setFlag] = useState("");
  const [round, setRound] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [view, setView] = useState<"past" | "upcoming">("past");
  
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLiveStatus(localStorage.getItem("live-status"));
    }
  }, []);

  const races = q.data ?? [];
  const liveRace = races.find(r => r.id === liveStatus);

  const pastRaces = races.filter(r => hasContent(r.race_content)).sort(comparePast);
  const upcomingRaces = races.filter(r => !hasContent(r.race_content)).sort(compareUpcoming);
  const pickerRaces = [...races].sort((a, b) => {
    const aHasRaceContent = hasContent(a.race_content);
    const bHasRaceContent = hasContent(b.race_content);
    
    if (!aHasRaceContent && bHasRaceContent) return -1;
    if (aHasRaceContent && !bHasRaceContent) return 1;
    
    if (!aHasRaceContent && !bHasRaceContent) return compareUpcoming(a, b);
    return comparePast(a, b);
  });

  const seasonOptions = [...new Set(races.map(r => seasonYearFromName(r.name)).filter((y): y is number => y != null))].sort((a, b) => b - a);
  const countryOptions = [...new Set(races.map(r => countryFromRaceName(r.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const base = view === "past" ? pastRaces : upcomingRaces;
  const filtered = base.filter(r =>
    (seasonFilter === "all" || String(seasonYearFromName(r.name)) === seasonFilter)
    && (countryFilter === "all" || countryFromRaceName(r.name) === countryFilter));

  async function add() {
    if (!name.trim()) return;
    try {
      const r = round.trim() ? Math.min(50, Math.max(1, Number(round))) : null;
      await create({ data: { name, flag, round_number: r, qualifying_content: "", race_content: "" } });
      setName(""); setFlag(""); setRound("");
      await qc.invalidateQueries({ queryKey: ["races"] });
      toast.success("Kilpailu lisätty");
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Poistetaanko kilpailu?")) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["races"] });
  }

  function changeLive(value: string | null) {
    if (typeof window !== "undefined") {
      if (value) {
        localStorage.setItem("live-status", value);
      } else {
        localStorage.removeItem("live-status");
      }
    }
    setLiveStatus(value);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Kilpailut</h1>
      <div className="hairline-red mt-3 mb-6" />

      <LiveBanner race={liveRace} liveStatus={liveStatus} allRaces={pickerRaces} isAdmin={admin.isAdmin} onChange={changeLive} />

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-6 flex flex-col md:flex-row gap-2">
          <input placeholder="Kilpailun nimi (esim. Kiina 2025)" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input placeholder="🇨🇳" value={flag} onChange={e => setFlag(e.target.value)}
            className="w-24 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input type="number" min={1} max={50} placeholder="R#" value={round} onChange={e => setRound(e.target.value)}
            className="w-20 bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <button onClick={add} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
            Lisää
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["past", "upcoming"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded border ${view === v ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 hover:border-primary/60"}`}
          >
            {v === "past" ? "Menneet" : "Tulevat"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)}
          className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
          <option value="all">Kaikki kaudet</option>
          {seasonOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
          className="bg-black/70 border border-primary/40 rounded p-2 text-sm">
          <option value="all">Kaikki radat / maat</option>
          {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <ul className="space-y-2">
        {filtered.map(r => (
          <li key={r.id} className="card-dark p-4 flex items-center justify-between hover:border-primary transition">
            <Link to="/kilpailut/$slug" params={{ slug: r.slug }} className="flex-1 flex items-center gap-3">
              <span className="text-2xl">{r.flag}</span>
              {r.round_number != null && (
                <span className="font-display text-[10px] px-1.5 py-0.5 rounded border border-primary/60 text-primary">R{r.round_number}</span>
              )}
              <span className="font-display uppercase tracking-widest">{r.name}</span>
              {r.race_date && <span className="text-xs text-muted-foreground ml-auto mr-3">{new Date(r.race_date).toLocaleDateString("fi-FI")}</span>}
            </Link>
            {admin.isAdmin && (
              <button onClick={() => remove(r.id)} className="text-xs text-primary underline ml-3">Poista</button>
            )}
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-muted-foreground italic">
            {view === "past" ? "Ei menneitä kilpailuja." : "Ei tulevia kilpailuja."}
          </li>
        )}
      </ul>
    </div>
  );
}
