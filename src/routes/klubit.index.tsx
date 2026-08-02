import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClub, joinByCode, joinPublicClub, listMyClubs, searchClubs } from "@/lib/clubs.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/klubit/")({
  head: () => ({
    meta: [
      { title: "Klubit — RyhäMonoposto" },
      { name: "description", content: "Luo oma klubi, liity koodilla tai etsi julkisia klubeja ja kilpaile veikkauspisteistä." },
      { property: "og:title", content: "Klubit — RyhäMonoposto" },
      { property: "og:description", content: "Luo oma klubi, liity koodilla tai etsi julkisia klubeja ja kilpaile veikkauspisteistä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClubsPage,
});

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

function ClubsPage() {
  const uid = useUser();
  const nav = useNavigate();
  const qc = useQueryClient();
  const myFn = useServerFn(listMyClubs);
  const searchFn = useServerFn(searchClubs);
  const createFn = useServerFn(createClub);
  const codeFn = useServerFn(joinByCode);
  const joinFn = useServerFn(joinPublicClub);

  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<"public" | "code">("public");
  const [approval, setApproval] = useState(false);
  const [busy, setBusy] = useState(false);

  const mineQ = useQuery({ queryKey: ["my-clubs", uid], queryFn: () => myFn(), enabled: !!uid });
  const searchQ = useQuery({ queryKey: ["clubs-search", q, uid], queryFn: () => searchFn({ data: { q } }), enabled: !!uid });

  if (!uid) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center space-y-4">
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Klubit</h1>
        <div className="hairline-red" />
        <p className="text-sm text-muted-foreground">Kirjaudu sisään luodaksesi tai liittyäksesi klubeihin.</p>
        <button
          onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/klubit" })}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest"
        >
          Kirjaudu Googlella
        </button>
      </div>
    );
  }

  async function doCreate() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const club: any = await createFn({ data: { name: name.trim(), description: desc.trim(), visibility, require_approval: approval } });
      toast.success(`Klubi luotu — koodi ${club.code}`);
      setName(""); setDesc("");
      await qc.invalidateQueries({ queryKey: ["my-clubs"] });
      nav({ to: "/klubit/$id", params: { id: club.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Klubin luonti epäonnistui");
    } finally { setBusy(false); }
  }

  async function doJoinCode() {
    if (!/^\d{6}$/.test(code)) { toast.error("Koodi on 6 numeroa"); return; }
    try {
      const res: any = await codeFn({ data: { code } });
      await qc.invalidateQueries({ queryKey: ["my-clubs"] });
      if (res.status === "pending") toast.info("Liittymispyyntö lähetetty");
      else nav({ to: "/klubit/$id", params: { id: res.club_id } });
    } catch (e: any) { toast.error(e?.message ?? "Liittyminen epäonnistui"); }
  }

  async function doJoinPublic(id: string) {
    try {
      const res: any = await joinFn({ data: { club_id: id } });
      await qc.invalidateQueries({ queryKey: ["my-clubs"] });
      if (res.status === "pending") toast.info("Liittymispyyntö lähetetty");
      else nav({ to: "/klubit/$id", params: { id } });
    } catch (e: any) { toast.error(e?.message ?? "Liittyminen epäonnistui"); }
  }

  const mine = mineQ.data ?? [];
  const mineIds = new Set(mine.map((c: any) => c.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Klubit</h1>
      <div className="hairline-red" />

      <section className="card-dark p-4 space-y-2">
        <h2 className="font-display uppercase tracking-widest text-sm text-primary">Omat klubit</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Et ole vielä yhdessäkään klubissa.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((c: any) => (
              <li key={c.id}>
                <Link to="/klubit/$id" params={{ id: c.id }} className="block rounded border border-primary/30 hover:border-primary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display uppercase tracking-widest text-sm">{c.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.role} · {c.members}/50 · #{c.code}</span>
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-dark p-4 space-y-3">
        <h2 className="font-display uppercase tracking-widest text-sm text-primary">Liity koodilla</h2>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-numeroinen koodi"
            className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-sm" />
          <button onClick={doJoinCode} className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest">Liity</button>
        </div>
      </section>

      <section className="card-dark p-4 space-y-3">
        <h2 className="font-display uppercase tracking-widest text-sm text-primary">Etsi julkisia klubeja</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hae nimellä…"
          className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm" />
        <ul className="space-y-2">
          {(searchQ.data ?? []).map((c: any) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-primary/20 p-3">
              <div>
                <div className="font-display uppercase tracking-widest text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.description || "—"} · {c.members}/50{c.require_approval ? " · hyväksyntä" : ""}</div>
              </div>
              {mineIds.has(c.id) ? (
                <Link to="/klubit/$id" params={{ id: c.id }} className="text-[10px] uppercase tracking-widest border border-primary/50 text-primary rounded px-2 py-1">Avaa</Link>
              ) : (
                <button onClick={() => doJoinPublic(c.id)} className="text-[10px] uppercase tracking-widest bg-primary text-primary-foreground rounded px-2 py-1">Liity</button>
              )}
            </li>
          ))}
          {(searchQ.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">Ei tuloksia.</li>}
        </ul>
      </section>

      <section className="card-dark p-4 space-y-3">
        <h2 className="font-display uppercase tracking-widest text-sm text-primary">Luo klubi</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Klubin nimi"
          className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Kuvaus (valinnainen)" rows={2}
          className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm" />
        <div className="flex gap-2 flex-wrap items-center">
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}
            className="bg-black/70 border border-primary/30 rounded p-2 text-xs font-display uppercase tracking-widest">
            <option value="public">Julkinen (haettavissa)</option>
            <option value="code">Vain koodilla</option>
          </select>
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
            Liittymispyynnöt
          </label>
          <button disabled={busy || !name.trim()} onClick={doCreate}
            className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50">
            Luo klubi
          </button>
        </div>
      </section>
    </div>
  );
}
