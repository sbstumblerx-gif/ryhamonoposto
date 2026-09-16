// Automatic statistics: every driver/team stat is derived from race result lists
// and the two per-race awards stored on the race itself.

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
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").trim();
}

const STATUS_RE = /\b(DNF|DSQ|DQ|DNS)\b/i;

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

/**
 * Extracts a season year from an event/race name.
 *
 * Race names are normally written like "Kiina 2026", but this deliberately
 * accepts common separators and formatting such as "Kiina - 2026", "2026 —
 * Kiina", "R14/2026" and "Kiina (2026)". Only a four-digit year in the
 * supported 20xx range is considered a season; unrelated numbers in a name
 * are ignored.
 */
export function seasonYearFromName(name: string | null | undefined): number | null {
  if (!name) return null;
  const normalized = name
    .normalize("NFKC")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[⁄∕]/g, "/")
    .trim();

  // Prefer a standalone 20xx token. Word boundaries alone are unreliable
  // around names containing punctuation, so explicitly exclude digits around it.
  const matches = [...normalized.matchAll(/(?<!\d)(20\d{2})(?!\d)/g)]
    .map((m) => Number(m[1]))
    .filter((year) => year >= 2000 && year <= 2099);

  if (matches.length === 0) return null;

  // If a name somehow contains more than one year, the first explicit year is
  // the event season. This keeps the result deterministic instead of depending
  // on lexical sorting or database order.
  return matches[0] ?? null;
}

export function countryFromRaceName(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/(?<!\d)20\d{2}(?!\d)/g, "").replace(/\s+/g, " ").trim();
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
  driverOfTheDay: number;
  fastestLaps: number;
  dnf: number;
  dsq: number;
  dns: number;