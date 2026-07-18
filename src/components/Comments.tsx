import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listComments, adminDeleteComment } from "@/lib/comments.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAdmin } from "./admin-store";
import { toast } from "sonner";

export function Comments({ entityType, entityId }: { entityType: string; entityId: string }) {
  const list = useServerFn(listComments);
  const del = useServerFn(adminDeleteComment);
  const admin = useAdmin();
  const qc = useQueryClient();

  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? undefined, name: (data.user.user_metadata as any)?.full_name });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email ?? undefined, name: (session.user.user_metadata as any)?.full_name });
      else setUser(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => list({ data: { entity_type: entityType, entity_id: entityId } }),
  });

  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  async function post() {
    if (!user) return;
    if (!text.trim()) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        entity_type: entityType,
        entity_id: entityId,
        user_id: user.id,
        body: text.trim(),
      });
      if (error) throw error;
      setText("");
      await qc.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
    } catch (e: any) {
      toast.error(e.message ?? "Kommentin lähetys epäonnistui");
    } finally { setPosting(false); }
  }

  async function signIn() {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  }
  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function deleteComment(id: string, mine: boolean) {
    if (admin.isAdmin && !mine) {
      await del({ data: { id } });
    } else {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) { toast.error(error.message); return; }
    }
    await qc.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
  }

  return (
    <section className="mt-8">
      <div className="hairline-red mb-4" />
      <h3 className="font-display uppercase tracking-widest text-primary text-sm mb-4">Kommentit</h3>

      {user ? (
        <div className="mb-4 card-dark p-3">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span>Kirjautuneena: {user.name ?? user.email}</span>
            <button onClick={signOut} className="underline">Kirjaudu ulos</button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kirjoita kommentti…"
            className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm"
            rows={3}
          />
          <button onClick={post} disabled={posting || !text.trim()}
            className="mt-2 rounded bg-primary px-4 py-1.5 text-sm font-display uppercase tracking-widest text-primary-foreground disabled:opacity-50">
            Lähetä
          </button>
        </div>
      ) : (
        <div className="mb-4 card-dark p-3 text-sm text-muted-foreground">
          Vierailijat näkevät kommentit. Kirjaudu Googlella kommentoidaksesi.
          <button onClick={signIn} className="ml-3 rounded border border-primary/60 px-3 py-1 text-xs uppercase tracking-widest font-display hover:bg-primary/10">
            Kirjaudu Googlella
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {(q.data ?? []).length === 0 && <li className="text-sm text-muted-foreground italic">Ei kommentteja.</li>}
        {(q.data ?? []).map(c => {
          const mine = user?.id === c.user_id;
          const canDelete = mine || admin.isAdmin;
          return (
            <li key={c.id} className="card-dark p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.avatar_url && <img src={c.avatar_url} alt="" className="w-5 h-5 rounded-full" />}
                  <span className="text-foreground font-medium">{c.display_name}</span>
                  <span>· {new Date(c.created_at).toLocaleString("fi-FI")}</span>
                </div>
                {canDelete && (
                  <button
                    onClick={() => deleteComment(c.id, mine)}
                    className="text-xs text-primary/80 hover:text-primary underline"
                  >
                    Poista
                  </button>
                )}
              </div>
              <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
