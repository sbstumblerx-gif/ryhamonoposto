import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDriver } from "@/lib/content.functions";

export const Route = createFileRoute("/data/kuljettajat/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `RyhäMonoposto data — ${params.slug}` },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: DriverDataPage,
});

function DriverDataPage() {
  const { slug } = Route.useParams();
  const get = useServerFn(getDriver);
  const q = useQuery({ queryKey: ["machine-driver", slug], queryFn: () => get({ data: { slug } }) });

  if (q.isLoading) return <pre className="mx-auto max-w-5xl px-4 py-8">Ladataan…</pre>;
  if (q.isError || !q.data) return <pre className="mx-auto max-w-5xl px-4 py-8">Kuljettajaa ei löydy.</pre>;

  const d = q.data;
  const contract = "current_contract_until" in d ? d.current_contract_until : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">
{[
  "RYHÄMONOPOSTO — KULJETTAJA",
  "",
  `Nimi: ${d.name}`,
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
