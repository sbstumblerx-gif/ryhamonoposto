export const TEAM_COLORS: Record<string, string> = {
  red: "#ef2929",
  green: "#22c55e",
  yellow: "#facc15",
  darkblue: "#1e3a8a",
  gray: "#94a3b8",
  darkred: "#7f1d1d",
  darkgreen: "#14532d",
  cyan: "#06b6d4",
  blue: "#2563eb",
};

export const TEAM_COLOR_OPTIONS: { key: string; label: string }[] = [
  { key: "red", label: "Punainen" },
  { key: "green", label: "Vihreä" },
  { key: "yellow", label: "Keltainen" },
  { key: "darkblue", label: "Tummansininen" },
  { key: "gray", label: "Harmaa" },
  { key: "darkred", label: "Tummanpunainen" },
  { key: "darkgreen", label: "Tummanvihreä" },
  { key: "cyan", label: "Syaani" },
  { key: "blue", label: "Sininen" },
];

export function colorFor(key: string | null | undefined): string {
  if (!key) return "#ef2929";
  if (key.startsWith("#")) return key;
  return TEAM_COLORS[key] ?? "#ef2929";
}

export function gradientFor(key: string | null | undefined): string {
  const c = colorFor(key);
  return `linear-gradient(135deg, #000 0%, #000 30%, ${c} 100%)`;
}
