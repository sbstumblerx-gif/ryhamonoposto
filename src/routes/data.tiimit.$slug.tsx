import { createFileRoute } from "@tanstack/react-router";
import { getTeam } from "@/lib/content.functions";

export const Route = createFileRoute("/data/tiimit/$slug")({
  head: ({ params }) => ({ meta: [{ title: `RyhäMonoposto data — ${params.slug}` }] }),
  loader: async ({ params }) => getTeam({ data: { slug: params.slug } }),
  component: TeamDataPage,
});

function TeamDataPage() {
  const t = Route.useLoaderData();
  if (!t) return <pre className="mx-auto max-w-5xl px-4 py-8">Tiimiä ei löydy.</pre>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">
{[
  "RYHÄMONOPOSTO — TIIMI",
  "",
  `Nimi: ${t.name}`,
  `Slug: ${t.slug}`,
  `Lippu: ${t.flag || "Ei tiedossa"}`,
  `Tiimin väri: ${t.color_key}`,
  `Nykyiset kuljettajat: ${(t.current_driver_slugs ?? []).join(", ") || "Ei tiedossa"}`,
  `Moottoritoimittaja: ${t.engine_supplier ?? "Ei tiedossa"}`,
  `Moottorisopimus alkaa: ${t.engine_contract_start_year ?? "Ei tiedossa"}`,
  `Moottorisopimus päättyy: ${t.engine_contract_year ?? "Ei tiedossa"}`,
  "",
  "Esittely:",
  t.content ?? "Ei esittelyä.",
  "",
  `Normaali sivu: /tiimit/${t.slug}`,
].join("\n")}
      </pre>
    </main>
  );
}
