import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ClubTagBadge({ tag, emoji, clubId }: { tag?: string | null; emoji?: string | null; clubId?: string | null }) {
  if (!tag || !clubId) return null;
  return (
    <Link to="/klubitunniste/$tag" params={{ tag }} className="inline-flex items-center gap-0.5 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/20" title="Esikatsele klubia" onClick={(e) => e.stopPropagation()}>
      {emoji ? `${emoji} ` : ""}{tag}
    </Link>
  );
}

export function UserClubTagBadge({ userId }: { userId?: string | null }) {
  const [tag, setTag] = useState<{ tag: string; emoji: string | null; clubId: string } | null>(null);
  useEffect(() => {
    let alive = true;
    if (!userId) return;
    (async () => {
      const { data: p } = await (supabase as any).from("profiles").select("club_tag_club_id").eq("id", userId).maybeSingle();
      if (!p?.club_tag_club_id) return;
      const { data: c } = await (supabase as any).from("clubs").select("id, tag, tag_emoji, tag_enabled").eq("id", p.club_tag_club_id).eq("tag_enabled", true).maybeSingle();
      if (alive && c?.tag) setTag({ tag: c.tag, emoji: c.tag_emoji ?? null, clubId: c.id });
    })();
    return () => { alive = false; };
  }, [userId]);
  return <ClubTagBadge tag={tag?.tag} emoji={tag?.emoji} clubId={tag?.clubId} />;
}
