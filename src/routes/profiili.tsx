import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { uploadUserMedia } from "@/lib/upload.functions";
import { Avatar, AVATAR_PRESETS } from "@/components/Avatar";
import { fileToBase64 } from "@/lib/file-base64";
import { SvAccountPanel } from "@/components/SvAccountPanel";

export const Route = createFileRoute("/profiili")({
  head: () => ({
    meta: [
      { title: "Profiili — RyhäMonoposto" },
      { name: "description", content: "Aseta käyttäjänimesi ja valitse avatar RyhäMonoposto-sarjan sivustolla." },
      { property: "og:title", content: "Profiili — RyhäMonoposto" },
      { property: "og:description", content: "Aseta käyttäjänimesi ja valitse avatar RyhäMonoposto-sarjan sivustolla." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const upload = useServerFn(uploadUserMedia);
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load(id: string | null) {
      if (!alive) return;
      setUid(id);
      if (!id) { setLoaded(true); return; }
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", id).maybeSingle();
      if (!alive) return;
      setName(data?.display_name ?? "");
      setAvatar(data?.avatar_url ?? null);
      setLoaded(true);
    }
    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => load(s?.user?.id ?? null));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  async function save(next?: { avatar_url?: string | null }) {
    if (!uid) return;
    const display = name.trim();
    if (!display) { toast.error("Käyttäjänimi ei voi olla tyhjä"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: uid,
        display_name: display,
        avatar_url: next && "avatar_url" in next ? next.avatar_url ?? null : avatar,
      });
      if (error) throw error;
      toast.success("Profiili tallennettu");
    } catch (e: any) {
      toast.error(e?.message ?? "Tallennus epäonnistui");
    } finally { setBusy(false); }
  }

  async function pickFile(file: File) {
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const { url } = await upload({ data: { filename: file.name, contentType: file.type || "image/png", base64 } });
      setAvatar(url);
      await save({ avatar_url: url });
    } catch (e: any) {
      toast.error(e?.message ?? "Kuvan lataus epäonnistui");
    } finally { setBusy(false); }
  }

  if (!loaded) return <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Ladataan…</div>;

  if (!uid) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 space-y-4 text-center">
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Profiili</h1>
        <div className="hairline-red" />
        <p className="text-sm text-muted-foreground">Kirjaudu sisään asettaaksesi käyttäjänimen ja avatarin.</p>
        <button
          onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/profiili" })}
          className="rounded bg-white text-black text-sm font-display uppercase tracking-widest px-4 py-2"
        >
          Kirjaudu Googlella
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <div>
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Profiili</h1>
        <div className="hairline-red mt-3" />
      </div>

      <section className="card-dark p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar url={avatar} name={name} size={56} />
          <div>
            <div className="font-display uppercase tracking-widest text-sm">{name || "Nimetön"}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Näkyy kommenteissa ja klubeissa</div>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Käyttäjänimi</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 32))}
            placeholder="Käyttäjänimi"
            className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Valitse avatar</span>
          <div className="flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((e) => {
              const val = `emoji:${e}`;
              return (
                <button
                  key={e}
                  onClick={() => { setAvatar(val); void save({ avatar_url: val }); }}
                  className={`h-10 w-10 rounded-full border text-lg flex items-center justify-center ${avatar === val ? "border-primary bg-primary/20" : "border-primary/30 hover:border-primary"}`}
                >
                  {e}
                </button>
              );
            })}
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Tai lataa kuva</span>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickFile(f); }}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => void save()}
            className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50"
          >
            Tallenna
          </button>
          {avatar && (
            <button
              disabled={busy}
              onClick={() => { setAvatar(null); void save({ avatar_url: null }); }}
              className="border border-primary/40 rounded px-4 py-2 text-xs font-display uppercase tracking-widest"
            >
              Poista avatar
            </button>
          )}
        </div>
      </section>

      <SvAccountPanel />
    </div>
  );
}
