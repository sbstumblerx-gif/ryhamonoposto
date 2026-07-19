import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo.png.asset.json";
import markAsset from "@/assets/mark.png.asset.json";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listNews } from "@/lib/content.functions";
import { AiSearch } from "@/components/AiSearch";

export const Route = createFileRoute("/")({
  component: Home,
});

const TILES = [
  { to: "/kilpailut", label: "Kilpailut" },
  { to: "/kuljettajat", label: "Kuljettajat" },
  { to: "/tiimit", label: "Tiimit" },
  { to: "/uutiset", label: "Uutiset" },
  { to: "/tilastot", label: "Tilastot" },
] as const;

function Home() {
  const list = useServerFn(listNews);
  const news = useQuery({ queryKey: ["news"], queryFn: () => list() });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: `url(${markAsset.url})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black" />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-14 text-center">
          <img src={logoAsset.url} alt="RyhäMonoposto" className="mx-auto h-16 md:h-24 w-auto" />
          <p className="mt-3 text-xs md:text-sm uppercase tracking-[0.3em] text-muted-foreground font-display">
            Viralliset kotisivut
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 -mt-4">
        <div className="mb-4">
          <AiSearch />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TILES.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group relative overflow-hidden card-dark p-4 h-24 flex items-end hover:border-primary transition"
            >
              <span className="font-display uppercase tracking-widest text-sm md:text-base group-hover:text-primary">
                {t.label}
              </span>
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
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">
                    {new Date(n.published_at).toLocaleDateString("fi-FI")}
                  </div>
                  <div className="font-display text-lg mt-1">{n.title}</div>
                  {n.excerpt && <p className="text-sm text-muted-foreground mt-1">{n.excerpt}</p>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">Ei vielä uutisia.</p>
        )}
      </section>
    </div>
  );
}
