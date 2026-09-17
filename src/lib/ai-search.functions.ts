import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { compareRaceOrder } from "./stats-compute";

const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const sourceSchema = z.object({
  title: z.string().min(1).max(160),
  url: z.string().min(1).max(500),
});

function parseAiPayload(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.answer === "string") {
      return {
        answer: parsed.answer,
        sourceKeys: Array.isArray(parsed.sourceKeys) ? parsed.sourceKeys.filter((x: unknown): x is string => typeof x === "string") : [],
      };
    }
  } catch {
    // Keep compatibility if the model returns plain text despite the JSON instruction.
  }
  return { answer: raw, sourceKeys: [] as string[] };
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    messages: z.array(ChatMessage).min(1).max(12),
    pageContext: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [drivers, teams, races, news, seasons, media] = await Promise.all([
      supabaseAdmin.from("drivers").select("slug, name, number, flag, team_slug, content, info_card, current_team_slug, current_team_since, current_contract_until, former_teams"),
      supabaseAdmin.from("teams").select("slug, name, flag, color_key, content, info_card, current_driver_slugs, former_lineups"),
      supabaseAdmin.from("races").select("slug, name, flag, race_date, round_number, qualifying_content, race_content, youtube_url, qualifying_youtube_url, race_youtube_url"),
      supabaseAdmin.from("news").select("slug, title, excerpt, content, hero_media_url, published_at"),
      supabaseAdmin.from("seasons").select("slug, name"),
      supabaseAdmin.from("media_items").select("scope, url, caption").order("created_at", { ascending: false }).limit(30),
    ]);

    const corpus = {
      drivers: drivers.data ?? [],
      teams: teams.data ?? [],
      races: [...(races.data ?? [])].sort(compareRaceOrder),
      news: news.data ?? [],
      seasons: seasons.data ?? [],
      media_index: (media.data ?? []).map(m => ({ scope: m.scope, caption: m.caption })),
    };

    const sourceCatalog = [
      ...(drivers.data ?? []).map(d => ({ key: `driver:${d.slug}`, title: `${d.flag ?? ""} ${d.name}`.trim(), url: `/kuljettajat/${d.slug}` })),
      ...(teams.data ?? []).map(t => ({ key: `team:${t.slug}`, title: t.name, url: `/tiimit/${t.slug}` })),
      ...(races.data ?? []).map(r => ({ key: `race:${r.slug}`, title: `${r.flag ?? ""} ${r.name}`.trim(), url: `/kilpailut/${r.slug}` })),
      ...(news.data ?? []).map(n => ({ key: `news:${n.slug}`, title: n.title, url: `/uutiset/${n.slug}` })),
    ];

    const imageBlocks = (media.data ?? [])
      .filter(m => m.url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(m.url))
      .slice(0, 10)
      .map(m => ({ type: "image_url", image_url: { url: m.url } }));

    for (const n of (news.data ?? []).slice(0, 5)) {
      if (n.hero_media_url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(n.hero_media_url)) {
        imageBlocks.push({ type: "image_url", image_url: { url: n.hero_media_url } });
      }
    }

    const contextLine = data.pageContext
      ? `\n\nSivun konteksti: ${data.pageContext} — priorisoi tämän sivun sisältöä. Jos sivulta ei löydy vastausta, hae sitä muualta sivuston datasta.`
      : "";

    const systemPrompt = `Olet RyhäMonoposto-sarjan keskusteleva AI-tila. Vastaa suomeksi ja käytä vain annetun sivuston dataa sekä liitteenä olevia kuvia. Jos et tiedä, sano se. Mainitse tarvittaessa mihin kisaan, kuljettajaan, tiimiin, uutiseen tai tilasto-osioon tieto perustuu.

Kuljettajien sopimukset: jokaisella kuljettajalla voi olla kenttä current_contract_until. Arvo "none" tarkoittaa, ettei kuljettajalla ole sopimusta. Arvo "unknown" tarkoittaa, ettei sopimuksen pituudesta ole tietoa. Vuosiluku 2026–2040 tarkoittaa, että nykyinen sopimus on voimassa kyseisen kauden loppuun. Kun kysytään kuljettajan sopimuksen pituudesta, tarkista aina ensisijaisesti tämä kenttä. Älä keksi sopimuksen päättymisvuotta tai päättele sitä uutisista, jos rekisterissä on arvo. Jos arvo on "unknown" tai puuttuu, kerro että sivuston rekisterissä ei ole varmaa tietoa. "Ei sopimusta" ei tarkoita automaattisesti, että kuljettaja olisi ilman ajopaikkaa.

Kilpailujen järjestys: kilpailut on annettu jo oikeassa kronologisessa järjestyksessä. Järjestys määräytyy ensin kauden vuosiluvun mukaan (pienin vuosi ensin) ja saman kauden sisällä round_number-kentän mukaan (pienin ensin). Älä koskaan käytä päivämäärää, aakkosjärjestystä tai listan muuta järjestystä aikajanan perusteena. Kun kerrot kausien kulusta tai aikajanasta, noudata täsmälleen tätä järjestystä.

Lähteet: sinulla on käytössäsi alla oleva sourceCatalog. Vastauksen lopussa ei tarvitse kirjoittaa lähdeluetteloa. Palauta aina vain JSON muodossa {"answer":"...","sourceKeys":["driver:slug","race:slug",...]}. sourceKeys-listaan valitse vain ne lähteet, joiden sisältöön oikeasti perustit vastauksesi. Jos vastaus perustuu useaan kohteeseen, listaa kaikki olennaiset lähteet. Älä keksi sourceKey-arvoja. Jos et käyttänyt tiettyä lähdettä, jätä se pois.${contextLine}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: [{ type: "text", text: `Sivuston tämänhetkinen data:\n${JSON.stringify(corpus).slice(0, 70000)}\n\nsourceCatalog:\n${JSON.stringify(sourceCatalog)}` }, ...imageBlocks] },
      ...data.messages.map((message) => ({ role: message.role, content: message.content })),
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`AI virhe (${resp.status}): ${text.slice(0, 200)}`);
    }
    const json = await resp.json();
    const parsed = parseAiPayload(String(json.choices?.[0]?.message?.content ?? ""));
    const allowed = new Set(sourceCatalog.map(s => s.key));
    const sources = parsed.sourceKeys
      .filter(key => allowed.has(key))
      .map(key => sourceCatalog.find(s => s.key === key))
      .filter((source): source is { key: string; title: string; url: string } => Boolean(source))
      .map(({ title, url }) => ({ title, url }));

    return { answer: parsed.answer, sources };
  });
