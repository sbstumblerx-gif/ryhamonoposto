import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ q: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [drivers, teams, races, news, seasons] = await Promise.all([
      supabaseAdmin.from("drivers").select("slug, name, number, flag, team_slug, content"),
      supabaseAdmin.from("teams").select("slug, name, flag, content"),
      supabaseAdmin.from("races").select("slug, name, flag, race_date, qualifying_content, race_content"),
      supabaseAdmin.from("news").select("slug, title, excerpt, content, published_at"),
      supabaseAdmin.from("seasons").select("slug, name"),
    ]);

    const corpus = {
      drivers: drivers.data ?? [],
      teams: teams.data ?? [],
      races: races.data ?? [],
      news: news.data ?? [],
      seasons: seasons.data ?? [],
    };

    const systemPrompt = `Olet RyhäMonoposto-sivuston hakuavustaja. Vastaa suomeksi. Etsi käyttäjän kysymykseen parhaiten sopivat kohteet annetusta datasta. Palauta AINA validi JSON muodossa: {"answer":"lyhyt vastaus","results":[{"kind":"driver|team|race|news|season","slug":"...","title":"...","snippet":"..."}]}. Jos et löydä mitään, tyhjä results-lista.`;
    const userPrompt = `Kysymys: ${data.q}\n\nData:\n${JSON.stringify(corpus).slice(0, 60000)}`;

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
          { role: "user", content: userPrompt },
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
