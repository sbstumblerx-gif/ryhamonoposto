import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo.png.asset.json";
import markAsset from "@/assets/mark.png.asset.json";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listNews, listRaces } from "@/lib/content.functions";
import { highlightIndex } from "@/lib/highlights.functions";
import { useSeenHighlights, firstUnseen } from "@/lib/highlights-seen";
import { HighlightRing } from "@/components/HighlightRing";
import { HighlightViewer } from "@/components/HighlightViewer";
import { AiChatPanel } from "@/components/AiChatPanel";
import { compareRaceOrder } from "@/lib/stats-compute";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RyhäMonoposto - kotisivu" },
      { name: "description", content: "RyhäMonoposto-sarjan viralliset kotisivut — kisat, kuljettajat, tiimit, uutiset, tilastot ja AI-tila." },
      { property: "og:title", content: "RyhäMonoposto - kotisivu" },
      { property: "og:description", content: "RyhäMonoposto-sarjan viralliset kotisivut — kisat, kuljettajat, tiimit, uutiset, tilastot ja AI-tila." },
    ],
  }),
  component: Home,
});

const TILES = [
  { to: "/kilpailut", label: "Kilpailut" },
  { to: "/kuljettajat", label: "Kuljettajat" },
  { to: "/tiimit", label: "Tiimit" },
  { to: "/uutiset", label: "Uutiset" },
  { to: "/tilastot", label: "Tilastot" },
  { to: "/veikkaa", label: "Veikkaa" },
  { to: "/klubit", label: "Klubit" },
  { to: "/kokoelma", label: "Kokoelma" },
] as const;

type RaceItem = {
  slug: string;
  name: string;
  flag: string;
  round_number: number | null;
  is_live?: boolean;
  race_content?: string | null;
};

function RaceWeekendSlider() {
  const list = useServerFn(listRaces);
  const highlights = useServerFn(highlightIndex);
  const q = useQuery({ queryKey: ["home-race-weekends"], queryFn: () => list(), staleTime: 30_000 });
  const hq = useQuery({ queryKey: ["highlight-index"], queryFn: () => highlights(), staleTime: 30_000 });
  const seen = useSeenHighlights();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<HTMLButtonElement | null>(null);
  const [viewer, setViewer] = useState<{ raceSlug: string; startId: string | null } | null>(null);

  const races = [...((q.data ?? []) as RaceItem[])].sort(compareRaceOrder);
  const liveIndex = races.findIndex(r => r.is_live === true);
  const nextUnfinishedIndex = races.findIndex((r, i) => i > liveIndex && !r.race_content?.trim());
  const firstUnfinishedIndex = races.findIndex(r => !r.race_content?.trim());
  const focusIndex = liveIndex >= 0
    ? liveIndex
    : (firstUnfinishedIndex >= 0 ? firstUnfinishedIndex : Math.max(0, races.length - 1));
  const hasLive = liveIndex >= 0;
  const nextIndex = liveIndex >= 0 ? nextUnfinishedIndex : focusIndex;
  const start = Math.max(0, focusIndex - 5);
  const visible = races.slice(start, Math.min(races.length, focusIndex + 10));
  const focusedOffset = Math.max(0, focusIndex - start);
  const index = hq.data ?? {};

  useEffect(() => {
    if (!focusRef.current || !scrollerRef.current) return;
    const frame = requestAnimationFrame(() => {
      const el = focusRef.current;
      const parent = scrollerRef.current;
      if (!el || !parent) return;
      parent.scrollLeft = Math.max(0, el.offsetLeft - parent.offsetLeft);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusIndex, q.data?.length]);

  if (q.isLoading || !races.length) return null;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display uppercase tracking-widest text-primary text-xs">Race weekendit</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">← vieritä →</span>
        </div>
        <div ref={scrollerRef} className="overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none pb-2">
          <div className="flex items-center gap-2 min-w-max px-1">
            {visible.map((race, i) => {
              const isFocus = i === focusedOffset;
              const absoluteIndex = start + i;
              const ids = index[race.slug] ?? [];
              const unseenId = firstUnseen(ids, seen);
              const ringState = ids.length === 0 ? "none" : unseenId ? "unseen" : "seen";
              const isNext = nextIndex >= 0 && absoluteIndex === nextIndex;
              const label = race.is_live ? "Käynnissä" : (isNext ? "Seuraavana" : undefined);
              return (
                <button
                  key={race.slug}
                  ref={isFocus ? focusRef : undefined}
                  type="button"
                  title={`${race.name}${race.round_number != null ? ` — R${race.round_number}` : ""}`}
                  onClick={() => {
                    if (unseenId) {
                      setViewer({ raceSlug: race.slug, startId: unseenId });
                      return;
                    }
                    window.location.href = `/kilpailut/${race.slug}`;
                  }}
                  className={`snap-start shrink-0 flex flex-col items-center gap-1 ${isFocus ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  <HighlightRing state={ringState}>
                    <span className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border font-display transition ${isFocus ? "border-primary bg-primary/15 shadow-[0_0_18px_hsl(var(--primary)/0.25)]" : "border-primary/30 bg-black/50 hover:border-primary/70"}`}>
                      <span className="text-2xl sm:text-3xl leading-none">{race.flag || "🏁"}</span>
                      {race.round_number != null && race.round_number > 0 && <span className="absolute bottom-0.5 text-[9px] sm:text-[10px] tracking-wider">R{race.round_number}</span>}
                    </span>
                  </HighlightRing>
                  <span className="h-3 text-[8px] uppercase tracking-widest whitespace-nowrap">{label ?? ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      {viewer && <HighlightViewer raceSlug={viewer.raceSlug} startId={viewer.startId} onClose={() => setViewer(null)} />}
    </>
  );
}

function Home() {
  const list = useServerFn(listNews);
  const news = useQuery({ queryKey: ["news"], queryFn: () => list() });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: `url(${markAsset.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black" />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-14 text-center">
          <img src={logoAsset.url} alt="RyhäMonoposto" className="mx-auto h-16 md:h-24 w-auto" />
          <p className="mt-3 text-xs md:text-sm uppercase tracking-[0.3em] text-muted-foreground font-display">Viralliset kotisivut</p>
        </div>
      </section>

      <RaceWeekendSlider />

      <section className="mx-auto max-w-6xl px-4 -mt-1 pt-4">
        <div className="mb-4"><AiChatPanel /></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {TILES.map((t) => (
            <Link key={t.to} to={t.to} className="group relative overflow-hidden card-dark p-4 h-24 flex items-end hover:border-primary transition">
              <span className="font-display uppercase tracking-widest text-sm md:text-base group-hover:text-primary">{t.label}</span>
              <span className="absolute top-3 right-3 h-2 w-8 bg-primary" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display uppercase tracking-widest text-primary">Uusimmat uutiset</h2>
          <Link to="/uutiset" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">Kaikki →</Link>
        </div>
        <div className="hairline-red mb-4" />
        {news.data && news.data.length > 0 ? (
          <ul className="grid md:grid-cols-2 gap-3">
            {news.data.slice(0, 4).map((n) => (
              <li key={n.id}>
                <Link to="/uutiset/$slug" params={{ slug: n.slug }} className="block card-dark p-4 hover:border-primary transition">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">{new Date(n.published_at).toLocaleDateString("fi-FI")}</div>
                  <div className="font-display text-lg mt-1">{n.title}</div>
                  {n.excerpt && <p className="text-sm text-muted-foreground mt-1">{n.excerpt}</p>}
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground italic">Ei vielä uutisia.</p>}
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-10 mb-10">
        <div className="card-dark p-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Kaikki kilpailut täältä:</span>
          <a href="https://youtube.com/playlist?list=PLBRpDkep-7oJKiv3-PKvvbJRkvmFspBZd&si=9_heaCayEzxDaGts" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline font-display uppercase tracking-widest">
            <svg viewBox="0 0 24 24" className="h-5 w-7" aria-hidden="true"><path fill="#FF0000" d="M23 12s0-3.7-.5-5.5c-.3-1-1.1-1.8-2.1-2.1C18.6 4 12 4 12 4s-6.6 0-8.4.4C2.6 4.7 1.8 5.5 1.5 6.5 1 8.3 1 12 1 12s0 3.7.5 5.5c.3 1.8 1.1 1.8 2.1 2.1C5.4 20 12 20 12 20s6.6 0 8.4-.4c1-.3 1.8-1.1 2.1-2.1.5-1.8.5-5.5.5-5.5z"/><path fill="#fff" d="M10 15.5l6-3.5-6-3.5z"/></svg>
            YouTube-soittolista
          </a>
        </div>
      </section>
    </div>
  );
}
