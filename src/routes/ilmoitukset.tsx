import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listNotifications, markNotificationsRead } from "@/lib/clubs.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ilmoitukset")({
  head: () => ({
    meta: [
      { title: "Ilmoitukset — RyhäMonoposto" },
      { name: "description", content: "Klubien tägäykset, liittymispyynnöt ja viestien poistot yhdessä näkymässä." },
      { property: "og:title", content: "Ilmoitukset — RyhäMonoposto" },
      { property: "og:description", content: "Klubien tägäykset, liittymispyynnöt ja viestien poistot yhdessä näkymässä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationsRead);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications", uid], queryFn: () => listFn(), enabled: !!uid });

  useEffect(() => {
    if (!uid || !q.data) return;
    void markFn().then(() => qc.invalidateQueries({ queryKey: ["notif-count"] }));
  }, [uid, q.data, markFn, qc]);

  if (!uid) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground">Kirjaudu sisään nähdäksesi ilmoitukset.</div>;

  const items = (q.data ?? []) as any[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display uppercase tracking-widest text-2xl text-primary">Ilmoitukset</h1>
      <div className="hairline-red mt-3 mb-4" />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ei ilmoituksia.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`card-dark p-3 ${n.read ? "" : "border-primary"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display uppercase tracking-widest text-sm">{n.title}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("fi-FI")}</span>
              </div>
              {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
              {n.club_id && (
                <Link to="/klubit/$id" params={{ id: n.club_id }} className="text-[10px] uppercase tracking-widest text-primary">
                  Avaa klubi →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
