import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

type Entity = { slug: string; name: string; kind: "driver" | "team" };

/**
 * Renders text and turns any occurrence of a known driver/team name into a link
 * to the corresponding profile.
 */
export function SmartText({
  text,
  entities,
  className,
}: {
  text: string | null | undefined;
  entities: Entity[];
  className?: string;
}) {
  const parts = useMemo(() => tokenize(text ?? "", entities), [text, entities]);
  if (!text) return null;
  return (
    <div className={className}>
      {parts.map((p, i) => {
        if (p.type === "text") {
          return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p.value}</span>;
        }
        const to = p.kind === "driver" ? "/kuljettajat/$slug" : "/tiimit/$slug";
        return (
          <Link
            key={i}
            to={to}
            params={{ slug: p.slug }}
            className="text-primary hover:underline font-semibold"
          >
            {p.value}
          </Link>
        );
      })}
    </div>
  );
}

type Token =
  | { type: "text"; value: string }
  | { type: "link"; kind: "driver" | "team"; slug: string; value: string };

function tokenize(text: string, entities: Entity[]): Token[] {
  if (!entities.length || !text) return [{ type: "text", value: text }];
  // Sort by length desc so longer names match first ("Sebastian Steiner" before "Sebastian")
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length);
  const escaped = sorted.map(e => escapeRegex(e.name)).join("|");
  const re = new RegExp(`(${escaped})`, "gi");
  const tokens: Token[] = [];
  let lastIdx = 0;
  const nameLookup = new Map(sorted.map(e => [e.name.toLowerCase(), e] as const));
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) tokens.push({ type: "text", value: text.slice(lastIdx, m.index) });
    const match = m[0];
    const ent = nameLookup.get(match.toLowerCase());
    if (ent) {
      tokens.push({ type: "link", kind: ent.kind, slug: ent.slug, value: match });
    } else {
      tokens.push({ type: "text", value: match });
    }
    lastIdx = m.index + match.length;
  }
  if (lastIdx < text.length) tokens.push({ type: "text", value: text.slice(lastIdx) });
  return tokens;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
