import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listSessions,
  listMyPredictions,
  submitPrediction,
  myTotalPoints,
  myRank,
  leaderboard,
  adminCreateSession,
  adminDeleteSession,
  adminFinalizeSession,
  adminReopenSession,
  adminSetSessionStatus,
} from "@/lib/predictions.functions";
import { listDrivers } from "@/lib/content.functions";
import { useAdmin } from "@/components/admin-store";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/veikkaa")({
  head: () => ({
    meta: [
      { title: "Veikkaa — RyhäMonoposto" },
      { name: "description", content: "Veikkaa sessioiden kolme kärjessä ja kilpaile pisteistä." },
      { property: "og:title", content: "Veikkaa — RyhäMonoposto" },
      { property: "og:description", content: "Veikkaa sessioiden kolme kärjessä ja kilpaile pisteistä." },
    ],
  }),
  component: VeikkaaPage,
});

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

function VeikkaaPage() {
  const uid = useUser();
  const admin = useAdmin();
  const qc = useQueryClient();
  const sessionsFn = useServerFn(listSessions);
  const driversFn = useServerFn(listDrivers);
  const myPredsFn = useServerFn(listMyPredictions);
  const submitFn = useServerFn(submitPrediction);
  const totalFn = useServerFn(myTotalPoints);
  const rankFn = useServerFn(myRank);
  const lbFn = useServerFn(leaderboard);
  const createFn = useServerFn(adminCreateSession);
  const delFn = useServerFn(adminDeleteSession);
  const finalizeFn = useServerFn(adminFinalizeSession);
  const reopenFn = useServerFn(adminReopenSession);
  const statusFn = useServerFn(adminSetSessionStatus);

  const [scope, setScope] = useState<"all" | "year">("year");

  const sessionsQ = useQuery({ queryKey: ["p-sessions"], queryFn: () => sessionsFn() });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: () => driversFn() });
  const myPredsQ = useQuery({ queryKey: ["my-preds", uid], queryFn: () => myPredsFn(), enabled: !!uid });
  const totalQ = useQuery({ queryKey: ["my-total", uid, scope], queryFn: () => totalFn({ data: { scope } }), enabled: !!uid });
  const rankQ = useQuery({ queryKey: ["my-rank", uid, scope], queryFn: () => rankFn({ data: { scope } }), enabled: !!uid });
  const lbQ = useQuery({ queryKey: ["p-leaderboard", scope], queryFn: () => lbFn({ data: { scope } }) });

  const [showAll, setShowAll] = useState(false);
  const [newName, setNewName] = useState("");

  const drivers = driversQ.data ?? [];
  const driverName = useMemo(() => new Map(drivers.map(d => [d.slug, d.name] as const)), [drivers]);
  const myPredMap = useMemo(() => {
    const m = new Map<string, { top3: string[]; points: number }>();
    for (const p of myPredsQ.data ?? []) m.set(p.session_id, { top3: (p.top3 as any) ?? [], points: p.points });
    return m;
  }, [myPredsQ.data]);

  async function signIn() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/veikkaa" });
  }

  async function addSession() {
    if (!newName.trim()) return;
    await createFn({ data: { name: newName.trim() } });
    setNewName("");
    await qc.invalidateQueries({ queryKey: ["p-sessions"] });
  }

  const sessions = sessionsQ.data ?? [];
  const upcoming = sessions.filter(s => s.status === "upcoming");
  const closed = sessions.filter(s => s.status === "closed");
  const past = sessions.filter(s => s.status === "past");
  const lb = lbQ.data ?? [];
  const shown = showAll ? lb : lb.slice(0, 10);
  const myRankVal = rankQ.data?.rank ?? null;
  const inTop10 = myRankVal != null && myRankVal <= 10;

  async function invalidateAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["p-sessions"] }),
      qc.invalidateQueries({ queryKey: ["p-leaderboard"] }),
      qc.invalidateQueries({ queryKey: ["my-preds", uid] }),
      qc.invalidateQueries({ queryKey: ["my-total", uid] }),
      qc.invalidateQueries({ queryKey: ["my-rank", uid] }),
    ]);
  }


  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Veikkaa</h1>
          <div className="hairline-red mt-3" />
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Veikkaa jokaisen session kolme kärjessä. Oikeasta paikasta 3 p, väärästä paikasta mutta kolmen kärjessä 1 p.
          </p>
        </div>
        <div className="card-dark p-4 text-right min-w-[200px]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Omat pisteet</div>
          <div className="font-display text-3xl text-primary">{uid ? (totalQ.data ?? 0) : "—"}</div>
          {uid && myRankVal && <div className="text-xs text-muted-foreground">Sija #{myRankVal}</div>}
          {!uid && <button onClick={signIn} className="mt-2 text-xs bg-primary text-primary-foreground rounded px-3 py-1 font-display uppercase tracking-widest">Kirjaudu</button>}
        </div>
      </header>

      {admin.isAdmin && (
        <section className="card-dark p-3 flex gap-2 flex-wrap items-center">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Session nimi, esim. Australia 2026 – Aika-ajot"
            className="flex-1 min-w-[240px] bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <button onClick={addSession} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
            + Lisää sessio
          </button>
        </section>
      )}

      <section>
        <h2 className="font-display uppercase tracking-widest text-sm text-muted-foreground mb-3">Tulevat sessiot</h2>
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground italic">Ei tulevia sessioita.</p>}
        <div className="space-y-3">
          {upcoming.map(s => (
            <UpcomingCard
              key={s.id}
              session={s}
              drivers={drivers}
              existing={myPredMap.get(s.id)?.top3 ?? null}
              signedIn={!!uid}
              admin={admin.isAdmin}
              locked={false}
              onSubmit={async (top3) => {
                await submitFn({ data: { session_id: s.id, top3: top3 as [string, string, string] } });
                await qc.invalidateQueries({ queryKey: ["my-preds", uid] });
                toast.success("Veikkaus tallennettu");
              }}
              onSignIn={signIn}
              onToggleLock={async () => {
                await statusFn({ data: { id: s.id, status: "closed" } });
                await qc.invalidateQueries({ queryKey: ["p-sessions"] });
                toast.success("Veikkaus suljettu");
              }}
              onFinalize={async (top3) => {
                await finalizeFn({ data: { id: s.id, top3 } });
                await invalidateAll();
                toast.success("Sessio päätetty");
              }}
              onDelete={async () => {
                if (!confirm("Poistetaanko sessio?")) return;
                await delFn({ data: { id: s.id } });
                await qc.invalidateQueries({ queryKey: ["p-sessions"] });
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display uppercase tracking-widest text-sm text-muted-foreground mb-3">Suljetut veikkaukset</h2>
        {closed.length === 0 && <p className="text-sm text-muted-foreground italic">Ei suljettuja veikkauksia.</p>}
        <div className="space-y-3">
          {closed.map(s => (
            <UpcomingCard
              key={s.id}
              session={s}
              drivers={drivers}
              existing={myPredMap.get(s.id)?.top3 ?? null}
              signedIn={!!uid}
              admin={admin.isAdmin}
              locked
              onSubmit={async () => {}}
              onSignIn={signIn}
              onToggleLock={async () => {
                await statusFn({ data: { id: s.id, status: "upcoming" } });
                await qc.invalidateQueries({ queryKey: ["p-sessions"] });
                toast.success("Veikkaus avattu uudelleen");
              }}
              onFinalize={async (top3) => {
                await finalizeFn({ data: { id: s.id, top3 } });
                await invalidateAll();
                toast.success("Sessio päätetty");
              }}
              onDelete={async () => {
                if (!confirm("Poistetaanko sessio?")) return;
                await delFn({ data: { id: s.id } });
                await qc.invalidateQueries({ queryKey: ["p-sessions"] });
              }}
            />
          ))}
        </div>
      </section>


      <section>
        <h2 className="font-display uppercase tracking-widest text-sm text-muted-foreground mb-3">Menneet sessiot</h2>
        {past.length === 0 && <p className="text-sm text-muted-foreground italic">Ei menneitä sessioita.</p>}
        <div className="space-y-3">
          {past.map(s => {
            const truth = (s.result_top3 as string[] | null) ?? [];
            const mine = myPredMap.get(s.id);
            return (
              <div key={s.id} className="card-dark p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h3 className="font-display uppercase tracking-widest text-primary">{s.name}</h3>
                  {admin.isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        await reopenFn({ data: { id: s.id } });
                        await qc.invalidateQueries({ queryKey: ["p-sessions"] });
                      }} className="text-xs border border-primary/50 rounded px-2 py-1">Palauta tulevaksi</button>
                      <button onClick={async () => {
                        if (!confirm("Poistetaanko sessio?")) return;
                        await delFn({ data: { id: s.id } });
                        await qc.invalidateQueries({ queryKey: ["p-sessions"] });
                      }} className="text-xs border border-primary/50 rounded px-2 py-1">Poista</button>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display mb-1">Oikea tulos</div>
                    <PodiumList slugs={truth} driverName={driverName} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display mb-1">Sinun veikkauksesi</div>
                    {mine ? <PodiumList slugs={mine.top3} driverName={driverName} truth={truth} /> : <div className="italic text-muted-foreground">Et veikannut.</div>}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display mb-1">Saamasi pisteet</div>
                    <div className="font-display text-3xl text-primary">{mine?.points ?? 0}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display uppercase tracking-widest text-sm text-muted-foreground mb-3">Leaderboard</h2>
        <div className="card-dark divide-y divide-primary/20">
          {shown.map(row => (
            <LeaderRow key={row.user_id} row={row} me={row.user_id === uid} />
          ))}
          {!inTop10 && uid && myRankVal && (
            <LeaderRow row={{ rank: myRankVal, user_id: uid, points: rankQ.data?.points ?? 0, display_name: "Sinä", avatar_url: null }} me />
          )}
        </div>
        {lb.length > 10 && (
          <button onClick={() => setShowAll(v => !v)} className="mt-3 text-xs border border-primary/40 rounded px-3 py-1 font-display uppercase tracking-widest">
            {showAll ? "Näytä vähemmän" : "Näytä lisää"}
          </button>
        )}
      </section>

      <div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Etusivulle</Link>
      </div>
    </div>
  );
}

function LeaderRow({ row, me }: { row: { rank: number; user_id: string; points: number; display_name: string; avatar_url: string | null }; me?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2 ${me ? "bg-primary/15" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="font-display text-primary w-8">#{row.rank}</span>
        <span className="font-display uppercase tracking-widest text-sm">{row.display_name}</span>
      </div>
      <span className="font-display">{row.points} p</span>
    </div>
  );
}

function PodiumList({ slugs, driverName, truth }: { slugs: string[]; driverName: Map<string, string>; truth?: string[] }) {
  return (
    <ol className="space-y-1">
      {[0, 1, 2].map(i => {
        const s = slugs[i];
        const name = s ? (driverName.get(s) ?? s) : "—";
        const exact = truth && truth[i] === s;
        const inTop = truth && s && truth.includes(s);
        const cls = !truth ? "" : exact ? "text-primary" : inTop ? "text-yellow-400" : "text-muted-foreground line-through";
        return <li key={i} className={`font-display ${cls}`}>{i + 1}. {name}</li>;
      })}
    </ol>
  );
}

function UpcomingCard({
  session, drivers, existing, signedIn, admin, locked, onSubmit, onSignIn, onFinalize, onDelete, onToggleLock,
}: {
  session: any; drivers: any[]; existing: string[] | null; signedIn: boolean; admin: boolean; locked: boolean;
  onSubmit: (top3: string[]) => Promise<void>; onSignIn: () => void;
  onFinalize: (top3: [string, string, string]) => Promise<void>; onDelete: () => void;
  onToggleLock: () => Promise<void>;
}) {
  const [t, setT] = useState<string[]>(existing ?? ["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [truth, setTruth] = useState<string[]>(["", "", ""]);

  useEffect(() => { if (existing) setT(existing); }, [existing]);

  async function submit() {
    if (t.some(x => !x)) { toast.error("Valitse kolme kuljettajaa"); return; }
    if (new Set(t).size !== 3) { toast.error("Kuljettajat eivät voi toistua"); return; }
    setBusy(true);
    try { await onSubmit(t); } finally { setBusy(false); }
  }

  async function finalize() {
    if (truth.some(x => !x)) { toast.error("Valitse kolme kärjessä"); return; }
    if (new Set(truth).size !== 3) { toast.error("Kuljettajat eivät voi toistua"); return; }
    setBusy(true);
    try { await onFinalize(truth as [string, string, string]); } finally { setBusy(false); }
  }

  return (
    <div className="card-dark p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="font-display uppercase tracking-widest text-primary">
          {session.name}
          {locked && <span className="ml-2 text-[10px] border border-primary/50 rounded px-2 py-0.5 text-muted-foreground">Veikkaus suljettu</span>}
        </h3>
        {admin && (
          <div className="flex gap-2">
            <button onClick={() => void onToggleLock()} className="text-xs border border-primary/50 rounded px-2 py-1">
              {locked ? "Avaa veikkaus" : "Sulje veikkaus"}
            </button>
            <button onClick={onDelete} className="text-xs border border-primary/50 rounded px-2 py-1">Poista</button>
          </div>
        )}
      </div>
      <div className="mt-3 grid md:grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <label key={i} className="text-sm">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Sija {i + 1}</span>
            <select value={t[i]} onChange={e => { const next = [...t]; next[i] = e.target.value; setT(next); }}
              disabled={!signedIn || locked}
              className="w-full mt-1 bg-black/70 border border-primary/30 rounded p-2 font-display disabled:opacity-60">
              <option value="">—</option>
              {drivers.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2 flex-wrap items-center">
        {locked ? (
          <span className="text-xs text-muted-foreground">Veikkaus on suljettu — muutokset eivät ole enää mahdollisia.</span>
        ) : signedIn ? (
          <button disabled={busy} onClick={submit} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2 disabled:opacity-50">
            {existing ? "Päivitä veikkaus" : "Veikkaa tulosta"}
          </button>
        ) : (
          <button onClick={onSignIn} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">Kirjaudu veikataksesi</button>
        )}
        {existing && !locked && <span className="text-xs text-muted-foreground">Veikkauksesi tallennettu</span>}
      </div>


      {admin && (
        <div className="mt-4 pt-4 border-t border-primary/20">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display mb-2">Admin: aseta lopputulos ja päätä sessio</div>
          <div className="grid md:grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <select key={i} value={truth[i]} onChange={e => { const n = [...truth]; n[i] = e.target.value; setTruth(n); }}
                className="w-full bg-black/70 border border-primary/30 rounded p-2 font-display text-sm">
                <option value="">Sija {i + 1}</option>
                {drivers.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
              </select>
            ))}
          </div>
          <button disabled={busy} onClick={finalize} className="mt-2 text-xs border border-primary/60 rounded px-3 py-1 font-display uppercase tracking-widest hover:bg-primary/20">
            Päätä sessio ja laske pisteet
          </button>
        </div>
      )}
    </div>
  );
}
