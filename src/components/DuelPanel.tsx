import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { duelOverview, startDuel, resolveDuel } from "@/lib/duel.functions";
import { DUEL_MIN_CARDS, type DuelMode } from "@/lib/duel-shared";

type Draft = { draft_id: string; mode: DuelMode; cards: any[]; boosters: any[] };
type Outcome = {
  result: "P1" | "P2" | "P3";
  rounds: any[];
  booster: any | null;
  bonus: number;
  season_points: number;
  vault_awarded: number;
  mode: DuelMode;
};

const MODES: { key: DuelMode; title: string; desc: string }[] = [
  { key: "2026", title: "2026 Season", desc: "Palkinnolliset ottelut · vain kauden 2026 kortit" },
  { key: "all", title: "All Time", desc: "Palkinnoton harjoitusmuoto · kaikki kortit käyvät" },
];

function CardTile({ card, selected, onClick, badge }: { card: any; selected?: boolean; onClick?: () => void; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded border p-2 transition ${selected ? "border-primary bg-primary/15" : "border-primary/30 hover:border-primary/60"}`}
    >
      <img src={card.image_url} alt={card.serial_number} className="w-full aspect-[3/4] object-cover rounded" />
      <div className="mt-1 text-[10px] font-display uppercase tracking-widest text-muted-foreground truncate">
        {card.serial_number} · {card.card_type}
      </div>
      <div className="text-[11px]">
        {card.is_booster ? <>Boost {card.boost ?? 0}</> : <>ATK {card.attack ?? 0} · DEF {card.defense ?? 0}</>}
      </div>
      {badge && <div className="text-[10px] text-primary">{badge}</div>}
    </button>
  );
}

export function DuelPanel({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const overviewFn = useServerFn(duelOverview);
  const startFn = useServerFn(startDuel);
  const resolveFn = useServerFn(resolveDuel);

  const overviewQ = useQuery({ queryKey: ["duel-overview", uid], queryFn: () => overviewFn() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [booster, setBooster] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reveal, setReveal] = useState(0);
  const [busy, setBusy] = useState(false);

  const ov: any = overviewQ.data;

  async function begin(mode: DuelMode) {
    setBusy(true);
    try {
      const d: any = await startFn({ data: { mode } });
      setDraft(d);
      setPicks([]);
      setBooster(null);
      setOutcome(null);
      setReveal(0);
    } catch (e: any) {
      toast.error(e?.message ?? "Ottelun aloitus epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  function togglePick(id: string) {
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? p : [...p, id]));
  }

  async function fight() {
    if (!draft || picks.length !== 2) return;
    setBusy(true);
    try {
      const res: any = await resolveFn({ data: { draft_id: draft.draft_id, card_ids: picks, booster_id: booster } });
      setOutcome(res);
      setReveal(0);
      await qc.invalidateQueries({ queryKey: ["duel-overview", uid] });
      if (res.vault_awarded > 0) {
        await qc.invalidateQueries({ queryKey: ["my-collection", uid] });
        await qc.invalidateQueries({ queryKey: ["collection-badge"] });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Ottelu epäonnistui");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setDraft(null);
    setOutcome(null);
    setPicks([]);
    setBooster(null);
    setReveal(0);
  }

  return (
    <section className="card-dark p-4 space-y-3">
      <h2 className="font-display uppercase tracking-widest text-sm text-primary">Pelaa</h2>
      <p className="text-xs text-muted-foreground max-w-2xl">
        Ottele korteillasi. Tarvitset vähintään {DUEL_MIN_CARDS} kelpaavaa duellikorttia (ei boostereita, hyökkäys- ja
        puolustusarvot). 2026 Season -muodossa pelataan palkinnoista, All Time on palkinnoton harjoitusmuoto.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const s = ov?.modes?.[m.key] ?? { eligible: 0, wins: 0, draws: 0, losses: 0, points: 0 };
          const ok = s.eligible >= DUEL_MIN_CARDS;
          return (
            <div key={m.key} className={`rounded border p-3 ${ok ? "border-primary/60" : "border-primary/20 opacity-70"}`}>
              <div className="font-display uppercase tracking-widest text-sm">{m.title}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{m.desc}</div>
              <div className="text-xs mt-2">
                Kelpaavat kortit:{" "}
                <span className={ok ? "text-primary" : "text-muted-foreground"}>
                  {s.eligible}/{DUEL_MIN_CARDS}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                V {s.wins} · T {s.draws} · H {s.losses}
                {m.key === "2026" && <> · {s.points} p.</>}
              </div>
              <button
                disabled={!ok || busy}
                onClick={() => begin(m.key)}
                className="mt-3 w-full rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-3 py-2 disabled:opacity-40"
              >
                {ok ? "Pelaa" : `Tarvitset ${DUEL_MIN_CARDS} korttia`}
              </button>
            </div>
          );
        })}
      </div>

      {draft && (
        <div className="fixed inset-0 z-[70] bg-black/95 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display uppercase tracking-widest text-sm text-primary">
                {draft.mode === "2026" ? "2026 Season" : "All Time"}
              </span>
              <button onClick={close} aria-label="Sulje" className="text-2xl text-muted-foreground hover:text-primary px-2">
                ×
              </button>
            </div>

            {!outcome && (
              <>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">
                    Valitse 2 duellikorttia ({picks.length}/2)
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {draft.cards.map((c) => (
                      <CardTile
                        key={c.id}
                        card={c}
                        selected={picks.includes(c.id)}
                        onClick={() => togglePick(c.id)}
                        badge={picks.includes(c.id) ? `Kierros ${picks.indexOf(c.id) + 1}` : undefined}
                      />
                    ))}
                  </div>
                </div>

                {draft.boosters.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-2">
                      Booster (valinnainen)
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {draft.boosters.map((b) => (
                        <CardTile
                          key={b.id}
                          card={b}
                          selected={booster === b.id}
                          onClick={() => setBooster((cur) => (cur === b.id ? null : b.id))}
                          badge={`+${Math.round(((b.boost ?? 0) / 4) * 100) / 100} ATK/DEF`}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setBooster(null)}
                        className={`rounded border p-2 text-xs font-display uppercase tracking-widest ${booster === null ? "border-primary bg-primary/15" : "border-primary/30"}`}
                      >
                        Ei boosteria
                      </button>
                    </div>
                  </div>
                )}

                <button
                  disabled={picks.length !== 2 || busy}
                  onClick={fight}
                  className="w-full rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-3 py-3 disabled:opacity-40"
                >
                  Ottele
                </button>
              </>
            )}

            {outcome && (
              <div className="space-y-3">
                {outcome.rounds.slice(0, reveal).map((r: any) => (
                  <div key={r.index} className="rounded border border-primary/40 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-display uppercase tracking-widest">
                      <span>Kierros {r.index}</span>
                      <span className={r.win ? "text-primary" : "text-muted-foreground"}>{r.text}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <img src={r.card.image_url} alt="" className="w-full aspect-[3/4] object-cover rounded" />
                        <div className="mt-1">
                          Vauhti <span className="text-primary">{r.pace}</span>
                        </div>
                        <div className="text-muted-foreground">
                          ATK {r.attack_base}
                          {r.bonus > 0 && <span className="text-primary"> (+{r.bonus} boostilla)</span>}
                        </div>
                      </div>
                      <div>
                        <img src={r.opponent.image_url} alt="" className="w-full aspect-[3/4] object-cover rounded opacity-80" />
                        <div className="mt-1">
                          Puolustus <span className="text-primary">{r.block}</span>
                        </div>
                        <div className="text-muted-foreground">DEF {r.opponent.defense ?? 0}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {reveal < outcome.rounds.length ? (
                  <button
                    onClick={() => setReveal((n) => n + 1)}
                    className="w-full rounded border border-primary/60 text-sm font-display uppercase tracking-widest px-3 py-3"
                  >
                    Näytä kierros {reveal + 1}
                  </button>
                ) : (
                  <div className="rounded border border-primary p-4 text-center space-y-2">
                    <div className="font-display uppercase tracking-widest text-3xl text-primary">{outcome.result}</div>
                    <div className="text-xs text-muted-foreground">
                      {outcome.result === "P1" ? "Voitto" : outcome.result === "P2" ? "Tasapeli" : "Tappio"}
                      {outcome.mode === "2026" && <> · {outcome.season_points} kausipistettä</>}
                      {outcome.vault_awarded > 0 && <> · +{outcome.vault_awarded} varastopiste</>}
                    </div>
                    {outcome.booster && (
                      <div className="text-[11px] text-muted-foreground">
                        Booster {outcome.booster.serial_number}: +{outcome.bonus} ATK/DEF molempiin kortteihin
                      </div>
                    )}
                    <button
                      onClick={close}
                      className="mt-2 rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-4 py-2"
                    >
                      Valmis
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
