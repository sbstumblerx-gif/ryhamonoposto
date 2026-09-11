import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getClubByTag, joinClubByTag } from "@/lib/club-tags.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
export const Route = createFileRoute("/klubitunniste/$tag")({ component: ClubTagPreview });
function ClubTagPreview() {
  const { tag } = Route.useParams(); const getFn = useServerFn(getClubByTag); const joinFn = useServerFn(joinClubByTag);
  const [uid, setUid] = useState<string | null>(null); const q = useQuery({ queryKey: ["club-tag", tag], queryFn: () => getFn({ data: { tag } }) });
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  if (q.isLoading) return <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Ladataan klubia…</div>;
  if (q.error) return <div className="mx-auto max-w-md px-4 py-10 space-y-3"><h1 className="font-display uppercase tracking-widest text-xl text-primary">Klubitunnistetta ei löytynyt</h1><p className="text-sm text-muted-foreground">Tunniste ei ole käytössä tai sitä ei ole olemassa.</p><Link to="/klubit" className="text-xs uppercase tracking-widest text-primary">← Klubit</Link></div>;
  const club = q.data as any;
  async function join() {
    if (!uid) { await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href }); return; }
    try { const result = await joinFn({ data: { tag } }); toast.success(result.status === "pending" ? "Liittymispyyntö lähetetty" : "Liityit klubiin"); }
    catch (e: any) { toast.error(e?.message ?? "Liittyminen epäonnistui"); }
  }
  return <div className="mx-auto max-w-md px-4 py-10"><div className="card-dark p-5 space-y-4"><div className="text-4xl">{club.tag_emoji || "🏷️"}</div><div><div className="font-display text-2xl uppercase tracking-widest">{club.tag}</div><h1 className="font-display uppercase tracking-widest text-lg mt-1">{club.name}</h1></div><div className="hairline-red" /><p className="text-sm text-muted-foreground">{club.description || "Ei kuvausta."}</p><p className="text-xs text-muted-foreground">{club.members}/{club.max_members} jäsentä · {club.require_approval ? "Liittyminen vaatii hyväksynnän" : "Vapaa liittyminen"}</p><button onClick={() => void join()} className="w-full bg-primary text-primary-foreground rounded px-4 py-3 text-xs font-display uppercase tracking-widest">{club.require_approval ? "Lähetä liittymispyyntö" : "Liity klubiin"}</button><Link to="/klubit" className="block text-center text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">← Takaisin klubeihin</Link></div></div>;
}
