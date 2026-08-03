import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { previewClubByCode, joinByCode, myClubMembership } from "@/lib/clubs.functions";

export const Route = createFileRoute("/klubit/liity/$code")({
  head: () => ({
    meta: [
      { title: "Klubikutsu — RyhäMonoposto" },
      { name: "description", content: "Katso klubin tiedot ja liity mukaan tai lähetä liittymispyyntö RyhäMonoposto-sarjan klubiin." },
      { property: "og:title", content: "Klubikutsu — RyhäMonoposto" },
      { property: "og:description", content: "Katso klubin tiedot ja liity mukaan tai lähetä liittymispyyntö RyhäMonoposto-sarjan klubiin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const nav = useNavigate();
  const previewFn = useServerFn(previewClubByCode);
  const joinFn = useServerFn(joinByCode);
  const memFn = useServerFn(myClubMembership);

  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const clubQ = useQuery({ queryKey: ["club-invite", code], queryFn: () => previewFn({ data: { code } }) });
  const club = clubQ.data as any;
  const memQ = useQuery({
    queryKey: ["club-invite-mem", club?.id, uid],
    queryFn: () => memFn({ data: { club_id: club.id } }),
    enabled: !!uid && !!club?.id,
  });
  const mem = memQ.data as any;

  async function join() {
    if (busy) return;
    setBusy(true);
    try {
      const res: any = await joinFn({ data: { code } });
      if (res.status === "pending") toast.info("Liittymispyyntö lähetetty");
      else nav({ to: "/klubit/$id", params: { id: res.club_id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Liittyminen epäonnistui");
    } finally { setBusy(false); }
  }

  if (clubQ.isLoading) return <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Ladataan…</div>;
  if (clubQ.error || !club) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 space-y-3 text-center">
        <h1 className="font-display uppercase tracking-widest text-xl text-primary">Kutsua ei löytynyt</h1>
        <div className="hairline-red" />
        <p className="text-sm text-muted-foreground">{(clubQ.error as any)?.message ?? "Linkki on virheellinen."}</p>
        <Link to="/klubit" className="text-xs uppercase tracking-widest text-primary">← Klubit</Link>
      </div>
    );
  }

  const full = club.members >= club.max_members;

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-5">
      <Link to="/klubit" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">← Klubit</Link>
      <section className="card-dark p-5 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Klubikutsu</div>
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary">{club.name}</h1>
        <div className="hairline-red" />
        <p className="text-sm">{club.description || "Ei kuvausta."}</p>
        <p className="text-xs text-muted-foreground">
          {club.members}/{club.max_members} jäsentä · koodi #{club.code}
          {club.require_approval ? " · liittyminen vaatii hyväksynnän" : ""}
        </p>

        {!uid ? (
          <button
            onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + `/klubit/liity/${code}` })}
            className="rounded bg-white text-black text-sm font-display uppercase tracking-widest px-4 py-2"
          >
            Kirjaudu Googlella liittyäksesi
          </button>
        ) : mem?.role ? (
          <Link to="/klubit/$id" params={{ id: club.id }} className="inline-block bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest">
            Avaa klubi
          </Link>
        ) : mem?.pending ? (
          <p className="text-xs uppercase tracking-widest text-primary">Liittymispyyntö odottaa hyväksyntää</p>
        ) : full ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Klubi on täynnä</p>
        ) : (
          <button
            disabled={busy}
            onClick={join}
            className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50"
          >
            {club.require_approval ? "Lähetä liittymispyyntö" : "Liity klubiin"}
          </button>
        )}
      </section>
    </div>
  );
}
