import { SmartText } from "@/components/SmartText";
import type { EntityIndex } from "@/components/useEntityIndex";

const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

export function NewsContent({ content, entities }: { content: string | null | undefined; entities: EntityIndex }) {
  const text = content ?? "";
  if (!text.trim()) return null;
  const blocks: Array<{ type: "text"; value: string } | { type: "image"; caption: string; url: string }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = IMAGE_RE.exec(text)) !== null) {
    if (match.index > last) blocks.push({ type: "text", value: text.slice(last, match.index) });
    blocks.push({ type: "image", caption: match[1] ?? "", url: match[2] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < text.length) blocks.push({ type: "text", value: text.slice(last) });

  return (
    <div className="space-y-4 text-sm leading-6">
      {blocks.map((block, index) => block.type === "text" ? (
        <SmartText key={index} text={block.value} entities={entities} />
      ) : (
        <figure key={index} className="my-5">
          <img src={block.url} alt={block.caption} className="w-full rounded border border-primary/30 bg-black" />
          {block.caption && <figcaption className="mt-2 text-xs text-muted-foreground italic"><SmartText text={block.caption} entities={entities} /></figcaption>}
        </figure>
      ))}
    </div>
  );
}