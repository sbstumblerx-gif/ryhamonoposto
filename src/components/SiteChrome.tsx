import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import logoAsset from "@/assets/logo.png.asset.json";
import { useAdmin, useAdminLogout } from "./admin-store";
import { AiChatPanel } from "./AiChatPanel";
import { GlobalSearch } from "./GlobalSearch";
import { unreadNotificationCount } from "@/lib/clubs.functions";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Data ja tilastot",
    items: [
      { to: "/kuljettajat", label: "Kuljettajat", icon: "🏎️" },
      { to: "/tiimit", label: "Tiimit", icon: "👥" },
      { to: "/kilpailut", label: "Kilpailut", icon: "🏁" },
      { to: "/tilastot", label: "Tilastot", icon: "📊" },
      { to: "/sopimukset", label: "Sopimukset", icon: "📝" },
      { to: "/uutiset", label: "Uutiset", icon: "📰" },
    ],
  },
  {
    label: "Yhteisö",
    items: [
      { to: "/ystavat", label: "Ystävät", icon: "👫" },
      { to: "/klubit", label: "Klubit", icon: "🎟️" },
      { to: "/aanestykset", label: "Äänestykset", icon: "🗳️" },
      { to: "/postaukset", label: "Postaukset", icon: "🌍" },
    ],
  },
  {
    label: "Osallistu",
    items: [
      { to: "/veikkaa", label: "Veikkaa", icon: "🎰" },
      { to: "/kokoelma", label: "Kokoelma", icon: "🗂️" },
      { to: "/pelaa", label: "Pelaa", icon: "🎮" },
    ],
  },
  {
    label: "Minä",
    items: [
      { to: "/profiili", label: "Profiili", icon: "👤" },
      { to: "/seuratut", label: "Seuratut", icon: "♥️" },
      { to: "/omat-postaukset", label: "Omat postaukset", icon: "📁" },
    ],
  },
];

function useUnreadCount() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const countFn = useServerFn(unreadNotificationCount);
  const q = useQuery({ queryKey: ["notif-count", uid], queryFn: () => countFn(), enabled: !!uid, refetchInterval: 30000 });
  return Number((q.data as any) ?? 0);
}

export function SiteHeader() {
  const admin = useAdmin();
  const logout = useAdminLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_SECTIONS.map((section) => [section.label, true]))
  );
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const unread = useUnreadCount();
  const title = "";

  useEffect(() => {
    setMenuOpen(false);
    setAskOpen(false);
  }, [pathname]);

  const pageContext = `Käyttäjä on sivulla: ${pathname}${title ? ` (${title})` : ""}. Vastaa ensin sivun sisällön pohjalta, hae tarvittaessa lisätietoa muualta sivustolta.`;
  const isAiPage = pathname === "/tekoalytila" || pathname === "/";

  const toggleSection = (label: string) => {
    setSectionsOpen((current) => ({ ...current, [label]: !current[label] }));
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-primary/40">
        <div className="mx-auto max-w-6xl px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button aria-label="Avaa valikko" onClick={() => setMenuOpen(true)} className="relative p-2 border border-primary/40 rounded hover:bg-primary/20">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" /></svg>
              {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-display flex items-center justify-center">{unread > 99 ? "99+" : unread}</span>}
            </button>
            <Link to="/" className="flex items-center gap-2"><img src={logoAsset.url} alt="RyhäMonoposto" className="h-7 w-auto" /></Link>
          </div>

          <GlobalSearch />

          <div className="flex items-center gap-2 shrink-0">
            {!isAiPage && <button onClick={() => setAskOpen(true)} className="hidden lg:block text-[10px] uppercase tracking-widest text-primary border border-primary/60 rounded px-2 py-1 hover:bg-primary/20">Kysy tästä sivusta</button>}
            {admin.isAdmin && <button onClick={logout} className="hidden md:block text-xs uppercase tracking-widest text-primary border border-primary/60 rounded px-2 py-1">Admin ✓</button>}
            <Link to="/profiili" className="hidden sm:block text-xs uppercase tracking-widest text-muted-foreground hover:text-primary border border-primary/30 rounded px-2 py-1">Profiili</Link>
            <Link to="/asetukset" className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground hover:text-primary border border-primary/30 rounded px-2 py-1">Asetukset</Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <aside onClick={(e) => e.stopPropagation()} className="absolute top-0 left-0 h-full w-80 max-w-[88vw] bg-black border-r border-primary/60 p-5 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-2"><img src={logoAsset.url} alt="RyhäMonoposto" className="h-8 w-auto" /><button aria-label="Sulje" onClick={() => setMenuOpen(false)} className="text-2xl text-muted-foreground hover:text-primary">×</button></div>
            <div className="hairline-red mb-2" />

            <nav className="flex flex-col">
              <Link to="/" className="font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded hover:bg-primary/10 flex items-center gap-3" activeProps={{ className: "font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded bg-primary/15 text-primary flex items-center gap-3" }}>
                <span>🏠</span><span>Etusivu</span>
              </Link>
              <Link to="/ilmoitukset" className="font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded hover:bg-primary/10 flex items-center justify-between gap-3" activeProps={{ className: "font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded bg-primary/15 text-primary flex items-center justify-between gap-3" }}>
                <span className="flex items-center gap-3"><span>✉️</span><span>Ilmoitukset</span></span>
                {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{unread > 99 ? "99+" : unread}</span>}
              </Link>
              <Link to="/tekoalytila" className="font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded hover:bg-primary/10 flex items-center gap-3" activeProps={{ className: "font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded bg-primary/15 text-primary flex items-center gap-3" }}>
                <span>🤖</span><span>Tekoälytila</span>
              </Link>

              <div className="hairline-red my-3" />

              {NAV_SECTIONS.map((section) => {
                const isOpen = sectionsOpen[section.label];
                return (
                  <div key={section.label} className="mb-1">
                    <button type="button" onClick={() => toggleSection(section.label)} aria-expanded={isOpen} className="w-full flex items-center justify-between px-3 py-2 rounded text-primary hover:bg-primary/10 font-display uppercase tracking-widest text-xs">
                      <span className="flex items-center gap-2"><span>{isOpen ? "🔽" : "▶️"}</span><span>{section.label}</span></span>
                    </button>
                    {isOpen && (
                      <div className="mt-0.5 pl-1">
                        {section.items.map((item) => (
                          <Link key={item.to} to={item.to} className="font-display uppercase tracking-widest text-sm px-3 py-2 rounded hover:bg-primary/10 flex items-center gap-3" activeProps={{ className: "font-display uppercase tracking-widest text-sm px-3 py-2 rounded bg-primary/15 text-primary flex items-center gap-3" }}>
                            <span className="w-5 text-center shrink-0">{item.icon}</span><span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="hairline-red my-3" />
              <Link to="/asetukset" className="font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded hover:bg-primary/10 flex items-center gap-3" activeProps={{ className: "font-display uppercase tracking-widest text-sm px-3 py-2.5 rounded bg-primary/15 text-primary flex items-center gap-3" }}>
                <span>⚙️</span><span>Asetukset</span>
              </Link>
            </nav>
          </aside>
        </div>
      )}

      {askOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 md:p-8" onClick={() => setAskOpen(false)}>
          <div className="absolute inset-0 bg-black/80" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl mt-8">
            <div className="flex items-center justify-between mb-2"><h3 className="font-display uppercase tracking-widest text-primary">Kysy tästä sivusta</h3><button aria-label="Sulje" onClick={() => setAskOpen(false)} className="text-2xl text-muted-foreground hover:text-primary">×</button></div>
            <AiChatPanel pageContext={pageContext} compact />
          </div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  return <footer className="mt-16 border-t border-primary/30"><div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground flex items-center justify-between"><span>© {new Date().getFullYear()} RyhäMonoposto</span><span className="font-display uppercase tracking-widest text-primary/70">RyhäMonoposto · Kotisivu</span></div></footer>;
}
