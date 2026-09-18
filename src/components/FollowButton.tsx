import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyFollows, toggleFollow } from "@/lib/follows.functions";

export function FollowButton({ kind, slug, name }: { kind: "driver" | "team"; slug: string; name: string }) {
  const listFn = useServerFn(listMyFollows);
  const toggleFn = useServerFn(toggleFollow);
  const [uid, setUid] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) setUid(data.user?.id ?? null); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!uid) { setOn(false); return; }
    listFn().then((rows: any[]) => {
      if (alive) setOn(rows.some(r => r.entity_type === kind && r.entity_slug === slug));
    }).catch(() => {});
    return () => { alive = false; };
  }, [uid, kind, slug, listFn]);

  async function click() {
    if (!uid) { toast.error("Kirjaudu sisään ottaaksesi roolin"); return; }
    setBusy(true);
    try {
      const r: any = await toggleFn({ data: { entity_type: kind, entity_slug: slug } });
      setOn(!!r.following);
      toast.success(r.following ? `Otit roolin: ${name}` : `Rooli poistettu: ${name}`);
    } catch (e: any) { toast.error(e?.message ?? "Toiminto epäonnistui"); }
    finally { setBusy(false); }
  }

  return (
    <button onClick={click} disabled={busy} aria-label={on ? "Poista rooli" : "Ota rooli"}
      className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] font-display uppercase tracking-widest disabled:opacity-50 ${on ? "border-primary bg-primary/20 text-primary" : "border-primary/40 hover:border-primary"}`}>
      <span className="text-sm leading-none">{on ? "❤️" : "🤍"}</span>
      {on ? "Rooli otettu" : "Ota rooli"}
    </button>
  );
}
