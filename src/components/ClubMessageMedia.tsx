export function ClubMessageMedia({
  url,
  type,
  duration,
}: {
  url?: string | null;
  type?: string | null;
  duration?: number | null;
}) {
  if (!url) return null;

  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mt-2">
        <img src={url} alt="Viestin liite" loading="lazy" className="max-h-72 rounded border border-primary/30" />
      </a>
    );
  }
  if (type === "audio") {
    return (
      <div className="mt-2 flex items-center gap-2">
        <audio src={url} controls className="w-full max-w-xs h-9" />
        {duration ? <span className="text-[10px] text-muted-foreground">{duration}s</span> : null}
      </div>
    );
  }
  if (type === "video") {
    return <video src={url} controls className="mt-2 max-h-72 rounded border border-primary/30" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline">
      Avaa liite
    </a>
  );
}
