import type { ReactNode } from "react";

/**
 * Story-style ring around a race bubble.
 * - unseen highlights: red/purple gradient ring
 * - all seen: grey dashed ring
 * - no highlights: no ring at all
 */
export function HighlightRing({ state, children, className = "" }: { state: "none" | "unseen" | "seen"; children: ReactNode; className?: string }) {
  if (state === "none") return <>{children}</>;
  if (state === "seen") {
    return (
      <span className={`inline-flex rounded-full p-[3px] border-2 border-dashed border-muted-foreground/50 ${className}`}>
        {children}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex rounded-full p-[3px] ${className}`}
      style={{ background: "conic-gradient(from 210deg, #ff2a2a, #a21caf, #6d28d9, #ff2a2a)" }}
    >
      <span className="inline-flex rounded-full bg-black p-[2px]">{children}</span>
    </span>
  );
}
