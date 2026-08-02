import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import logoAsset from "@/assets/logo.png.asset.json";
import { useAdmin, useAdminLogout } from "./admin-store";
import { AiChatPanel } from "./AiChatPanel";
import { unreadNotificationCount } from "@/lib/clubs.functions";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Etusivu" },
  { to: "/kilpailut", label: "Kilpailut" },
  { to: "/kuljettajat", label: "Kuljettajat" },
  { to: "/tiimit", label: "Tiimit" },
  { to: "/tilastot", label: "Tilastot" },
  { to: "/uutiset", label: "Uutiset" },
  { to: "/veikkaa", label: "Veikkaa" },
  { to: "/klubit", label: "Klubit" },
  { to: "/ilmoitukset", label: "Ilmoitukset" },
  { to: "/tekoalytila", label: "Tekoälytila" },
] as const;

function useUnreadCount() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const countFn = useServerFn(unreadNotificationCount);
  const q = useQuery({
    queryKey: ["notif-count", uid],
    queryFn: () => countFn(),
    enabled: !!uid,
    refetchInterval: 30000,
  });
  return Number((q.data as any) ?? 0);
}

export function SiteHeader() {
  const admin = useAdmin();
  const logout = useAdminLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const unread = useUnreadCount();
  const title = "";


  useEffect(() => {
    setMenuOpen(false);
    setAskOpen(false);
  }, [pathname]);

  const pageContext = `Käyttäjä on sivulla: ${pathname}${title ? ` (${title})` : ""}. Vastaa ensin sivun sisällön pohjalta, hae tarvittaessa lisätietoa muualta sivustolta.`;
  const isAiPage = pathname === "/tekoalytila" || pathname === "/";

  return (
    <>
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-primary/40">
        <div className="mx-auto max-w-6xl px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              aria-label="Avaa valikko"
              onClick={() => setMenuOpen(true)}
              className="relative p-2 border border-primary/40 rounded hover:bg-primary/20"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-display flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>

            <Link to="/" className="flex items-center gap-2">
              <img src={logoAsset.url} alt="RyhäMonoposto" className="h-7 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {!isAiPage && (
              <button
                onClick={() => setAskOpen(true)}
                className="text-[10px] md:text-xs uppercase tracking-widest text-primary border border-primary/60 rounded px-2 py-1 hover:bg-primary/20"
              >
                Kysy tästä sivusta
              </button>
            )}
            {admin.isAdmin && (
              <button onClick={logout} className="text-xs uppercase tracking-widest text-primary border border-primary/60 rounded px-2 py-1">
                Admin ✓
              </button>
            )}
            <Link to="/asetukset" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary border border-primary/30 rounded px-2 py-1">
              Asetukset
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-black border-r border-primary/60 p-5 flex flex-col gap-2 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-2">
              <img src={logoAsset.url} alt="RyhäMonoposto" className="h-8 w-auto" />
              <button aria-label="Sulje" onClick={() => setMenuOpen(false)} className="text-xl text-muted-foreground hover:text-primary">×</button>
            </div>
            <div className="hairline-red mb-2" />
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="font-display uppercase tracking-widest text-sm px-3 py-2 rounded border border-transparent hover:border-primary/60 hover:bg-primary/10 flex items-center justify-between gap-2"
                  activeProps={{ className: "font-display uppercase tracking-widest text-sm px-3 py-2 rounded border border-primary bg-primary/20 text-primary flex items-center justify-between gap-2" }}
                >
                  <span>{n.label}</span>
                  {n.to === "/ilmoitukset" && unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              ))}

            </nav>
          </aside>
        </div>
      )}

      {askOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 md:p-8" onClick={() => setAskOpen(false)}>
          <div className="absolute inset-0 bg-black/80" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl mt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display uppercase tracking-widest text-primary">Kysy tästä sivusta</h3>
              <button aria-label="Sulje" onClick={() => setAskOpen(false)} className="text-2xl text-muted-foreground hover:text-primary">×</button>
            </div>
            <AiChatPanel pageContext={pageContext} compact />
          </div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-primary/30">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground flex items-center justify-between">
        <span>© {new Date().getFullYear()} RyhäMonoposto</span>
        <span className="font-display uppercase tracking-widest text-primary/70">RyhäMonoposto · Kotisivu</span>
      </div>
    </footer>
  );
}
