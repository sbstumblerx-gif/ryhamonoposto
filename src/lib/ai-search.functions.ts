import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

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
      supabaseAdmin.from("drivers").select("slug, name, number, flag, team_slug, content, info_card, current_team_slug, current_team_since, former_teams"),
      supabaseAdmin.from("teams").select("slug, name, flag, color_key, content, info_card, current_driver_slugs, former_lineups"),
      supabaseAdmin.from("races").select("slug, name, flag, race_date, qualifying_content, race_content, youtube_url, qualifying_youtube_url, race_youtube_url"),
      supabaseAdmin.from("news").select("slug, title, excerpt, content, hero_media_url, published_at"),
      supabaseAdmin.from("seasons").select("slug, name"),
      supabaseAdmin.from("media_items").select("scope, url, caption").order("created_at", { ascending: false }).limit(30),
    ]);

    const corpus = {
      drivers: drivers.data ?? [],
      teams: teams.data ?? [],
      races: races.data ?? [],
      news: news.data ?? [],
      seasons: seasons.data ?? [],
      media_index: (media.data ?? []).map(m => ({ scope: m.scope, caption: m.caption })),
    };

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

    const systemPrompt = `Olet RyhäMonoposto-sarjan keskusteleva AI-tila. Vastaa suomeksi ja käytä vain annetun sivuston dataa sekä liitteenä olevia kuvia. Jos et tiedä, sano se. Mainitse tarvittaessa mihin kisaan, kuljettajaan, tiimiin, uutiseen tai tilasto-osioon tieto perustuu.${contextLine}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: [{ type: "text", text: `Sivuston tämänhetkinen data:\n${JSON.stringify(corpus).slice(0, 70000)}` }, ...imageBlocks] },
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
    return { answer: String(json.choices?.[0]?.message?.content ?? "") };
  });
