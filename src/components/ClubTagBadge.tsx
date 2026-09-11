import { Link } from "@tanstack/react-router";

export function ClubTagBadge({ tag, emoji, clubId }: { tag?: string | null; emoji?: string | null; clubId?: string | null }) {
  if (!tag || !clubId) return null;
  return (
    <Link
      to="/klubitunniste/$tag"
      params={{ tag }}
      className="inline-flex items-center gap-0.5 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/20"
      title="Esikatsele klubia"
      onClick={(e) => e.stopPropagation()}
    >
      {emoji ? `${emoji} ` : ""}{tag}
    </Link>
  );
}
