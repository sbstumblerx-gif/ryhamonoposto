import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeam, updateTeam } from "@/lib/content.functions";
import { useEntityIndex } from "@/components/useEntityIndex";
import { SmartText } from "@/components/SmartText";
import { Comments } from "@/components/Comments";
import { MediaUpload } from "@/components/MediaUpload";
import { EditableText } from "@/components/EditableText";
import { useAdmin } from "@/components/admin-store";
import { gradientFor } from "@/lib/team-colors";
import { toast } from "sonner";

export const Route = createFileRoute("/tiimit/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Tiimi` }] }),
  component: TeamPage,
});

function TeamPage() {
  const { slug } = Route.useParams();
  const get = useServerFn(getTeam);
  const save = useServerFn(updateTeam);
  const qc = useQueryClient();
  const admin = useAdmin();
  const entities = useEntityIndex();

  const q = useQuery({ queryKey: ["team", slug], queryFn: () => get({ data: { slug } }) });
  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8">Ladataan…</div>;
  const t = q.data;
  if (!t) return <div className="mx-auto max-w-4xl px-4 py-8">Tiimiä ei löydy.</div>;

  async function patch(p: Partial<{ content: string; hero_media_url: string | null }>) {
    await save({ data: { slug, ...p } });
    await qc.invalidateQueries({ queryKey: ["team", slug] });
    toast.success("Tallennettu");
  }

  return (
    <div>
      <div className="w-full py-14 border-b border-primary/40" style={{ background: gradientFor(t.color_key) }}>
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-2xl">{t.flag}</div>
          <h1 className="font-display uppercase tracking-widest text-2xl md:text-4xl">{t.name}</h1>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {t.hero_media_url && <img src={t.hero_media_url} alt={t.name} className="w-full rounded border border-primary/30 mb-4" />}
        {admin.isAdmin && (
          <div className="card-dark p-3 mb-4 space-y-3">
            <MediaUpload currentUrl={t.hero_media_url} onUploaded={(url) => patch({ hero_media_url: url })} label="Pääkuva" />
            <EditableText value={t.content ?? ""} multiline placeholder="Tiimin esittely…" onSave={(v) => patch({ content: v })} />
          </div>
        )}
        <SmartText text={t.content} entities={entities} className="text-sm leading-6" />
        <Comments entityType="team" entityId={t.id} />
      </div>
    </div>
  );
}
