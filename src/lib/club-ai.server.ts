// Club chat AI participant. Tagging @ai invites it, @aioff removes it.
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, any, any>;
export const AI_NAME = "RyhäAI";
export function mentionsAiOn(body: string) { return /(^|\s)@ai(?![a-z0-9])/i.test(body); }
export function mentionsAiOff(body: string) { return /(^|\s)@aioff(?![a-z0-9])/i.test(body); }

function chronologicalRaces<T extends { name: string; round_number: number | null }>(races: T[]) {
  const year = (name: string) => Number(name.match(/\b(20\d{2})\b/)?.[1] ?? Number.MAX_SAFE_INTEGER);
  return [...races].sort((a, b) => year(a.name) - year(b.name) || (a.round_number ?? Number.MAX_SAFE_INTEGER) - (b.round_number ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
}

async function siteCorpus(db: Admin) {
  const [drivers, teams, races, news, seasons] = await Promise.all([
    db.from("drivers").select("slug, name, number, flag, current_team_slug, current_team_since, former_teams, info_card"),
    db.from("teams").select("slug, name, flag, current_driver_slugs, former_lineups, info_card"),
    db.from("races").select("slug, name, flag, race_date, round_number, qualifying_content, race_content"),
    db.from("news").select("slug, title, excerpt, published_at").order("published_at", { ascending: false }).limit(20),
    db.from("seasons").select("slug, name"),
  ]);
  const orderedRaces = chronologicalRaces((races.data ?? []) as any[]);
  return JSON.stringify({ drivers: drivers.data ?? [], teams: teams.data ?? [], races: orderedRaces, seasons: seasons.data ?? [], news: news.data ?? [] }).slice(0, 60000);
}

export async function replyInClub(db: Admin, clubId: string) {
  const key = process.env["LOVABLE_API_KEY"]; if (!key) return;
  const { data: recent } = await db.from("club_messages").select("body, user_id, is_ai, created_at").eq("club_id", clubId).order("created_at", { ascending: false }).limit(15);
  const history = [...(recent ?? [])].reverse();
  const ids = [...new Set(history.filter(m => m.user_id).map(m => m.user_id as string))]; const names = new Map<string, string>();
  if (ids.length) { const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids); for (const p of profiles ?? []) names.set(p.id, p.display_name ?? "Vierailija"); }
  const corpus = await siteCorpus(db);
  const messages = [
    { role: "system", content: `Olet ${AI_NAME}, RyhäMonoposto-sarjan tekoäly klubin ryhmächatissa. Vastaa suomeksi, lyhyesti ja rennosti. Kisasarjan aikajärjestys on ehdoton: yhden kauden sisällä kilpailut järjestetään aina round_numberin mukaan pienimmästä suurimpaan. Jos mukana on useita kausia, lajittele ensin kauden vuosiluvun mukaan pienimmästä suurimpaan ja vasta sen jälkeen kyseisen vuoden round_numberin mukaan. Älä käytä race_date-kenttää kilpailujen järjestyksen määrittämiseen. Kun puhut kilpailuaikajanasta, R1–R2–R3 jne. tarkoittaa round_number-järjestystä. Perusta faktavastaukset alla olevaan dataan. Jos tietoa ei löydy, sano se rehellisesti.\n\nSivuston data:\n${corpus}` },
    ...history.map(m => ({ role: m.is_ai ? ("assistant" as const) : ("user" as const), content: m.is_ai ? m.body : `${names.get(m.user_id as string) ?? "Käyttäjä"}: ${m.body || "(liite)"}` })),
  ];
  let answer = "";
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }) });
    if (resp.status === 429) answer = "Liikaa pyyntöjä juuri nyt — yritä hetken päästä uudelleen."; else if (resp.status === 402) answer = "AI-krediitit ovat lopussa."; else if (!resp.ok) answer = "En saanut yhteyttä tekoälyyn juuri nyt."; else { const json = await resp.json(); answer = String(json.choices?.[0]?.message?.content ?? "").trim(); }
  } catch { answer = "En saanut yhteyttä tekoälyyn juuri nyt."; }
  if (!answer) return; await db.from("club_messages").insert({ club_id: clubId, user_id: null, is_ai: true, body: answer.slice(0, 2000) });
}
export async function postAiSystemLine(db: Admin, clubId: string, body: string) { await db.from("club_messages").insert({ club_id: clubId, user_id: null, is_ai: true, body }); }
