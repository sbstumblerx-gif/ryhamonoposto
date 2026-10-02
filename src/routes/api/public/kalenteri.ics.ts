import { createFileRoute } from "@tanstack/react-router";
import { loadSessions, SESSION_TYPES } from "@/lib/calendar.functions";

function esc(s: string) { return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
function nextDay(d: string) { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10).replace(/-/g, ""); }

export const Route = createFileRoute("/api/public/kalenteri/ics")({
  server: {
    handlers: {
      GET: async () => {
        const sessions = await loadSessions();
        const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
        const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RyhaMonoposto//Kalenteri//FI", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:RyhäMonoposto", "X-WR-TIMEZONE:Europe/Helsinki"];
        for (const s of sessions) {
          if (!s.race) continue;
          const round = s.race.round_number != null ? (s.race.round_number === 0 ? "Talvitestit · " : `R${s.race.round_number} · `) : "";
          lines.push("BEGIN:VEVENT", `UID:${s.id}@ryhamonoposto`, `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${s.session_date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${nextDay(s.session_date)}`,
            `SUMMARY:${esc(`${s.race.flag} ${round}${s.race.name} – ${SESSION_TYPES[s.session_type]}`)}`,
            `DESCRIPTION:${esc(`${SESSION_TYPES[s.session_type]} – ${s.race.name}\nhttps://ryhamonoposto.lovable.app/kilpailut`)}`,
            "URL:https://ryhamonoposto.lovable.app/kilpailut", "TRANSP:TRANSPARENT", "END:VEVENT");
        }
        lines.push("END:VCALENDAR");
        return new Response(lines.join("\r\n") + "\r\n", { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=900" } });
      },
    },
  },
});
