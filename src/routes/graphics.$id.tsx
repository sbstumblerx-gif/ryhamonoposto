import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, ArrowLeft } from "lucide-react";
import { GraphChart } from "@/components/GraphChart";

export const Route = createFileRoute("/graphics/$id")({
  head: () => ({ meta: [{ title: "Grafiikka — RyhäMonoposto" }] }),
  component: PublicGraphPage,
});

function downloadSvg() {
  const svg = document.querySelector("#public-graph svg") as SVGSVGElement | null;
  if (!svg) return;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "ryhamonoposto-grafiikka.svg"; a.click(); URL.revokeObjectURL(url);
}

function PublicGraphPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn((async () => (await import("@/lib/graphics.functions")).getGraph) as any);
  const query = useQuery({ queryKey: ["graph", id], queryFn: () => getFn({ data: { id } }) });
  if (query.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Ladataan grafiikkaa...</div>;
  if (query.isError || !query.data) return <div className="mx-auto max-w-5xl px-4 py-10"><Link to="/graphics" className="text-primary inline-flex items-center gap-1"><ArrowLeft size={14} /> Grafiikat</Link><div className="card-dark p-8 mt-5">Grafiikkaa ei löytynyt.</div></div>;
  const graph: any = query.data;
  return <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
    <Link to="/graphics" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><ArrowLeft size={14} /> Grafiikat</Link>
    <div id="public-graph" className="card-dark p-4 md:p-6 mt-4">
      <div className="flex justify-between items-start gap-3 mb-4"><div><h1 className="font-display uppercase tracking-widest text-2xl text-primary">{graph.title}</h1><p className="text-sm text-muted-foreground">{graph.subtitle}</p></div><button onClick={downloadSvg} className="border border-primary/40 rounded px-3 py-2 text-xs inline-flex items-center gap-2"><Download size={14} /> SVG</button></div>
      <GraphChart graph={graph} />
      <p className="text-xs text-muted-foreground mt-4">Julkinen RyhäMonoposto-grafiikka · ID {graph.id}</p>
    </div>
  </div>;
}
