import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Reads an uploaded result sheet image and writes a clean "1. Kuljettaja - Tiimi" list
// that an admin can then edit by hand.
export const generateResultList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    image_url: z.string().url(),
    session_label: z.string().max(200).default(""),
    year: z.number().int().min(2025).max(2100).nullable().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-session.server");
    await requireAdmin();
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: drivers }, { data: teams }] = await Promise.all([
      supabaseAdmin.from("drivers").select("name, number, current_team_slug, current_team_since, former_teams"),
      supabaseAdmin.from("teams").select("slug, name"),
    ]);
    const teamName = new Map((teams ?? []).map(t => [t.slug, t.name] as const));
    const roster = (drivers ?? []).map(d => ({
      nimi: d.name,
      numero: d.number,
      nykyinen_tiimi: d.current_team_slug ? teamName.get(d.current_team_slug) ?? null : null,
      nykyisessa_tiimissa_alkaen: d.current_team_since,
      entiset_tiimit: (Array.isArray(d.former_teams) ? d.former_teams : []).map((f: any) => ({
        tiimi: teamName.get(f?.slug) ?? f?.slug, alkaen: f?.from, asti: f?.to,
      })),
    }));

    const year = data.year ?? new Date().getUTCFullYear();
    const prompt = `Luet kuvan RyhäMonoposto-sarjan session tuloksista${data.session_label ? ` (${data.session_label})` : ""}.
Kirjoita tuloslista tarkalleen muodossa, yksi rivi per sijoitus:
1. Kuljettajan nimi - Tiimin nimi

Säännöt:
- Käytä kuljettajien nimiä täsmälleen niin kuin ne on alla olevassa listassa (korjaa kuvan kirjoitusvirheet listaa vastaaviksi).
- Tiimi on se, jossa kuljettaja oli vuonna ${year}. Käytä ensisijaisesti nykyistä tiimiä jos "alkaen" <= ${year}, muuten päättele tiimihistoriasta.
- Jos tiimi ei ole varmasti tiedossa, päättele paras arvaus tiimihistoriasta äläkä jätä tiimiä pois.
- Älä kirjoita mitään muuta tekstiä, otsikoita tai selityksiä. Pelkkä lista.

Kuljettajarekisteri (JSON):
${JSON.stringify(roster)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: data.image_url } },
          ],
        }],
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`AI virhe (${resp.status}): ${text.slice(0, 200)}`);
    }
    const json = await resp.json();
    const raw = String(json.choices?.[0]?.message?.content ?? "").trim();
    const lines = raw.split("\n").map(l => l.trim()).filter(l => /^\d+\./.test(l));
    return { text: (lines.length ? lines.join("\n") : raw) };
  });
