import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DuelPanel } from "@/components/DuelPanel";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/pelaa")({
  head: () => ({ meta: [{ title: "Pelaa — RyhäMonoposto" }] }),
  component: PlayPage,
});

function useUser() {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUid(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return uid;
}

function PlayPage() {
  const uid = useUser();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {!uid ? (
        <div className="card-dark p-6 border-l-2 border-primary">
          <div className="text-2xl mb-2">🎮</div>
          <h1 className="font-display uppercase tracking-widest text-primary text-xl">Pelaa</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Kirjaudu sisään pelataksesi TGC-otteluita ja nähdäksesi oman pelitilastosi.
          </p>
          <button
            onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/pelaa" })}
            className="mt-4 rounded bg-primary text-primary-foreground text-xs font-display uppercase tracking-widest px-4 py-2"
          >
            Kirjaudu
          </button>
        </div>
      ) : (
        <DuelPanel uid={uid} />
      )}
    </main>
  );
}
