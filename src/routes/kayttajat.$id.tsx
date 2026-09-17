import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/kayttajat/$id")({
  head: () => ({ meta: [{ title: "Käyttäjä — RyhäMonoposto" }] }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from("profiles").select("display_name, avatar_url").eq("id", id).maybeSingle().then(({ data }) => {
      if (!alive) return;
      setProfile(data ?? null);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [id]);

  if (!loaded) return <main className="mx-auto max-w-3xl px-4 py-8 text-muted-foreground">Ladataan käyttäjää…</main>;
  if (!profile) return <main className="mx-auto max-w-3xl px-4 py-8 space-y-4"><h1 className="font-display uppercase tracking-widest text-primary text-2xl">Käyttäjää ei löytynyt</h1><Link to="/" className="text-sm underline">Takaisin etusivulle</Link></main>;

  return <main className="mx-auto max-w-3xl px-4 py-8"><div className="card-dark p-6 flex items-center gap-4"><div className="h-16 w-16 rounded-full overflow-hidden border border-primary/40 bg-black flex items-center justify-center text-2xl">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : "👤"}</div><div><h1 className="font-display uppercase tracking-widest text-primary text-2xl">{profile.display_name || "Vierailija"}</h1><p className="text-sm text-muted-foreground mt-1">RyhäMonoposto-käyttäjä</p></div></div></main>;
}
