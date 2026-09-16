import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listNews, upsertNews, deleteNews } from "@/lib/content.functions";
import { useAdmin } from "@/components/admin-store";
import { MediaUpload } from "@/components/MediaUpload";
import { NewsBodyEditor } from "@/components/NewsBodyEditor";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/uutiset")({
  head: () => ({ meta: [{ title: "Uutiset — RyhäMonoposto" }] }),
  component: () => <Outlet />,
});

export function NewsList() {
  const list = useServerFn(listNews);
  const create = useServerFn(upsertNews);
  const del = useServerFn(deleteNews);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const admin = useAdmin();
  const q = useQuery({ queryKey: ["news"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [heroMediaUrl, setHeroMediaUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function add() {
    if (!title.trim()) {
      toast.error("Anna uutiselle otsikko");
      return;
    }
    setCreating(true);
    try {
      const created = await create({ data: {
        title: title.trim(),
        excerpt,
        content,
        hero_media_url: heroMediaUrl,
      } });
      setTitle(""); setExcerpt(""); setContent(""); setHeroMediaUrl(null);
      await qc.invalidateQueries({ queryKey: ["news"] });
      toast.success("Uutinen julkaistu");
      if (created?.slug) await navigate({ to: "/uutiset/$slug", params: { slug: created.slug } });
    } catch (e: any) {
      toast.error(e.message ?? "Uutisen luonti epäonnistui");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Poistetaanko uutinen?")) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["news"] });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Uutiset</h1>
      <div className="hairline-red mt-3 mb-6" />

      {admin.isAdmin && (
        <div className="card-dark p-4 mb-6 space-y-3">
          <div className="font-display uppercase tracking-widest text-sm text-primary">Uusi uutinen</div>
          <input placeholder="Otsikko" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <input placeholder="Ingressi (valinnainen)" value={excerpt} onChange={e => setExcerpt(e.target.value)}
            className="w-full bg-black/70 border border-primary/40 rounded p-2 text-sm" />
          <MediaUpload label="Pääkuva / -video" onUploaded={setHeroMediaUrl} />
          <NewsBodyEditor value={content} onChange={setContent} showSave={false} />
          <button onClick={() => void add()} disabled={creating || !title.trim()}
            className="rounded bg-primary text-primary-foreground text-sm font-display uppercase tracking-widest px-4 py-2 disabled:opacity-50">
            {creating ? "Julkaistaan…" : "Julkaise uutinen"}
          </button>
          <p className="text-xs text-muted-foreground">Kaikki kentät täytetään ennen julkaisua. Julkaisun jälkeen avautuu uutisen normaali muokkausnäkymä.</p>
        </div>
      )}

      <ul className="space-y-3">
        {(q.data ?? []).map(n => (
          <li key={n.id} className="card-dark p-4 flex items-start gap-3">
            <Link to="/uutiset/$slug" params={{ slug: n.slug }} className="flex-1 hover:text-primary">
              <div className="text-xs text-muted-foreground uppercase tracking-widest">{new Date(n.published_at).toLocaleDateString("fi-FI")}</div>
              <div className="font-display text-lg mt-1">{n.title}</div>
              {n.excerpt && <p className="text-sm text-muted-foreground mt-1">{n.excerpt}</p>}
            </Link>
            {admin.isAdmin && (
              <button onClick={() => void remove(n.id)} className="text-xs text-primary underline">Poista</button>
            )}
          </li>
        ))}
        {(q.data ?? []).length === 0 && <li className="text-sm text-muted-foreground italic">Ei uutisia vielä.</li>}
      </ul>
    </div>
  );
}
