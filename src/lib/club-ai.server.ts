// Club chat AI participant. Tagging @ai invites it, @aioff removes it.
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, any, any>;

export const AI_NAME = "RyhäAI";

export function mentionsAiOn(body: string) {
  return /(^|\s)@ai(?![a-z0-9])/i.test(body);
}
export function mentionsAiOff(body: string) {
  return /(^|\s)@aioff(?![a-z0-9])/i.test(body);
}

/** Compact site corpus so the club AI can actually look things up when asked. */
async function siteCorpus(db: Admin) {
  const [drivers, teams, races, news, seasons] = await Promise.all([
    db.from("drivers").select("slug, name, number, flag, current_team_slug, current_team_since, former_teams, info_card"),
    db.from("teams").select("slug, name, flag, current_driver_slugs, former_lineups, info_card"),
    db.from("races").select("slug, name, flag, race_date, round_number, qualifying_content, race_content"),
    db.from("news").select("slug, title, excerpt, published_at").order("published_at", { ascending: false }).limit(20),
    db.from("seasons").select("slug, name"),
  ]);
  return JSON.stringify({
    drivers: drivers.data ?? [],
    teams: teams.data ?? [],
    races: races.data ?? [],
    news: news.data ?? [],
    seasons: seasons.data ?? [],
  }).slice(0, 60000);
}

/** Generate and store the AI's reply to the latest club message. */
export async function replyInClub(db: Admin, clubId: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return;

  const { data: recent } = await db
    .from("club_messages")
    .select("body, user_id, is_ai, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(15);
  const history = [...(recent ?? [])].reverse();

  const ids = [...new Set(history.filter(m => m.user_id).map(m => m.user_id as string))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids);
    for (const p of profiles ?? []) names.set(p.id, p.display_name ?? "Vierailija");
  }

  const corpus = await siteCorpus(db);
  const messages = [
    {
      role: "system",
      content:
        `Olet ${AI_NAME}, RyhäMonoposto-sarjan tekoäly, joka on liittynyt klubin ryhmächattiin. ` +
        `Vastaa aina suomeksi, lyhyesti ja rennosti kuin keskustelukaveri. ` +
        `Jos viesti kysyy faktoja sarjasta (kuljettajat, tiimit, kisat R1–R50, tulokset, uutiset, kaudet), ` +
        `hae vastaus alla olevasta sivuston datasta ja kerro mihin se perustuu. Jos tietoa ei löydy, sano se rehellisesti. ` +
        `Muuten jutustele normaalisti. Älä toista käyttäjän viestiä. Pidä vastaus alle 120 sanassa.\n\nSivuston data:\n${corpus}`,
    },
    ...history.map(m => ({
      role: m.is_ai ? ("assistant" as const) : ("user" as const),
      content: m.is_ai ? m.body : `${names.get(m.user_id as string) ?? "Käyttäjä"}: ${m.body || "(liite)"}`,
    })),
  ];

  let answer = "";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
    });
    if (resp.status === 429) answer = "Liikaa pyyntöjä juuri nyt — yritä hetken päästä uudelleen.";
    else if (resp.status === 402) answer = "AI-krediitit ovat lopussa.";
    else if (!resp.ok) answer = "En saanut yhteyttä tekoälyyn juuri nyt.";
    else {
      const json = await resp.json();
      answer = String(json.choices?.[0]?.message?.content ?? "").trim();
    }
  } catch {
    answer = "En saanut yhteyttä tekoälyyn juuri nyt.";
  }
  if (!answer) return;
  await db.from("club_messages").insert({ club_id: clubId, user_id: null, is_ai: true, body: answer.slice(0, 2000) });
}

export async function postAiSystemLine(db: Admin, clubId: string, body: string) {
  await db.from("club_messages").insert({ club_id: clubId, user_id: null, is_ai: true, body });
}
