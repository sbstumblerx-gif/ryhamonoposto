import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNews, upsertNews } from "@/lib/content.functions";
import { useEntityIndex } from "@/components/useEntityIndex";
import { SmartText } from "@/components/SmartText";
import { Comments } from "@/components/Comments";
import { MediaUpload } from "@/components/MediaUpload";
import { EditableText } from "@/components/EditableText";
import { useAdmin } from "@/components/admin-store";
import { toast } from "sonner";

export const Route = createFileRoute("/uutiset/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Uutinen` }] }),
  component: NewsPage,
});

function NewsPage() {
  const { slug } = Route.useParams();
  const get = useServerFn(getNews);
  const save = useServerFn(upsertNews);
  const qc = useQueryClient();
  const admin = useAdmin();
  const entities = useEntityIndex();

  const q = useQuery({ queryKey: ["news", slug], queryFn: () => get({ data: { slug } }) });
  if (q.isLoading) return <div className="mx-auto max-w-3xl px-4 py-8">Ladataan…</div>;
  const n = q.data;
  if (!n) return <div className="mx-auto max-w-3xl px-4 py-8">Uutista ei löydy.</div>;

  async function patch(p: Partial<{ title: string; excerpt: string; content: string; hero_media_url: string | null }>) {
    await save({ data: {
      id: n.id,
      title: p.title ?? n.title,
      excerpt: p.excerpt ?? n.excerpt ?? "",
      content: p.content ?? n.content ?? "",
      hero_media_url: p.hero_media_url ?? n.hero_media_url ?? null,
    }});
    await qc.invalidateQueries({ queryKey: ["news", slug] });
    toast.success("Tallennettu");
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{new Date(n.published_at).toLocaleDateString("fi-FI")}</div>
      <h1 className="font-display uppercase tracking-widest text-2xl md:text-3xl mt-1">{n.title}</h1>
      <div className="hairline-red mt-3 mb-6" />

      {n.hero_media_url && <img src={n.hero_media_url} alt={n.title} className="w-full rounded border border-primary/30 mb-4" />}

      {admin.isAdmin && (
        <div className="card-dark p-3 mb-4 space-y-3">
          <MediaUpload currentUrl={n.hero_media_url} onUploaded={(url) => patch({ hero_media_url: url })} label="Pääkuva" />
          <EditableText value={n.title} placeholder="Otsikko" onSave={(v) => patch({ title: v })} />
          <EditableText value={n.excerpt ?? ""} placeholder="Ingressi" onSave={(v) => patch({ excerpt: v })} />
          <EditableText value={n.content ?? ""} multiline placeholder="Sisältö…" onSave={(v) => patch({ content: v })} />
        </div>
      )}

      {n.excerpt && <p className="italic text-muted-foreground mb-4">{n.excerpt}</p>}
      <SmartText text={n.content} entities={entities} className="text-sm leading-6" />

      <Comments entityType="news" entityId={n.id} />
    </article>
  );
}
