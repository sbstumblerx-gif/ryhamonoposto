export const AVATAR_PRESETS = ["🏎️", "🏁", "🔥", "🏆", "⚡", "🛞", "🚦", "🥇", "🦊", "🐺", "🦅", "🤖"];

export function avatarIsEmoji(url?: string | null) {
  return !!url && url.startsWith("emoji:");
}

export function Avatar({
  url,
  name,
  size = 32,
  className = "",
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.55) };
  const base = `shrink-0 rounded-full border border-primary/50 bg-black/80 flex items-center justify-center overflow-hidden ${className}`;

  if (avatarIsEmoji(url)) {
    return <span style={style} className={base} aria-hidden>{url!.slice(6)}</span>;
  }
  if (url) {
    return <img src={url} alt={name ? `${name} avatar` : "Avatar"} style={style} className={base} loading="lazy" />;
  }
  return (
    <span style={style} className={`${base} text-primary font-display`} aria-hidden>
      {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
