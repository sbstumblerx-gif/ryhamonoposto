import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listPolls,
  myPollVotes,
  pollResults,
  votePoll,
  createPoll,
  deletePoll,
  type PollFeedItem,
} from "@/lib/polls.functions";
import { useAdmin } from "@/components/admin-store";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/aanestykset")({
  head: () => ({
    meta: [
      { title: "Äänestykset — RyhäMonoposto" },
      { name: "description", content: "Luo äänestyksiä ja äänestä sarjan kuumimmista kysymyksistä RyhäMonoposton julkisessa feedissä." },
      { property: "og:title", content: "Äänestykset — RyhäMonoposto" },
      { property: "og:description", content: "Luo äänestyksiä ja äänestä sarjan kuumimmista kysymyksistä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PollsPage,
});

function useUid() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

function PollsPage() {
  const uid = useUid();
  const admin = useAdmin();
  const qc = useQueryClient();
  const pollsFn = useServerFn(listPolls);
  const myVotesFn = useServerFn(myPollVotes);
  const createFn = useServerFn(createPoll);

  const pollsQ = useQuery({ queryKey: ["polls"], queryFn: () => pollsFn() });
  const myVotesQ = useQuery({ queryKey: ["poll-votes", uid], queryFn: () => myVotesFn(), enabled: !!uid });

  const myVote = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of myVotesQ.data ?? []) m.set(v.poll_id, v.option_id);
    return m;
  }, [myVotesQ.data]);

  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/aanestykset" });
  }

  async function submitPoll() {
    const opts = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim()) { toast.error("Kirjoita kysymys"); return; }
    if (opts.length < 1) { toast.error("Lisää vähintään yksi vaihtoehto"); return; }
    setBusy(true);
    try {
      await createFn({ data: { question: question.trim(), options: opts, closes_at: closesAt ? new Date(closesAt).toISOString() : null } });
      setQuestion(""); setOptions(["", ""]); setClosesAt(""); setOpen(false);
      await qc.invalidateQueries({ queryKey: ["polls"] });
      toast.success("Äänestys julkaistu");
    } catch (e: any) {
      toast.error(e?.message ?? "Julkaisu epäonnistui");
    } finally { setBusy(false); }
  }

  const polls = pollsQ.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header>
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Äänestykset</h1>
        <div className="hairline-red mt-3" />
        <p className="text-sm text-muted-foreground mt-2">
          Äänestä ja näe tulokset heti oman äänesi jälkeen. Ylläpidon tekemistä kyselyistä palkitaan yhden kortin pakalla.
        </p>
      </header>

      {uid ? (
        <section className="card-dark p-4">
          {!open ? (
            <button onClick={() => setOpen(true)} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
              + Uusi äänestys
            </button>
          ) : (
            <div className="space-y-3">
              {admin.isAdmin && (
                <div className="text-[10px] font-display uppercase tracking-widest text-primary border border-primary/60 rounded px-2 py-1 inline-block">
                  Ylläpitäjien tekemä — Palkittu kysely
                </div>
              )}
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Kysymys"
                className="w-full bg-black/70 border border-primary/40 rounded p-2 text-sm" />
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={o} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                      placeholder={`Vaihtoehto ${i + 1}`}
                      className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-sm" />
                    {options.length > 1 && (
                      <button onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        className="text-xs border border-primary/40 rounded px-2">×</button>
                    )}
                  </div>
                ))}
                {options.length < 20 && (
                  <button onClick={() => setOptions([...options, ""])}
                    className="text-xs font-display uppercase tracking-widest border border-primary/50 rounded px-3 py-1 hover:bg-primary/20">
                    + Vaihtoehto ({options.length}/20)
                  </button>
                )}
              </div>
              <label className="block text-xs text-muted-foreground">
                Sulkeutuu (valinnainen)
                <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)}
                  className="block mt-1 bg-black/70 border border-primary/30 rounded p-2 text-sm" />
              </label>
              <div className="flex gap-2">
                <button disabled={busy} onClick={submitPoll} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2 disabled:opacity-50">
                  Julkaise
                </button>
                <button onClick={() => setOpen(false)} className="text-xs border border-primary/40 rounded px-3">Peruuta</button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="card-dark p-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Kirjaudu äänestääksesi ja luodaksesi äänestyksiä.</span>
          <button onClick={signIn} className="rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-4 py-2">Kirjaudu</button>
        </section>
      )}

      <div className="space-y-4">
        {polls.length === 0 && <p className="text-sm text-muted-foreground italic">Ei vielä äänestyksiä.</p>}
        {polls.map(p => (
          <PollCard key={p.id} poll={p} uid={uid} myOptionId={myVote.get(p.id) ?? null} canDelete={admin.isAdmin || (!!uid && p.created_by === uid)} onSignIn={signIn} />
        ))}
      </div>

      <div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Etusivulle</Link>
      </div>
    </div>
  );
}

function PollCard({ poll, uid, myOptionId, canDelete, onSignIn }: {
  poll: PollFeedItem; uid: string | null; myOptionId: string | null; canDelete: boolean; onSignIn: () => void;
}) {
  const qc = useQueryClient();
  const voteFn = useServerFn(votePoll);
  const resultsFn = useServerFn(pollResults);
  const delFn = useServerFn(deletePoll);
  const [busy, setBusy] = useState(false);

  const showResults = !!uid && (!!myOptionId || poll.closed);
  const resQ = useQuery({
    queryKey: ["poll-results", poll.id, myOptionId, poll.closed],
    queryFn: () => resultsFn({ data: { poll_id: poll.id } }),
    enabled: showResults,
  });
  const counts = resQ.data?.counts ?? {};
  const total = resQ.data?.total ?? poll.total_votes;

  async function vote(optionId: string) {
    if (!uid) { onSignIn(); return; }
    setBusy(true);
    try {
      const r = await voteFn({ data: { poll_id: poll.id, option_id: optionId } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["poll-votes", uid] }),
        qc.invalidateQueries({ queryKey: ["polls"] }),
      ]);
      toast.success(r.rewarded ? "Ääni tallennettu — sait 1 kortin pakan!" : "Ääni tallennettu");
    } catch (e: any) {
      toast.error(e?.message ?? "Äänestys epäonnistui");
    } finally { setBusy(false); }
  }

  return (
    <article className="card-dark p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {poll.is_admin && (
            <div className="text-[10px] font-display uppercase tracking-widest text-primary border border-primary/60 rounded px-2 py-0.5 inline-block mb-2">
              Ylläpitäjien tekemä — Palkittu kysely
            </div>
          )}
          <h2 className="font-display uppercase tracking-widest text-primary">{poll.question}</h2>
          <div className="text-[11px] text-muted-foreground mt-1">
            {poll.author_name} · {total} ääntä
            {poll.closes_at && ` · ${poll.closed ? "Sulkeutunut" : `Sulkeutuu ${new Date(poll.closes_at).toLocaleString("fi-FI")}`}`}
          </div>
        </div>
        {canDelete && (
          <button onClick={async () => {
            if (!confirm("Poistetaanko äänestys?")) return;
            await delFn({ data: { id: poll.id } });
            await qc.invalidateQueries({ queryKey: ["polls"] });
          }} className="text-xs border border-primary/50 rounded px-2 py-1">Poista</button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {poll.options.map(o => {
          const c = counts[o.id] ?? 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          const mine = myOptionId === o.id;
          return (
            <button
              key={o.id}
              disabled={busy || !!myOptionId || poll.closed}
              onClick={() => vote(o.id)}
              className={`relative w-full text-left border rounded px-3 py-2 overflow-hidden ${mine ? "border-primary" : "border-primary/30"} ${!myOptionId && !poll.closed ? "hover:bg-primary/10" : ""} disabled:cursor-default`}
            >
              {showResults && <span className="absolute inset-y-0 left-0 bg-primary/25" style={{ width: `${pct}%` }} />}
              <span className="relative flex justify-between gap-3 text-sm">
                <span className="font-display">{o.label}{mine ? " ✓" : ""}</span>
                {showResults && <span className="font-display text-primary">{pct} %</span>}
              </span>
            </button>
          );
        })}
      </div>

      {!uid && <p className="text-xs text-muted-foreground mt-2">Kirjaudu nähdäksesi tulokset ja äänestääksesi.</p>}
      {uid && !myOptionId && !poll.closed && <p className="text-xs text-muted-foreground mt-2">Tulokset näkyvät kun olet äänestänyt.</p>}
    </article>
  );
}
