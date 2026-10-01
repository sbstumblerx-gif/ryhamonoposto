import { createFileRoute } from "@tanstack/react-router";
import { getDriver } from "@/lib/content.functions";

export const Route = createFileRoute("/data/kuljettajat/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `RyhäMonoposto data — ${params.slug}` },
      { name: "description", content: "RyhäMonoposton koneellisesti luettava kuljettajatieto." },
    ],
  }),
  loader: async ({ params }) => getDriver({ data: { slug: params.slug } }),
  component: DriverDataPage,
});

function DriverDataPage() {
  const d = Route.useLoaderData();
  if (!d) return <pre className="mx-auto max-w-5xl px-4 py-8">Kuljettajaa ei löydy.</pre>;
  const contract = "current_contract_until" in d ? d.current_contract_until : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">
{[
  "RYHÄMONOPOSTO — KULJETTAJA",
  "",
  `Nimi: ${d.name}`,
  `Slug: ${d.slug}`,
  `Lippu: ${d.flag || "Ei tiedossa"}`,
  `Numero: ${d.number ?? "Ei tiedossa"}`,
  `Nykyinen tiimi: ${d.current_team_slug ?? d.team_slug ?? "Ei tiedossa"}`,
  `Sopimus voimassa: ${contract ?? "Ei asetettu"}`,
  `Tiimin väri: ${d.color_key}`,
  "",
  "Esittely:",
  d.content ?? "Ei esittelyä.",
  "",
  `Normaali sivu: /kuljettajat/${d.slug}`,
].join("\n")}
      </pre>
    </main>
  );
}
