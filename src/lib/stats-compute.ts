// Automatic statistics: every driver/team stat is derived from the result lists
// written into each race's qualifying/race session text. Nothing is stored — the
// numbers recompute whenever a session is added or edited.

export const POINTS_BY_POSITION = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export function pointsForPosition(pos: number | null): number {
  if (!pos || pos < 1 || pos > POINTS_BY_POSITION.length) return 0;
  return POINTS_BY_POSITION[pos - 1] ?? 0;
}

export type ResultStatus = "FIN" | "DNF" | "DSQ" | "DNS";

export type ResultLine = {
  position: number | null;
  status: ResultStatus;
  driver: string;
  team: string | null;
};

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const STATUS_RE = /\b(DNF|DSQ|DQ|DNS)\b/i;

/** Parses "1. Kuljettaja - Tiimi" lines. Accepts DNF/DSQ/DNS in place of the
 *  position or as a suffix marker. Markdown images and other prose are ignored. */
export function parseResultLines(text: string | null | undefined): ResultLine[] {
  if (!text) return [];
  const out: ResultLine[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").trim();
    if (!line) continue;

    const m = /^(\d{1,2}|DNF|DSQ|DQ|DNS)\s*[.)\-:]\s*(.+)$/i.exec(line);
    if (!m) continue;
    const head = (m[1] ?? "").toUpperCase();
    let rest = (m[2] ?? "").trim();

    let status: ResultStatus = "FIN";
    let position: number | null = null;
    if (/^\d+$/.test(head)) position = Number(head);
    else status = head === "DQ" ? "DSQ" : (head as ResultStatus);

    const suffix = STATUS_RE.exec(rest);
    if (suffix) {
      const s = (suffix[1] ?? "").toUpperCase();
      status = s === "DQ" ? "DSQ" : (s as ResultStatus);
      rest = rest.replace(STATUS_RE, "").replace(/[()\[\]{}]/g, " ").trim();
    }
    if (status !== "FIN") position = null;

    const parts = rest.split(/\s+[-–—]\s+/);
    const driver = (parts[0] ?? "").replace(/[*_`]/g, "").trim();
    const team = parts.length > 1 ? (parts.slice(1).join(" - ").replace(/[*_`]/g, "").trim() || null) : null;
    if (!driver) continue;
    out.push({ position, status, driver, team });
  }
  return out;
}

/** "Kiina 2025" -> 2025 */
export function seasonYearFromName(name: string | null | undefined): number | null {
  if (!name) return null;
  const m = /\b(20\d{2})\b/.exec(name);
  return m ? Number(m[1]) : null;
}

/** "Kiina 2025" -> "Kiina" (used for the country/track filter) */
export function countryFromRaceName(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/\b20\d{2}\b/g, "").replace(/\s+/g, " ").trim();
}

export type StatLine = {
  key: string;
  slug: string | null;
  name: string;
  flag: string;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  dnf: number;
  dsq: number;
  dns: number;
  ret: number;
  starts: number;
  best: number | null;
};

export function emptyStatLine(key: string, name: string, slug: string | null, flag: string): StatLine {
  return { key, slug, name, flag, points: 0, wins: 0, podiums: 0, poles: 0, dnf: 0, dsq: 0, dns: 0, ret: 0, starts: 0, best: null };
}

export function applyResult(line: StatLine, r: { position: number | null; status: ResultStatus }, session: "qualifying" | "race") {
  if (session === "qualifying") {
    if (r.status === "FIN" && r.position === 1) line.poles += 1;
    return;
  }
  line.starts += 1;
  if (r.status === "DNF") { line.dnf += 1; line.ret += 1; return; }
  if (r.status === "DSQ") { line.dsq += 1; line.ret += 1; return; }
  if (r.status === "DNS") { line.dns += 1; line.ret += 1; line.starts -= 1; return; }
  line.points += pointsForPosition(r.position);
  if (r.position === 1) line.wins += 1;
  if (r.position != null && r.position <= 3) line.podiums += 1;
  if (r.position != null && (line.best == null || r.position < line.best)) line.best = r.position;
}

export function sortStandings(rows: StatLine[]): StatLine[] {
  return [...rows].sort((a, b) =>
    b.points - a.points || b.wins - a.wins || b.podiums - a.podiums || a.name.localeCompare(b.name));
}
