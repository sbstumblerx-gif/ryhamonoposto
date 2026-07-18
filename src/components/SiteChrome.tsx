import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo.png.asset.json";
import { useAdmin, useAdminLogout } from "./admin-store";

export function SiteHeader() {
  const admin = useAdmin();
  const logout = useAdminLogout();
  return (
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-primary/40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="RyhäMonoposto" className="h-7 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm font-display uppercase tracking-widest">
          <Link to="/kilpailut" className="hover:text-primary">Kilpailut</Link>
          <Link to="/kuljettajat" className="hover:text-primary">Kuljettajat</Link>
          <Link to="/tiimit" className="hover:text-primary">Tiimit</Link>
          <Link to="/uutiset" className="hover:text-primary">Uutiset</Link>
          <Link to="/tilastot" className="hover:text-primary">Tilastot</Link>
        </nav>
        <div className="flex items-center gap-2">
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
