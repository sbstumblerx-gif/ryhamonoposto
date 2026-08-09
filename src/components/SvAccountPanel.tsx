import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { sv, SV_APP_ID, SV_DATA_TABLE } from "@/integrations/sv/client";
import { svGetPayload, svLinkAccount, svUnlinkAccount } from "@/lib/sv.functions";

type SvUser = { id: string; email?: string | null } | null;

export function SvAccountPanel() {
  const payloadFn = useServerFn(svGetPayload);
  const linkFn = useServerFn(svLinkAccount);
  const unlinkFn = useServerFn(svUnlinkAccount);

  const [svUser, setSvUser] = useState<SvUser>(null);
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [friends, setFriends] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    sv.auth.getUser().then(({ data }) => { if (alive) setSvUser(data.user ? { id: data.user.id, email: data.user.email } : null); });
    const { data: sub } = sv.auth.onAuthStateChange((_e, s) => {
      setSvUser(s?.user ? { id: s.user.id, email: s.user.email } : null);
    });
    payloadFn().then((p: any) => { if (alive) setLinked(!!p?.link?.sv_user_id); }).catch(() => {});
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [payloadFn]);

  const syncData = useCallback(async (svUserId: string) => {
    const p: any = await payloadFn();
    const { error } = await sv.from(SV_DATA_TABLE).upsert({
      user_id: svUserId,
      profile_name: p.profile_name,
      cards: p.cards,
      card_count: p.card_count,
      betting_points: p.betting_points,
    }, { onConflict: "user_id" });
    if (error) throw error;
    await sv.from("app_links")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", svUserId).eq("app", SV_APP_ID);
    return p;
  }, [payloadFn]);

  async function signIn() {
    setBusy(true);
    try {
      const { error } = await sv.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Kirjauduttu SV Accountiin");
    } catch (e: any) {
      toast.error(e?.message ?? "Kirjautuminen epäonnistui");
    } finally { setBusy(false); }
  }

  async function signInGoogle() {
    try {
      const { error } = await sv.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/profiili" },
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e?.message ?? "Google-kirjautuminen epäonnistui");
    }
  }

  async function connect() {
    if (!svUser) return;
    setBusy(true);
    try {
      const p: any = await payloadFn();
      const { error } = await sv.from("app_links").upsert(
        { user_id: svUser.id, app: SV_APP_ID, app_username: p.profile_name },
        { onConflict: "user_id,app" },
      );
      if (error) throw error;
      const res: any = await linkFn({ data: { sv_user_id: svUser.id } });
      await syncData(svUser.id);
      setLinked(true);
      toast.success(res?.rewarded ? "SV Account yhdistetty — sait 3 kortin pakan!" : "SV Account yhdistetty");
    } catch (e: any) {
      toast.error(e?.message ?? "Yhdistäminen epäonnistui");
    } finally { setBusy(false); }
  }

  async function syncNow() {
    if (!svUser) return;
    setBusy(true);
    try {
      await syncData(svUser.id);
      toast.success("Tiedot synkronoitu SV Accountiin");
    } catch (e: any) {
      toast.error(e?.message ?? "Synkronointi epäonnistui");
    } finally { setBusy(false); }
  }

  async function disconnect() {
    if (!svUser) return;
    setBusy(true);
    try {
      await sv.from("app_links").delete().eq("user_id", svUser.id).eq("app", SV_APP_ID);
      await unlinkFn();
      setLinked(false);
      setFriends(null);
      toast.success("Yhteys katkaistu");
    } catch (e: any) {
      toast.error(e?.message ?? "Katkaisu epäonnistui");
    } finally { setBusy(false); }
  }

  async function loadFriends() {
    if (!svUser) return;
    setBusy(true);
    try {
      const { data: f } = await sv.from("friendships").select("friend_id").eq("user_id", svUser.id);
      const ids = (f ?? []).map((x: any) => x.friend_id);
      if (!ids.length) { setFriends([]); return; }
      const { data: inGame } = await sv.from("app_links")
        .select("user_id, app_username").eq("app", SV_APP_ID).in("user_id", ids);
      setFriends((inGame ?? []).map((x: any) => x.app_username ?? x.user_id));
    } catch (e: any) {
      toast.error(e?.message ?? "Kavereiden haku epäonnistui");
    } finally { setBusy(false); }
  }

  return (
    <section className="card-dark p-4 space-y-4">
      <div>
        <h2 className="font-display uppercase tracking-widest text-sm text-primary">SV Account</h2>
        <p className="text-[11px] text-muted-foreground mt-1">
          Yhdistä SV Account, niin korttisi ja veikkauspisteesi siirtyvät SV-järjestelmään. Ensimmäisestä
          yhdistämisestä saat 3 kortin pakan.
        </p>
      </div>

      {!svUser ? (
        <div className="space-y-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="SV-sähköposti"
            className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Salasana"
            className="w-full bg-black/70 border border-primary/30 rounded p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => void signIn()}
              className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50"
            >
              Kirjaudu SV Accountiin
            </button>
            <button
              disabled={busy}
              onClick={() => void signInGoogle()}
              className="border border-primary/40 rounded px-4 py-2 text-xs font-display uppercase tracking-widest"
            >
              Google
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            SV-tili: <span className="text-foreground">{svUser.email ?? svUser.id}</span>
            {linked && <span className="ml-2 text-primary">· yhdistetty</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {!linked ? (
              <button
                disabled={busy}
                onClick={() => void connect()}
                className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50"
              >
                Yhdistä SV Account
              </button>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={() => void syncNow()}
                  className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50"
                >
                  Synkronoi nyt
                </button>
                <button
                  disabled={busy}
                  onClick={() => void loadFriends()}
                  className="border border-primary/40 rounded px-4 py-2 text-xs font-display uppercase tracking-widest"
                >
                  Näytä kaverit
                </button>
                <button
                  disabled={busy}
                  onClick={() => void disconnect()}
                  className="border border-primary/40 rounded px-4 py-2 text-xs font-display uppercase tracking-widest"
                >
                  Katkaise yhteys
                </button>
              </>
            )}
            <button
              disabled={busy}
              onClick={() => void sv.auth.signOut()}
              className="border border-primary/20 rounded px-4 py-2 text-xs font-display uppercase tracking-widest text-muted-foreground"
            >
              Kirjaudu ulos SV:stä
            </button>
          </div>

          {friends && (
            <div className="text-xs text-muted-foreground">
              {friends.length === 0
                ? "Yksikään kavereistasi ei ole vielä linkittänyt RyhäMonopostoa."
                : `Kaverit pelissä: ${friends.join(", ")}`}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
