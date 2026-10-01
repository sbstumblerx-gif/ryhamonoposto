import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "@/lib/content.functions";

export const Route = createFileRoute("/data/tiimit/$slug")({
  head: ({ params }) => ({ meta: [{ title: `RyhäMonoposto data — ${params.slug}` }] }),
  component: TeamDataPage,
});

function TeamDataPage() {
  const { slug } = Route.useParams();
  const get = useServerFn(getTeam);
  const q = useQuery({ queryKey: ["machine-team", slug], queryFn: () => get({ data: { slug } }) });

  if (q.isLoading) return <pre className="mx-auto max-w-5xl px-4 py-8">Ladataan…</pre>;
  if (q.isError || !q.data) return <pre className="mx-auto max-w-5xl px-4 py-8">Tiimiä ei löydy.</pre>;

  const t = q.data;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">
{[
  "RYHÄMONOPOSTO — TIIMI",
  "",
  `Nimi: ${t.name}`,
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
