import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createUserPost, listMyPosts, deleteMyPost } from "@/lib/official-posts.functions";
import { createUserMediaUploadUrl, finalizeUserMediaUpload } from "@/lib/upload.functions";
import { supabase } from "@/integrations/supabase/client";
import { OfficialPostCard } from "@/components/OfficialPostCard";
import { toast } from "sonner";

export const Route = createFileRoute("/omat-postaukset")({
  head: () => ({
    meta: [
      { title: "Omat postaukset — RyhäMonoposto" },
      { name: "description", content: "Luo ja hallitse omia postauksiasi RyhäMonoposto-yhteisössä." },
      { property: "og:title", content: "Omat postaukset — RyhäMonoposto" },
      { property: "og:description", content: "Luo ja hallitse omia postauksiasi RyhäMonoposto-yhteisössä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyPostsPage,
});

function MyPostsPage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  const create = useServerFn(createUserPost), list = useServerFn(listMyPosts), del = useServerFn(deleteMyPost);
  const sign = useServerFn(createUserMediaUploadUrl), finalize = useServerFn(finalizeUserMediaUpload);
  const qc = useQueryClient();
  const [body, setBody] = useState(""), [media, setMedia] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const posts = useQuery({ queryKey: ["my-posts", userId], queryFn: () => list(), enabled: !!userId });

  async function chooseFile(file?: File) {
    if (!file) return;
    if (!/^(image|video)\//.test(file.type)) return toast.error("Vain kuva- tai videotiedosto");
    if (file.size > 15 * 1024 * 1024) return toast.error("Tiedosto voi olla enintään 15 Mt");
    setBusy(true);
    try {
      const s = await sign({ data: { filename: file.name, contentType: file.type } });
      const { error } = await supabase.storage.from("media").uploadToSignedUrl(s.key, s.token, file);
      if (error) throw error;
      setMedia((await finalize({ data: { key: s.key } })).url);
      toast.success("Media ladattu");
    } catch (e: any) { toast.error(e?.message ?? "Median lataus epäonnistui"); } finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !media) return;
    setBusy(true);
    try {
      await create({ data: { body, media_url: media } });
      toast.success("Postaus julkaistu");
      setBody(""); setMedia(null);
      qc.invalidateQueries({ queryKey: ["my-posts"] });
      qc.invalidateQueries({ queryKey: ["official-posts"] });
    } catch (err: any) { toast.error(err?.message ?? "Julkaisu epäonnistui"); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm("Poistetaanko postaus?")) return;
    await del({ data: { post_id: id } });
    qc.invalidateQueries({ queryKey: ["my-posts"] });
    qc.invalidateQueries({ queryKey: ["official-posts"] });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      <header>
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Omat postaukset</h1>
        <p className="text-sm text-muted-foreground mt-2">Julkaise omia postauksia — ne näkyvät kaikille Postaukset-sivulla.</p>
        <div className="hairline-red mt-3" />
      </header>
      {userId === undefined ? null : !userId ? (
        <div className="card-dark p-6 text-sm text-muted-foreground">
          <Link to="/profiili" className="text-primary hover:underline">Kirjaudu sisään</Link> luodaksesi postauksia.
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="card-dark p-5 space-y-4">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mitä mielessä?" rows={5} maxLength={5000} className="w-full bg-black border border-primary/30 rounded p-3 text-sm" />
            <div className="flex items-center gap-3">
              <label className="rounded border border-primary/40 px-3 py-2 text-xs font-display uppercase tracking-widest cursor-pointer">
                📎 Lisää media
                <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
              </label>
              {media && <button type="button" onClick={() => setMedia(null)} className="text-xs text-primary">✓ Media liitetty (poista)</button>}
            </div>
            <button disabled={busy || (!body.trim() && !media)} className="w-full rounded bg-primary text-primary-foreground py-3 font-display uppercase tracking-widest disabled:opacity-50">
              {busy ? "Julkaistaan…" : "Julkaise"}
            </button>
          </form>
          {posts.isLoading ? <p className="text-sm text-muted-foreground">Ladataan…</p> : !(posts.data ?? []).length ? (
            <div className="card-dark p-6 text-sm text-muted-foreground">Et ole vielä julkaissut postauksia.</div>
          ) : (
            <div className="space-y-3">
              {(posts.data ?? []).map((p: any) => (
                <div key={p.id} className="space-y-1">
                  <OfficialPostCard post={p} entities={[]} />
                  <button onClick={() => remove(p.id)} className="text-xs text-muted-foreground hover:text-primary">Poista postaus</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
