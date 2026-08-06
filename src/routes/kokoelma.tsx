import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listCards,
  myCollection,
  openPack,
  redeemVault,
  shareCardToClub,
  adminUpsertCard,
  adminDeleteCard,
} from "@/lib/cards.functions";
import { listMyClubs } from "@/lib/clubs.functions";
import { listDrivers, listTeams, listRaces } from "@/lib/content.functions";
import { listSeasons } from "@/lib/seasons.functions";
import { useAdmin } from "@/components/admin-store";
import { MediaUpload } from "@/components/MediaUpload";
import { CardViewer } from "@/components/CardViewer";
import { CARD_TYPES, POSITIONS, VAULT_PER_CARD, cardTotal } from "@/lib/cards-shared";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/kokoelma")({
  head: () => ({
    meta: [
      { title: "Kokoelma — RyhäMonoposto" },
      { name: "description", content: "Kerää RyhäMonoposto-keräilykortteja veikkaamalla, avaa pakkoja ja lunasta varastopisteitä." },
      { property: "og:title", content: "Kokoelma — RyhäMonoposto" },
      { property: "og:description", content: "Kerää RyhäMonoposto-keräilykortteja veikkaamalla, avaa pakkoja ja lunasta varastopisteitä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectionPage,
});

type SortKey = "serial" | "team" | "driver" | "type" | "attack" | "defense" | "total";
const SORTS: [SortKey, string][] = [
  ["serial", "Sarjanumero"],
  ["team", "Tiimi"],
  ["driver", "Kuljettaja"],
  ["type", "Tyyppi"],
  ["attack", "Hyökkäys"],
  ["defense", "Puolustus"],
  ["total", "Kokonaisteho"],
];

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

function serialNum(s: string) {
  const n = parseInt(String(s).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function CollectionPage() {
  const uid = useUser();
  const admin = useAdmin();
  const qc = useQueryClient();

  const catalogFn = useServerFn(listCards);
  const collectionFn = useServerFn(myCollection);
  const openFn = useServerFn(openPack);
  const redeemFn = useServerFn(redeemVault);
  const shareFn = useServerFn(shareCardToClub);
  const clubsFn = useServerFn(listMyClubs);
  const driversFn = useServerFn(listDrivers);
  const teamsFn = useServerFn(listTeams);

  const catalogQ = useQuery({ queryKey: ["cards-catalog"], queryFn: () => catalogFn(), enabled: !uid });
  const collQ = useQuery({ queryKey: ["my-collection", uid], queryFn: () => collectionFn(), enabled: !!uid });
  const clubsQ = useQuery({ queryKey: ["my-clubs", uid], queryFn: () => clubsFn(), enabled: !!uid });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: () => driversFn() });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });

  const [sort, setSort] = useState<SortKey>("serial");
  const [viewer, setViewer] = useState<{ url: string; label: string } | null>(null);
  const [packResults, setPackResults] = useState<any[] | null>(null);
  const [packIndex, setPackIndex] = useState(0);
  const [shareFor, setShareFor] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const driverName = useMemo(
    () => new Map((driversQ.data ?? []).map((d: any) => [d.slug, d.name] as const)),
    [driversQ.data],
  );
  const teamName = useMemo(
    () => new Map((teamsQ.data ?? []).map((t: any) => [t.slug, t.name] as const)),
    [teamsQ.data],
  );

  const cards: any[] = uid ? ((collQ.data as any)?.cards ?? []) : ((catalogQ.data as any[]) ?? []).map((c) => ({ ...c, copies: 0 }));
  const vault = (collQ.data as any)?.vault ?? { points: 0, redeemable: 0, per_card: VAULT_PER_CARD };
  const packs: any[] = (collQ.data as any)?.packs ?? [];

  const sorted = useMemo(() => {
    const cmp = (a: any, b: any) => {
      switch (sort) {
        case "team": return String(teamName.get(a.team_slug) ?? "ö").localeCompare(String(teamName.get(b.team_slug) ?? "ö"), "fi");
        case "driver": return String(driverName.get(a.driver_slug) ?? "ö").localeCompare(String(driverName.get(b.driver_slug) ?? "ö"), "fi");
        case "type": return CARD_TYPES.indexOf(a.card_type) - CARD_TYPES.indexOf(b.card_type) || serialNum(a.serial_number) - serialNum(b.serial_number);
        case "attack": return (b.attack ?? -1) - (a.attack ?? -1);
        case "defense": return (b.defense ?? -1) - (a.defense ?? -1);
        case "total": return cardTotal(b) - cardTotal(a);
        default: return serialNum(a.serial_number) - serialNum(b.serial_number);
      }
    };
    const owned = cards.filter((c) => c.copies > 0).sort(cmp);
    const locked = cards.filter((c) => !c.copies).sort(cmp);
    return { owned, locked };
  }, [cards, sort, teamName, driverName]);

  async function doOpen(packId: string) {
    setBusy(true);
    try {
      const res: any = await openFn({ data: { pack_id: packId } });
      setPackResults(res.results ?? []);
      setPackIndex(0);
      await qc.invalidateQueries({ queryKey: ["my-collection", uid] });
      await qc.invalidateQueries({ queryKey: ["collection-badge"] });
    } catch (e: any) { toast.error(e?.message ?? "Pakan avaus epäonnistui"); }
    finally { setBusy(false); }
  }

  async function doRedeem() {
    setBusy(true);
    try {
      const res: any = await redeemFn();
      setPackResults(res.results ?? []);
      setPackIndex(0);
      await qc.invalidateQueries({ queryKey: ["my-collection", uid] });
      await qc.invalidateQueries({ queryKey: ["collection-badge"] });
    } catch (e: any) { toast.error(e?.message ?? "Lunastus epäonnistui"); }
    finally { setBusy(false); }
  }

  const alerts = packs.length + (vault.redeemable ?? 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Kokoelma</h1>
          <div className="hairline-red mt-3" />
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Kerää keräilykortteja veikkaamalla sessioita. Jokaisesta veikkauksesta saat pakan: 1 taattu kortti + 1 kortti jokaista
            20 veikkauspistettä kohden. Ylijäävät pisteet ja duplikaatit muuttuvat varastopisteiksi — {VAULT_PER_CARD} varastopistettä = 1 uusi kortti.
          </p>
        </div>
        {uid && (
          <div className="card-dark p-4 min-w-[220px] text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Varastopisteet</div>
            <div className="font-display text-3xl text-primary">{vault.points}</div>
            <div className="text-xs text-muted-foreground">{vault.points % VAULT_PER_CARD}/{VAULT_PER_CARD} seuraavaan korttiin</div>
            <button
              disabled={busy || vault.redeemable < 1}
              onClick={doRedeem}
              className="mt-2 w-full rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-3 py-2 disabled:opacity-40"
            >
              {vault.redeemable > 0 ? `Lunasta (${vault.redeemable}) ❗` : "Lunasta"}
            </button>
          </div>
        )}
      </header>

      {!uid && (
        <div className="card-dark p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Kirjaudu sisään kerätäksesi kortteja.</span>
          <button
            onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/kokoelma" })}
            className="rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-3 py-2"
          >
            Kirjaudu
          </button>
        </div>
      )}

      {uid && packs.length > 0 && (
        <section className="card-dark p-4">
          <h2 className="font-display uppercase tracking-widest text-sm text-primary mb-3">Avaamattomat pakat ❗</h2>
          <div className="flex flex-wrap gap-2">
            {packs.map((p) => (
              <button key={p.id} disabled={busy} onClick={() => doOpen(p.id)}
                className="rounded border border-primary/60 bg-primary/10 hover:bg-primary/20 px-4 py-3 text-sm font-display uppercase tracking-widest disabled:opacity-50">
                Avaa pakka · {p.card_count} korttia
              </button>
            ))}
          </div>
        </section>
      )}

      {admin.isAdmin && <AdminCards />}

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Järjestä:</span>
          {SORTS.map(([k, label]) => (
            <button key={k} onClick={() => setSort(k)}
              className={`text-[10px] font-display uppercase tracking-widest px-2 py-1 rounded border ${sort === k ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {cards.length === 0 && <p className="text-sm text-muted-foreground italic">Kortteja ei ole vielä lisätty.</p>}

        <CardGrid
          title={`Omistetut (${sorted.owned.length})`}
          cards={sorted.owned}
          owned
          driverName={driverName}
          teamName={teamName}
          onView={setViewer}
          onShare={uid ? setShareFor : undefined}
        />
        <CardGrid
          title={`Lukitut (${sorted.locked.length})`}
          cards={sorted.locked}
          driverName={driverName}
          teamName={teamName}
          onView={setViewer}
        />
      </section>

      <div>
        <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Etusivulle</Link>
      </div>

      {viewer && <CardViewer url={viewer.url} label={viewer.label} onClose={() => setViewer(null)} />}

      {packResults && (
        <PackOpening
          results={packResults}
          index={packIndex}
          onNext={() => setPackIndex((i) => i + 1)}
          onClose={() => setPackResults(null)}
        />
      )}

      {shareFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShareFor(null)}>
          <div className="absolute inset-0 bg-black/85" />
          <div onClick={(e) => e.stopPropagation()} className="relative card-dark p-4 w-full max-w-sm space-y-2">
            <h3 className="font-display uppercase tracking-widest text-primary text-sm">Jaa kortti klubiin</h3>
            {(clubsQ.data as any[] ?? []).length === 0 && <p className="text-sm text-muted-foreground">Et kuulu vielä yhteenkään klubiin.</p>}
            {((clubsQ.data as any[]) ?? []).map((c: any) => (
              <button key={c.id} disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await shareFn({ data: { card_id: shareFor.id, club_id: c.id } });
                    toast.success(`Kortti jaettu klubiin ${c.name}`);
                    setShareFor(null);
                  } catch (e: any) { toast.error(e?.message ?? "Jakaminen epäonnistui"); }
                  finally { setBusy(false); }
                }}
                className="w-full text-left border border-primary/40 rounded px-3 py-2 text-sm hover:border-primary">
                {c.name}
              </button>
            ))}
            <button onClick={() => setShareFor(null)} className="text-xs uppercase tracking-widest text-muted-foreground">Sulje</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CardGrid({
  title, cards, owned, driverName, teamName, onView, onShare,
}: {
  title: string; cards: any[]; owned?: boolean;
  driverName: Map<string, string>; teamName: Map<string, string>;
  onView: (v: { url: string; label: string }) => void;
  onShare?: (card: any) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="font-display uppercase tracking-widest text-xs text-muted-foreground mb-2">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const label = `${c.serial_number} · ${c.card_type} · ${c.is_booster ? "Team booster" : (driverName.get(c.driver_slug) ?? c.driver_slug ?? "")}`;
          return (
            <div key={c.id} className={`card-dark p-2 ${owned ? "" : "opacity-60"}`}>
              <div className="relative">
                <img src={c.image_url} alt={label} loading="lazy"
                  className={`w-full aspect-[3/4] object-cover rounded ${owned ? "" : "grayscale"}`} />
                {!owned && <span className="absolute top-2 left-2 text-lg">🔒</span>}
                {owned && c.copies > 1 && (
                  <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-display rounded px-1.5 py-0.5">x{c.copies}</span>
                )}
              </div>
              <div className="mt-2 text-[10px] font-display uppercase tracking-widest text-primary">{c.serial_number} · {c.card_type}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {c.is_booster ? "Team booster" : (driverName.get(c.driver_slug) ?? "—")} · {teamName.get(c.team_slug) ?? "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {c.is_booster ? `Boost ${c.boost ?? 0}` : `H ${c.attack ?? 0} · P ${c.defense ?? 0} · Σ ${cardTotal(c)}`}
              </div>
              {c.race_name && <div className="text-[10px] text-muted-foreground truncate">{c.race_flag} {c.race_name} {c.race_position}</div>}
              <div className="mt-2 flex gap-1">
                <button onClick={() => onView({ url: c.image_url, label })}
                  className="flex-1 text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1 hover:border-primary">Fullscreen</button>
                {owned && onShare && (
                  <button onClick={() => onShare(c)}
                    className="text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1 hover:border-primary">Jaa</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackOpening({ results, index, onNext, onClose }: { results: any[]; index: number; onNext: () => void; onClose: () => void }) {
  const item = results[index];
  const done = !item;
  const totalVp = results.reduce((s, r) => s + (r.vp ?? 0), 0);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95" />
      <div className="relative w-full max-w-sm text-center space-y-4">
        {done ? (
          <>
            <div className="font-display uppercase tracking-widest text-primary text-lg">Pakka avattu!</div>
            <p className="text-sm text-muted-foreground">{results.length} korttia{totalVp > 0 ? ` · +${totalVp} varastopistettä` : ""}</p>
            <button onClick={onClose} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">Valmis</button>
          </>
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Kortti {index + 1}/{results.length}</div>
            <img src={item.card.image_url} alt={item.card.serial_number} className="mx-auto max-h-[55vh] rounded border border-primary/50" />
            <div className={`font-display uppercase tracking-widest ${item.duplicate ? "text-yellow-400" : "text-primary"}`}>
              {item.duplicate ? `Duplikaatti — +${item.vp} varastopistettä` : "Uusi kortti!"}
            </div>
            <div className="text-xs text-muted-foreground">{item.card.serial_number} · {item.card.card_type}</div>
            <button onClick={onNext} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2">
              {index + 1 < results.length ? "Seuraava" : "Näytä yhteenveto"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const EMPTY = {
  id: undefined as string | undefined,
  image_url: "",
  serial_number: "",
  team_slug: "",
  driver_slug: "",
  card_type: "Tavallinen" as string,
  driver_number: "",
  race_name: "",
  race_flag: "",
  race_position: "",
  season_slug: "",
  attack: "",
  defense: "",
  boost: "",
};

function AdminCards() {
  const qc = useQueryClient();
  const upsertFn = useServerFn(adminUpsertCard);
  const delFn = useServerFn(adminDeleteCard);
  const catalogFn = useServerFn(listCards);
  const driversFn = useServerFn(listDrivers);
  const teamsFn = useServerFn(listTeams);
  const seasonsFn = useServerFn(listSeasons);
  const racesFn = useServerFn(listRaces);

  const catalogQ = useQuery({ queryKey: ["cards-catalog-admin"], queryFn: () => catalogFn() });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: () => driversFn() });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });
  const seasonsQ = useQuery({ queryKey: ["seasons"], queryFn: () => seasonsFn() });
  const racesQ = useQuery({ queryKey: ["races"], queryFn: () => racesFn() });

  const [f, setF] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const isBooster = f.driver_slug === "";
  const needsRace = f.card_type === "PODIUM" || f.card_type === "WIN";
  const total = (Number(f.attack) || 0) + (Number(f.defense) || 0);

  function set<K extends keyof typeof EMPTY>(k: K, v: any) { setF((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!f.image_url) { toast.error("Lisää kortin kuva"); return; }
    if (!f.serial_number.trim()) { toast.error("Lisää sarjanumero"); return; }
    setBusy(true);
    try {
      await upsertFn({
        data: {
          id: f.id,
          image_url: f.image_url,
          serial_number: f.serial_number.trim().startsWith("#") ? f.serial_number.trim() : `#${f.serial_number.trim()}`,
          team_slug: f.team_slug || null,
          driver_slug: f.driver_slug || null,
          is_booster: isBooster,
          card_type: f.card_type as any,
          driver_number: f.driver_number === "" ? null : Number(f.driver_number),
          race_name: needsRace && f.race_name ? f.race_name : null,
          race_flag: needsRace && f.race_flag ? f.race_flag : null,
          race_position: needsRace && f.race_position ? (f.race_position as any) : null,
          season_slug: f.season_slug || null,
          attack: isBooster || f.attack === "" ? null : Number(f.attack),
          defense: isBooster || f.defense === "" ? null : Number(f.defense),
          boost: isBooster && f.boost !== "" ? Number(f.boost) : null,
        },
      });
      toast.success(f.id ? "Kortti päivitetty" : "Kortti lisätty");
      setF({ ...EMPTY });
      await qc.invalidateQueries({ queryKey: ["cards-catalog-admin"] });
      await qc.invalidateQueries({ queryKey: ["cards-catalog"] });
      await qc.invalidateQueries({ queryKey: ["my-collection"] });
    } catch (e: any) { toast.error(e?.message ?? "Tallennus epäonnistui"); }
    finally { setBusy(false); }
  }

  const input = "w-full bg-black/70 border border-primary/40 rounded p-2 text-sm";
  const lbl = "text-[10px] uppercase tracking-widest text-muted-foreground font-display";

  return (
    <section className="card-dark p-4 space-y-4">
      <h2 className="font-display uppercase tracking-widest text-sm text-primary">Admin: {f.id ? "muokkaa korttia" : "lisää kortti"}</h2>

      <MediaUpload currentUrl={f.image_url} onUploaded={(url) => set("image_url", url)} label="Kortin kuva" />

      <div className="grid md:grid-cols-3 gap-3">
        <label className="block">
          <span className={lbl}>Sarjanumero (#x)</span>
          <input className={input} value={f.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder="#12" />
        </label>
        <label className="block">
          <span className={lbl}>Tiimi</span>
          <select className={input} value={f.team_slug} onChange={(e) => set("team_slug", e.target.value)}>
            <option value="">—</option>
            {((teamsQ.data as any[]) ?? []).map((t: any) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Kuljettaja (tyhjä = tiimi-booster)</span>
          <select className={input} value={f.driver_slug} onChange={(e) => set("driver_slug", e.target.value)}>
            <option value="">Ei kuljettajaa — tiimi-booster</option>
            {((driversQ.data as any[]) ?? []).map((d: any) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Tyyppi</span>
          <select className={input} value={f.card_type} onChange={(e) => set("card_type", e.target.value)}>
            {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Kuljettajan numero</span>
          <input type="number" className={input} value={f.driver_number} onChange={(e) => set("driver_number", e.target.value)} />
        </label>
        <label className="block">
          <span className={lbl}>Kausi</span>
          <select className={input} value={f.season_slug} onChange={(e) => set("season_slug", e.target.value)}>
            <option value="">—</option>
            {((seasonsQ.data as any[]) ?? []).map((s: any) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {needsRace && (
        <div className="grid md:grid-cols-3 gap-3 border-t border-primary/20 pt-3">
          <label className="block">
            <span className={lbl}>Kilpailu</span>
            <select className={input} value={f.race_name}
              onChange={(e) => {
                const race = ((racesQ.data as any[]) ?? []).find((r: any) => r.name === e.target.value);
                set("race_name", e.target.value);
                set("race_flag", race?.flag ?? "");
              }}>
              <option value="">—</option>
              {((racesQ.data as any[]) ?? []).map((r: any) => <option key={r.slug} value={r.name}>{r.flag} {r.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Lippu</span>
            <input className={input} value={f.race_flag} onChange={(e) => set("race_flag", e.target.value)} placeholder="🇨🇳" />
          </label>
          <label className="block">
            <span className={lbl}>Sijoitus</span>
            <select className={input} value={f.race_position} onChange={(e) => set("race_position", e.target.value)}>
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
      )}

      {isBooster ? (
        <label className="block max-w-xs">
          <span className={lbl}>Boost-arvo</span>
          <input type="number" className={input} value={f.boost} onChange={(e) => set("boost", e.target.value)} />
        </label>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block">
            <span className={lbl}>Hyökkäys</span>
            <input type="number" className={input} value={f.attack} onChange={(e) => set("attack", e.target.value)} />
          </label>
          <label className="block">
            <span className={lbl}>Puolustus</span>
            <input type="number" className={input} value={f.defense} onChange={(e) => set("defense", e.target.value)} />
          </label>
          <div>
            <span className={lbl}>Yhteensä</span>
            <div className="font-display text-2xl text-primary">{total}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2 disabled:opacity-50">
          {f.id ? "Tallenna muutokset" : "+ Lisää kortti"}
        </button>
        {f.id && <button onClick={() => setF({ ...EMPTY })} className="text-xs border border-primary/50 rounded px-3 py-1">Peruuta</button>}
      </div>

      <div className="border-t border-primary/20 pt-3">
        <h3 className={lbl}>Kaikki kortit ({((catalogQ.data as any[]) ?? []).length})</h3>
        <div className="grid md:grid-cols-2 gap-2 mt-2 max-h-72 overflow-y-auto">
          {((catalogQ.data as any[]) ?? []).map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 border border-primary/20 rounded p-2">
              <img src={c.image_url} alt={c.serial_number} className="h-12 w-9 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-display truncate">{c.serial_number} · {c.card_type}</div>
                <div className="text-[10px] text-muted-foreground truncate">{c.driver_slug ?? "Tiimi-booster"} · {c.team_slug ?? "—"}</div>
              </div>
              <button className="text-[10px] border border-primary/40 rounded px-2 py-1"
                onClick={() => setF({
                  id: c.id, image_url: c.image_url, serial_number: c.serial_number,
                  team_slug: c.team_slug ?? "", driver_slug: c.driver_slug ?? "", card_type: c.card_type,
                  driver_number: c.driver_number ?? "", race_name: c.race_name ?? "", race_flag: c.race_flag ?? "",
                  race_position: c.race_position ?? "", season_slug: c.season_slug ?? "",
                  attack: c.attack ?? "", defense: c.defense ?? "", boost: c.boost ?? "",
                })}>Muokkaa</button>
              <button className="text-[10px] border border-primary/40 rounded px-2 py-1"
                onClick={async () => {
                  if (!confirm("Poistetaanko kortti?")) return;
                  await delFn({ data: { id: c.id } });
                  await qc.invalidateQueries({ queryKey: ["cards-catalog-admin"] });
                  await qc.invalidateQueries({ queryKey: ["cards-catalog"] });
                }}>Poista</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
