import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  clubLeaderboard,
  deleteClubMessage,
  getClub,
  handleJoinRequest,
  leaveClub,
  listClubMessages,
  postClubMessage,
  removeMember,
  setMemberRole,
  toggleReaction,
  updateClub,
} from "@/lib/clubs.functions";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { ClubComposer } from "@/components/ClubComposer";
import { ClubMessageMedia } from "@/components/ClubMessageMedia";
import { ClubTagSettings } from "@/components/ClubTagSettings";

export const Route = createFileRoute("/klubit/$id")({
  head: () => ({
    meta: [
      { title: "Klubi — RyhäMonoposto" },
      { name: "description", content: "Klubichat, jäsenet, asetukset ja klubin veikkauspistetaulukko." },
      { property: "og:title", content: "Klubi — RyhäMonoposto" },
      { property: "og:description", content: "Klubichat, jäsenet, asetukset ja klubin veikkauspistetaulukko." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClubPage,
});

const EMOJIS = ["👍", "🔥", "😂", "🏁", "❤️"];

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

function ClubPage() {
  const { id } = Route.useParams();
  const uid = useUser();
  const nav = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getClub);
  const msgsFn = useServerFn(listClubMessages);
  const postFn = useServerFn(postClubMessage);
  const delMsgFn = useServerFn(deleteClubMessage);
  const reactFn = useServerFn(toggleReaction);
  const roleFn = useServerFn(setMemberRole);
  const removeFn = useServerFn(removeMember);
  const leaveFn = useServerFn(leaveClub);
  const reqFn = useServerFn(handleJoinRequest);
  const lbFn = useServerFn(clubLeaderboard);
  const updateFn = useServerFn(updateClub);

  const [tab, setTab] = useState<"chat" | "info" | "board">("chat");

  const clubQ = useQuery({ queryKey: ["club", id, uid], queryFn: () => getFn({ data: { club_id: id } }), enabled: !!uid });
  const msgsQ = useQuery({
    queryKey: ["club-msgs", id, uid],
    queryFn: () => msgsFn({ data: { club_id: id } }),
    enabled: !!uid && tab === "chat",
    refetchInterval: 5000,
  });
  const lbQ = useQuery({ queryKey: ["club-lb", id, uid], queryFn: () => lbFn({ data: { club_id: id } }), enabled: !!uid && tab === "board" });

  if (!uid) return <div className="mx-auto max-w-4xl px-4 py-8">Kirjaudu sisään nähdäksesi klubin.</div>;
  if (clubQ.isLoading) return <div className="mx-auto max-w-4xl px-4 py-8">Ladataan…</div>;
  if (clubQ.error) return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-3">
      <p className="text-sm text-muted-foreground">{(clubQ.error as any)?.message ?? "Klubia ei löytynyt"}</p>
      <Link to="/klubit" className="text-xs uppercase tracking-widest text-primary">← Klubit</Link>
    </div>
  );

  const data = clubQ.data as any;
  const club = data.club;
  const myRole: "owner" | "moderator" | "member" = data.myRole;
  const isStaff = myRole === "owner" || myRole === "moderator";
  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/klubit/liity/${club.code}`;

  async function send(body: string, media?: { url: string; type: "image" | "audio" | "video"; duration?: number | null } | null) {
    if (!body.trim() && !media) return;
    try {
      await postFn({ data: { club_id: id, body, media: media ?? null } });
      await qc.invalidateQueries({ queryKey: ["club-msgs", id] });
    } catch (err: any) { toast.error(err?.message ?? "Lähetys epäonnistui"); }
  }

  async function act(fn: () => Promise<unknown>, keys: string[][]) {
    try {
      await fn();
      for (const k of keys) await qc.invalidateQueries({ queryKey: k });
    } catch (e: any) { toast.error(e?.message ?? "Toiminto epäonnistui"); }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/klubit" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">← Klubit</Link>
      <h1 className="font-display uppercase tracking-widest text-2xl mt-2">{club.name}</h1>
      <p className="text-xs text-muted-foreground">Koodi #{club.code} · {data.members.length}/50 jäsentä · roolisi: {myRole}</p>
      <div className="hairline-red mt-3 mb-4" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {([["chat", "Klubichat"], ["info", "Tiedot & jäsenet"], ["board", "Pistetaulukko"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-xs font-display uppercase tracking-widest rounded border ${tab === k ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 hover:border-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <section className="card-dark p-4 space-y-3">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {(msgsQ.data ?? []).map((m: any) => (
              <div key={m.id} className="rounded border border-primary/20 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
                    <Avatar url={m.avatar_url} name={m.display_name} size={22} />
                    {m.display_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("fi-FI")}</span>
                    {(isStaff || m.user_id === uid) && (
                      <button onClick={() => act(() => delMsgFn({ data: { message_id: m.id } }), [["club-msgs", id]])}
                        className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">Poista</button>
                    )}
                  </div>
                </div>
                {m.body && <p className="text-sm whitespace-pre-wrap mt-1">{m.body}</p>}
                <ClubMessageMedia url={m.media_url} type={m.media_type} duration={m.media_duration} />
                <div className="flex gap-1 mt-2 flex-wrap">
                  {EMOJIS.map((e) => {
                    const hit = m.reactions.find((r: any) => r.emoji === e);
                    return (
                      <button key={e} onClick={() => act(() => reactFn({ data: { message_id: m.id, emoji: e } }), [["club-msgs", id]])}
                        className={`text-xs rounded border px-1.5 py-0.5 ${hit?.mine ? "border-primary bg-primary/20" : "border-primary/20 hover:border-primary/60"}`}>
                        {e}{hit ? ` ${hit.count}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {(msgsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Ei viestejä vielä.</p>}
          </div>
          <ClubComposer onSend={send} />
        </section>
      )}

      {tab === "info" && (
        <div className="space-y-4">
          <section className="card-dark p-4 space-y-3">
            <h2 className="font-display uppercase tracking-widest text-sm text-primary">Tiedot</h2>
            {myRole === "owner" ? (
              <>
                <input defaultValue={club.name} onBlur={(e) => e.target.value.trim() && e.target.value !== club.name &&
                  act(() => updateFn({ data: { club_id: id, name: e.target.value.trim() } }), [["club", id]])}
                  className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm" />
                <textarea defaultValue={club.description} rows={2} onBlur={(e) => e.target.value !== club.description &&
                  act(() => updateFn({ data: { club_id: id, description: e.target.value } }), [["club", id]])}
                  className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm" />
                <div className="flex gap-2 flex-wrap items-center">
                  <select defaultValue={club.visibility} onChange={(e) =>
                    act(() => updateFn({ data: { club_id: id, visibility: e.target.value as any } }), [["club", id]])}
                    className="bg-black/70 border border-primary/30 rounded p-2 text-xs font-display uppercase tracking-widest">
                    <option value="public">Julkinen</option>
                    <option value="code">Vain koodilla</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <input type="checkbox" defaultChecked={club.require_approval}
                      onChange={(e) => act(() => updateFn({ data: { club_id: id, require_approval: e.target.checked } }), [["club", id]])} />
                    Liittymispyynnöt
                  </label>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">{club.description || "Ei kuvausta."}</p>
                <p className="text-xs text-muted-foreground">{club.visibility === "public" ? "Julkinen klubi" : "Vain koodilla"}</p>
              </>
            )}
          </section>

          {myRole === "owner" && (
            <ClubTagSettings clubId={id} tag={club.tag ?? ""} emoji={club.tag_emoji ?? ""} enabled={!!club.tag_enabled}
              onSaved={() => qc.invalidateQueries({ queryKey: ["club", id] })} />
          )}

          <section className="card-dark p-4 space-y-2">
            <h2 className="font-display uppercase tracking-widest text-sm text-primary">Kutsulinkki</h2>
            <p className="text-xs text-muted-foreground">Jaa tämä linkki — sen avaaja näkee klubin tiedot ja voi liittyä{club.require_approval ? " tai lähettää liittymispyynnön" : ""}.</p>
            <div className="flex gap-2 items-center">
              <input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-xs" />
              <button onClick={async () => {
                try { await navigator.clipboard.writeText(inviteUrl); toast.success("Kutsulinkki kopioitu"); }
                catch { toast.error("Kopiointi epäonnistui"); }
              }} className="bg-primary text-primary-foreground rounded px-3 py-2 text-[10px] uppercase tracking-widest">Kopioi</button>
            </div>
          </section>

          {isStaff && data.requests.length > 0 && (
            <section className="card-dark p-4 space-y-2">
              <h2 className="font-display uppercase tracking-widest text-sm text-primary">Liittymispyynnöt</h2>
              {data.requests.map((r: any) => (
                <div key={r.user_id} className="flex items-center justify-between gap-2 border border-primary/20 rounded p-2">
                  <span className="text-sm">{r.display_name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => act(() => reqFn({ data: { club_id: id, user_id: r.user_id, approve: true } }), [["club", id]])}
                      className="text-[10px] uppercase tracking-widest bg-primary text-primary-foreground rounded px-2 py-1">Hyväksy</button>
                    <button onClick={() => act(() => reqFn({ data: { club_id: id, user_id: r.user_id, approve: false } }), [["club", id]])}
                      className="text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1">Hylkää</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="card-dark p-4 space-y-2">
            <h2 className="font-display uppercase tracking-widest text-sm text-primary">Jäsenet ({data.members.length}/50)</h2>
            {data.members.map((m: any) => (
              <div key={m.user_id} className="flex items-center justify-between gap-2 border border-primary/20 rounded p-2">
                <span className="text-sm">{m.display_name} <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.role}</span></span>
                <div className="flex gap-2">
                  {myRole === "owner" && m.role !== "owner" && (
                    <button onClick={() => act(() => roleFn({ data: { club_id: id, user_id: m.user_id, role: m.role === "moderator" ? "member" : "moderator" } }), [["club", id]])}
                      className="text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1">
                      {m.role === "moderator" ? "Poista mod" : "Tee modiksi"}
                    </button>
                  )}
                  {isStaff && m.role !== "owner" && m.user_id !== uid && (
                    <button onClick={() => act(() => removeFn({ data: { club_id: id, user_id: m.user_id } }), [["club", id]])}
                      className="text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1">Poista</button>
                  )}
                </div>
              </div>
            ))}
            {myRole !== "owner" && (
              <button onClick={async () => {
                if (!confirm("Poistutaanko klubista?")) return;
                await act(() => leaveFn({ data: { club_id: id } }), [["my-clubs"]]);
                nav({ to: "/klubit" });
              }} className="text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1 mt-2">
                Poistu klubista
              </button>
            )}
          </section>
        </div>
      )}

      {tab === "board" && (
        <section className="card-dark p-4">
          <h2 className="font-display uppercase tracking-widest text-sm text-primary mb-2">Pistetaulukko (kaikkien aikojen)</h2>
          <ol className="space-y-1">
            {(lbQ.data ?? []).map((r: any) => (
              <li key={r.user_id} className={`flex justify-between text-sm border rounded px-2 py-1 ${r.user_id === uid ? "border-primary bg-primary/10" : "border-primary/20"}`}>
                <span>{r.rank}. {r.display_name}</span>
                <span className="text-primary">{r.points} p</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
