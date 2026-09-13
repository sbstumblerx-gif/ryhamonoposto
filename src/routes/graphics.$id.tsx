import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, ArrowLeft } from "lucide-react";
import { getGraph } from "@/lib/graphics.functions";
import { GraphChart } from "@/components/GraphChart";
import { toast } from "sonner";

export const Route = createFileRoute("/graphics/$id")({
  head: () => ({ meta: [{ title: "Grafiikka — RyhäMonoposto" }] }),
  component: PublicGraphPage,
});

function prepareGraphSvg(svg: SVGSVGElement, title: string, subtitle: string) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const width = Math.max(720, Math.ceil(rect.width || Number(svg.getAttribute("width")) || 720));
  const height = Math.max(440, Math.ceil(rect.height || Number(svg.getAttribute("height")) || 440));
  const ns = "http://www.w3.org/2000/svg";
  copy.setAttribute("xmlns", ns); copy.setAttribute("width", String(width)); copy.setAttribute("height", String(height + 72)); copy.setAttribute("viewBox", `0 0 ${width} ${height + 72}`);
  const background = document.createElementNS(ns, "rect");
  background.setAttribute("width", String(width)); background.setAttribute("height", String(height + 72)); background.setAttribute("fill", "#101010"); copy.insertBefore(background, copy.firstChild);
  const titleEl = document.createElementNS(ns, "text"); titleEl.setAttribute("x", "24"); titleEl.setAttribute("y", "28"); titleEl.setAttribute("fill", "#ffffff"); titleEl.setAttribute("font-family", "Arial, sans-serif"); titleEl.setAttribute("font-size", "20"); titleEl.setAttribute("font-weight", "700"); titleEl.textContent = title; copy.appendChild(titleEl);
  const subtitleEl = document.createElementNS(ns, "text"); subtitleEl.setAttribute("x", "24"); subtitleEl.setAttribute("y", "52"); subtitleEl.setAttribute("fill", "#b8b8b8"); subtitleEl.setAttribute("font-family", "Arial, sans-serif"); subtitleEl.setAttribute("font-size", "13"); subtitleEl.textContent = subtitle; copy.appendChild(subtitleEl);
  for (const child of Array.from(copy.children)) if (child !== background && child !== titleEl && child !== subtitleEl && child instanceof SVGElement) child.setAttribute("transform", "translate(0 72)");
  return { copy, width, height: height + 72 };
}

function getPreparedSvg() {
  const svg = document.querySelector("#public-graph svg") as SVGSVGElement | null;
  if (!svg) return null;
  const title = document.querySelector("#public-graph h1")?.textContent ?? "RyhäMonoposto — Grafiikka";
  const subtitle = document.querySelector("#public-graph h1 + p")?.textContent ?? "";
  return prepareGraphSvg(svg, title, subtitle);
}

function downloadSvg() {
  const prepared = getPreparedSvg();
  if (!prepared) return toast.error("Grafiikkaa ei ole vielä valmis");
  const blob = new Blob([new XMLSerializer().serializeToString(prepared.copy)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "ryhamonoposto-grafiikka.svg"; a.click(); URL.revokeObjectURL(url);
}

async function downloadPng() {
  const prepared = getPreparedSvg();
  if (!prepared) return toast.error("Grafiikkaa ei ole vielä valmis");
  const blob = new Blob([new XMLSerializer().serializeToString(prepared.copy)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(); image.decoding = "async"; image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("SVG-kuvan lataus epäonnistui")); });
    const scale = Math.max(2, Math.min(4, window.devicePixelRatio || 2));
    const canvas = document.createElement("canvas"); canvas.width = prepared.width * scale; canvas.height = prepared.height * scale;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas ei ole käytettävissä");
    ctx.fillStyle = "#101010"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png")); if (!png) throw new Error("PNG-kuvan muodostaminen epäonnistui");
    const pngUrl = URL.createObjectURL(png); const a = document.createElement("a"); a.href = pngUrl; a.download = "ryhamonoposto-grafiikka.png"; a.click(); setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } catch (e: any) { toast.error(e?.message ?? "PNG-kuvan tallentaminen epäonnistui"); } finally { URL.revokeObjectURL(url); }
}

function PublicGraphPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getGraph);
  const query = useQuery({ queryKey: ["graph", id], queryFn: () => getFn({ data: { id } }) });
  if (query.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Ladataan grafiikkaa...</div>;
  if (query.isError || !query.data) return <div className="mx-auto max-w-5xl px-4 py-10"><Link to="/graphics" className="text-primary inline-flex items-center gap-1"><ArrowLeft size={14} /> Grafiikat</Link><div className="card-dark p-8 mt-5">Grafiikkaa ei löytynyt.</div></div>;
  const graph: any = query.data;
  return <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
    <Link to="/graphics" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><ArrowLeft size={14} /> Grafiikat</Link>
    <div id="public-graph" className="card-dark p-4 md:p-6 mt-4">
      <div className="flex justify-between items-start gap-3 mb-4"><div><h1 className="font-display uppercase tracking-widest text-2xl text-primary">{graph.title}</h1><p className="text-sm text-muted-foreground">{graph.subtitle}</p></div><div className="flex gap-2"><button onClick={downloadPng} className="bg-primary text-primary-foreground rounded px-3 py-2 text-xs inline-flex items-center gap-2"><Download size={14} /> PNG</button><button onClick={downloadSvg} className="border border-primary/40 rounded px-3 py-2 text-xs inline-flex items-center gap-2"><Download size={14} /> SVG</button></div></div>
      <GraphChart graph={graph.data} />
      <p className="text-xs text-muted-foreground mt-4">Julkinen RyhäMonoposto-grafiikka · ID {graph.id}</p>
    </div>
  </div>;
}
