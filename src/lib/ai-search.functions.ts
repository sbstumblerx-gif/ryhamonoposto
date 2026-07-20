import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ q: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [drivers, teams, races, news, seasons, media] = await Promise.all([
      supabaseAdmin.from("drivers").select("slug, name, number, flag, team_slug, content, info_card, current_team_slug, current_team_since, former_teams"),
      supabaseAdmin.from("teams").select("slug, name, flag, content"),
      supabaseAdmin.from("races").select("slug, name, flag, race_date, qualifying_content, race_content, youtube_url"),
      supabaseAdmin.from("news").select("slug, title, excerpt, content, hero_media_url, published_at"),
      supabaseAdmin.from("seasons").select("slug, name"),
      supabaseAdmin.from("media_items").select("scope, url, caption").order("created_at", { ascending: false }).limit(24),
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
      .filter(m => m.url && /\.(png|jpe?g|webp|gif)$/i.test(m.url))
      .slice(0, 8)
      .map(m => ({ type: "image_url", image_url: { url: m.url } }));

    // Include news hero images too
    for (const n of (news.data ?? []).slice(0, 4)) {
      if (n.hero_media_url && /\.(png|jpe?g|webp|gif)$/i.test(n.hero_media_url)) {
        imageBlocks.push({ type: "image_url", image_url: { url: n.hero_media_url } });
      }
    }

    const systemPrompt = `Olet RyhäMonoposto-sivuston hakuavustaja. Vastaa suomeksi. Etsi käyttäjän kysymykseen parhaiten sopivat kohteet annetusta datasta JA liitteenä olevista kuvista (jotka ovat tulostaulukoita ja tilastoja). Voit lukea kuvista tietoja. Palauta AINA validi JSON: {"answer":"lyhyt vastaus","results":[{"kind":"driver|team|race|news|season","slug":"...","title":"...","snippet":"..."}]}. Tyhjä results-lista jos ei osumia.`;
    const userText = `Kysymys: ${data.q}\n\nData:\n${JSON.stringify(corpus).slice(0, 60000)}`;

    const userContent: unknown[] = [{ type: "text", text: userText }, ...imageBlocks];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`AI virhe (${resp.status}): ${text.slice(0, 200)}`);
    }
    const json = await resp.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return {
        answer: String(parsed.answer ?? ""),
        results: Array.isArray(parsed.results) ? parsed.results.slice(0, 20) : [],
      };
    } catch {
      return { answer: content.slice(0, 400), results: [] };
    }
  });
