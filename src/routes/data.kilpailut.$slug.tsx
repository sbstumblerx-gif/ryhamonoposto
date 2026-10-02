import { createFileRoute } from "@tanstack/react-router";
import { getRace } from "@/lib/content.functions";

export const Route = createFileRoute("/data/kilpailut/$slug")({
  head: ({ params }) => ({ meta: [{ title: `RyhäMonoposto data — kilpailu ${params.slug}` }] }),
  loader: async ({ params }) => getRace({ data: { slug: params.slug } }),
  component: RaceDataPage,
});

function RaceDataPage() {
  const r = Route.useLoaderData() as any;
  if (!r) return <pre className="mx-auto max-w-5xl px-4 py-8">Kilpailua ei löydy.</pre>;
  return <main className="mx-auto max-w-5xl px-4 py-8"><pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">{[
    "RYHÄMONOPOSTO — KILPAILU",
    "",
    `Nimi: ${r.name}`,
    `Slug: ${r.slug}`,
    `Lippu: ${r.flag || "Ei tiedossa"}`,
    `Round: ${r.round_number ?? "Ei tiedossa"}`,
    `Päivämäärä: ${r.race_date ?? "Ei tiedossa"}`,
    `Sprinttiviikonloppu: ${String((r as any).is_sprint_weekend ?? false)}`,
    "",
    "Aika-ajot:",
    r.qualifying_content ?? "Ei tietoja.",
    "",
    "Kilpailu:",
    r.race_content ?? "Ei tietoja.",
    "",
    `Normaali sivu: /kilpailut/${r.slug}`,
  ].join("\n")}</pre></main>;
}
