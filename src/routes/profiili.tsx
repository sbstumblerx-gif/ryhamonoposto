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
import { listMyClubTags, setMyClubTag, updateClubTag } from "@/lib/club-tags.functions";

export const Route = createFileRoute("/profiili")({
  head: () => ({
    meta: [
      { title: "Profiili — RyhäMonoposto" },
      { name: "description", content: "Aseta käyttäjänimesi, avatar ja klubitunniste RyhäMonopostossa." },
      { property: "og:title", content: "Profiili — RyhäMonoposto" },
      { property: "og:description", content: "Aseta käyttäjänimesi, avatar ja klubitunniste RyhäMonopostossa." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const upload = useServerFn(uploadUserMedia);
  const myTagsFn = useServerFn(listMyClubTags);
  const setTagFn = useServerFn(setMyClubTag);
  const updateTagFn = useServerFn(updateClubTag);
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [clubTags, setClubTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tagText, setTagText] = useState("");
  const [tagEmoji, setTagEmoji] = useState("");

  async function loadTags() {
    try {
      const tags = await myTagsFn();
      setClubTags(tags as any[]);
      const { data } = await supabase.from("profiles").select("club_tag_club_id").eq("id", uid).maybeSingle();
      setSelectedTag(data?.club_tag_club_id ?? null);
    } catch { /* profile still works if the migration has not run yet */ }
  }

  useEffect(() => {
    let alive = true;
    async function load(id: string | null) {
      if (!alive) return;
      setUid(id);
      if (!id) { setLoaded(true); return; }
      const { data } = await supabase.from("profiles").select("display_name, avatar_url, club_tag_club_id").eq("id", id).maybeSingle();
      if (!alive) return;
      setName(data?.display_name ?? "");
      setAvatar(data?.avatar_url ?? null);
      setSelectedTag(data?.club_tag_club_id ?? null);
      try {
        const tags = await myTagsFn();
        if (alive) setClubTags(tags as any[]);
      } catch { /* migration may still be pending */ }
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

  async function chooseTag(id: string | null) {
    setBusy(true);
    try {
      await setTagFn({ data: { club_id: id } });
      setSelectedTag(id);
      toast.success(id ? "Klubitunniste valittu" : "Klubitunniste poistettu");
    } catch (e: any) { toast.error(e?.message ?? "Klubitunnisteen valinta epäonnistui"); }
    finally { setBusy(false); }
  }

  async function saveOwnedTag(clubId: string, enabled: boolean) {
    setBusy(true);
    try {
      await updateTagFn({ data: { club_id: clubId, tag: tagText, emoji: tagEmoji || null, enabled } });
      toast.success(enabled ? "Klubitunniste otettu käyttöön" : "Klubitunniste poistettu käytöstä");
      await loadTags();
      setTagText(""); setTagEmoji("");
    } catch (e: any) { toast.error(e?.message ?? "Klubitunnisteen tallennus epäonnistui"); }
    finally { setBusy(false); }
  }

  if (!loaded) return <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Ladataan…</div>;

  if (!uid) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 space-y-4 text-center">
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Profiili</h1>
        <div className="hairline-red" />
        <p className="text-sm text-muted-foreground">Kirjaudu sisään asettaaksesi käyttäjänimen ja avatarin.</p>
        <button onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/profiili" })}
          className="rounded bg-white text-black text-sm font-display uppercase tracking-widest px-4 py-2">Kirjaudu Googlella</button>
      </div>
    );
  }

  const ownedClubs = clubTags.filter(c => c.role === "owner");

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <div><h1 className="font-display uppercase tracking-widest text-2xl text-primary">Profiili</h1><div className="hairline-red mt-3" /></div>

      <section className="card-dark p-4 space-y-4">
        <div className="flex items-center gap-3"><Avatar url={avatar} name={name} size={56} /><div><div className="font-display uppercase tracking-widest text-sm">{name || "Nimetön"}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Näkyy kommenteissa ja klubeissa</div></div></div>
        <label className="block space-y-1"><span className="text-xs uppercase tracking-widest text-muted-foreground">Käyttäjänimi</span><input value={name} onChange={(e) => setName(e.target.value.slice(0, 32))} placeholder="Käyttäjänimi" className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm" /></label>
        <div className="space-y-2"><span className="text-xs uppercase tracking-widest text-muted-foreground">Valitse avatar</span><div className="flex flex-wrap gap-2">{AVATAR_PRESETS.map((e) => { const val = `emoji:${e}`; return <button key={e} onClick={() => { setAvatar(val); void save({ avatar_url: val }); }} className={`h-10 w-10 rounded-full border text-lg flex items-center justify-center ${avatar === val ? "border-primary bg-primary/20" : "border-primary/30 hover:border-primary"}`}>{e}</button>; })}</div>
          <label className="inline-flex items-center gap-2 cursor-pointer"><span className="text-xs uppercase tracking-widest text-muted-foreground">Tai lataa kuva</span><input type="file" accept="image/*" disabled={busy} className="text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickFile(f); }} /></label></div>
        <div className="flex gap-2"><button disabled={busy} onClick={() => void save()} className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50">Tallenna</button>{avatar && <button disabled={busy} onClick={() => { setAvatar(null); void save({ avatar_url: null }); }} className="border border-primary/40 rounded px-4 py-2 text-xs font-display uppercase tracking-widest">Poista avatar</button>}</div>
      </section>

      <section className="card-dark p-4 space-y-3">
        <h2 className="font-display uppercase tracking-widest text-sm text-primary">🏷️ Oma klubitunniste</h2>
        <p className="text-xs text-muted-foreground">Valitse yksi aktiivinen tunniste niistä klubeista, joiden jäsen olet. Se näkyy nimesi perässä.</p>
        <select disabled={busy} value={selectedTag ?? ""} onChange={(e) => void chooseTag(e.target.value || null)} className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm">
          <option value="">Ei klubitunnistetta</option>
          {clubTags.map(c => <option key={c.id} value={c.id}>{c.tag_emoji ? `${c.tag_emoji} ` : ""}{c.tag} — {c.name}</option>)}
        </select>
        {selectedTag && clubTags.find(c => c.id === selectedTag)?.tag && <div className="text-xs text-primary">Näytetään: {clubTags.find(c => c.id === selectedTag)?.tag_emoji} {clubTags.find(c => c.id === selectedTag)?.tag}</div>}
      </section>

      <section className="card-dark p-4 space-y-3">
        <h2 className="font-display uppercase tracking-widest text-sm text-primary">Klubitunnisteiden hallinta</h2>
        <p className="text-xs text-muted-foreground">Klubin omistajana voit luoda tunnisteen. Tunniste on 2–5 merkkiä ja voi sisältää emojin.</p>
        {ownedClubs.length === 0 ? <p className="text-xs text-muted-foreground">Et omista vielä klubeja.</p> : ownedClubs.map(c => (
          <div key={c.id} className="border border-primary/20 rounded p-3 space-y-2">
            <div className="text-sm font-display uppercase tracking-widest">{c.name}</div>
            <div className="flex gap-2"><input value={c.tag ?? tagText} onChange={(e) => setClubTags(prev => prev.map(x => x.id === c.id ? { ...x, tag: e.target.value.toUpperCase().slice(0,5) } : x))} placeholder="TAG" className="w-24 bg-black/70 border border-primary/30 rounded p-2 text-sm uppercase" /><input value={c.tag_emoji ?? ""} onChange={(e) => setClubTags(prev => prev.map(x => x.id === c.id ? { ...x, tag_emoji: e.target.value.slice(0,2) } : x))} placeholder="🏁" className="w-20 bg-black/70 border border-primary/30 rounded p-2 text-sm" /></div>
            <div className="flex gap-2 flex-wrap"><button disabled={busy} onClick={() => void updateTagFn({ data: { club_id: c.id, tag: c.tag ?? "", emoji: c.tag_emoji ?? null, enabled: true } }).then(() => { toast.success("Klubitunniste tallennettu"); void loadTags(); }).catch((e: any) => toast.error(e?.message ?? "Tallennus epäonnistui"))} className="bg-primary text-primary-foreground rounded px-3 py-2 text-[10px] uppercase tracking-widest">Tallenna ja aktivoi</button><button disabled={busy} onClick={() => void updateTagFn({ data: { club_id: c.id, tag: c.tag ?? null, emoji: c.tag_emoji ?? null, enabled: false } }).then(() => { toast.success("Klubitunniste poistettu käytöstä"); void loadTags(); }).catch((e: any) => toast.error(e?.message ?? "Toiminto epäonnistui"))} className="border border-primary/40 rounded px-3 py-2 text-[10px] uppercase tracking-widest">Poista käytöstä</button></div>
          </div>
        ))}
      </section>

      <SvAccountPanel />
    </div>
  );
}
