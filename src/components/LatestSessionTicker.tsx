import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLatestSessionResult } from "@/lib/content.functions";

export function LatestSessionTicker() {
  const get = useServerFn(getLatestSessionResult);
  const q = useQuery({ queryKey: ["latest-session-result"], queryFn: () => get(), staleTime: 30_000 });
  const session = q.data;
  if (!session) return null;
  const line = `${session.label}: ${session.summary}`;
  return (
    <div className="border-b border-primary/30 bg-primary/10 overflow-hidden">
      <Link to="/kilpailut/$slug" params={{ slug: session.slug }} className="block py-2 font-display uppercase tracking-widest text-[11px] text-primary hover:text-primary-foreground">
        <div className="ticker-track flex w-max gap-8 whitespace-nowrap">
          <span>{line}</span>
          <span aria-hidden="true">{line}</span>
          <span aria-hidden="true">{line}</span>
          <span aria-hidden="true">{line}</span>
        </div>
      </Link>
    </div>
  );
}