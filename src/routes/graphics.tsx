import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { GraphChart } from "@/components/GraphChart";
import { createGraph, getGraphOptions, listMyGraphs, shareGraphToClub } from "@/lib/graphics.functions";
import { listMyClubs } from "@/lib/clubs.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/graphics")({
  head: () => ({ meta: [{ title: "Grafiikat — RyhäMonoposto" }] }),
  component: GraphicsPage,
});

const metricLabels: Record<string, string> = { points: "Pisteet", wins: "Voitot", podiums: "Podiumit", dnf: "DNF:t", dsq: "DSQ:t", dns: "DNS:t", poles: "Paalut", starts: "Startit", championships: "Maailmanmestaruudet" };

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function downloadGraphSvg() {
  const svg = document.querySelector("#graph-export svg") as SVGSVGElement | null;
  if (!svg) return toast.error("Grafiikkaa ei ole vielä valmis");
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  downloadText("ryhamonoposto-grafiikka.svg", new XMLSerializer().serializeToString(copy), "image/svg+xml");
}

function graphCsv(graph: any) {
  const rows = graph.data?.series ?? [];
  const labels = [...new Set(rows.flatMap((s: any) => s.points.map((p: any) => p.label)))];
  const head = ["Kilpailu", ...rows.map((s: any) => s.name)];
  const out = [head, ...labels.map(label => [label, ...rows.map((s: any) => s.points.find((p: any) => p.label === label)?.value ?? 0)])];
  return out.map(row => row.map((v: any) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function useUser() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUid(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUid(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return uid;
}

function GraphicsPage() {
  const navigate = useNavigate();
  const uid = useUser();
  const optionsFn = useServerFn(getGraphOptions);
  const createFn = useServerFn(createGraph);
  const historyFn = useServerFn(listMyGraphs);
  const clubsFn = useServerFn(listMyClubs);
  const shareFn = useServerFn(shareGraphToClub);
  const options = useQuery({ queryKey: ["graph-options"], queryFn: () => optionsFn() });
  const history = useQuery({ queryKey: ["my-graphs", uid], queryFn: () => historyFn(), retry: false, enabled: !!uid });
  const clubs = useQuery({ queryKey: ["my-clubs", uid], queryFn: () => clubsFn(), retry: false, enabled: !!uid });
  const [target, setTarget] = useState<"drivers" | "teams">("drivers");
  const [season, setSeason] = useState("history");
  const [participants, setParticipants] = useState<string[]>([]);
  const [chartType, setChartType] = useState<"pie" | "bar" | "line">("line");
  const [range, setRange] = useState<"all" | "last5" | "last10" | "last20">("all");
  const [metric, setMetric] = useState("points");
  const [graph, setGraph] = useState<any>(null);
  const [clubId, setClubId] = useState("");
  const [creating, setCreating] = useState(false);

  const choices = target === "drivers" ? options.data?.drivers ?? [] : options.data?.teams ?? [];
  const selected = useMemo(() => participants.filter(p => choices.some(c => c.slug === p)), [participants, choices]);

  async function signIn() {
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
    } catch (e: any) {
      toast.error(e?.message ?? "Kirjautuminen epäonnistui");
    }
  }

  async function create() {
    if (!uid) return toast.error("Kirjaudu ensin sisään, jotta grafiikka voidaan tallentaa omaan historiaasi.");
    if (!selected.length) return toast.error("Valitse vähintään yksi osallistuja");
    setCreating(true);
    try {
      const result = await createFn({ data: { target, season, participants: selected, chartType, range, metric: metric as any } });
      setGraph(result.graph);
      if (result.reused) toast.success("Sama grafiikka löytyi jo — käytetään olemassa olevaa grafiikkaa.");
      else toast.success("Grafiikka tallennettu julkiseen tietokantaan.");
      await history.refetch();
    } catch (e: any) { toast.error(e?.message ?? "Grafiikan luonti epäonnistui"); }
    finally { setCreating(false); }
  }

  return <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
    <div className="flex items-center justify-between gap-3 mb-5">
      <div>
        <Link to="/tilastot" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><ArrowLeft size={14} /> Tilastot</Link>
        <h1 className="font-display uppercase tracking-widest text-3xl text-primary mt-2">Grafiikat</h1>
      </div>
    </div>
    <div className="hairline-red mb-6" />

    {!uid && <section className="card-dark p-5 md:p-6 mb-6 border border-primary/30">
      <h2 className="font-display uppercase tracking-widest text-lg">Kirjaudu käyttääksesi grafiikoita</h2>
      <p className="text-sm text-muted-foreground mt-1">Grafiikat tallennetaan julkiseen tietokantaan, mutta omien grafiikoiden historia ja jakaminen klubien chatteihin vaativat kirjautumisen.</p>
      <button onClick={signIn} className="mt-4 bg-primary text-primary-foreground rounded px-6 py-3 font-display uppercase tracking-widest">Kirjaudu Googlella</button>
    </section>}

    <section className="card-dark p-5 md:p-6">
      <h2 className="font-display uppercase tracking-widest text-lg">Luo grafiikkaa</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">Valitse mitä haluat verrata. Sama asetusyhdistelmä käyttää aina jo olemassa olevaa julkista grafiikkaa.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">Kohde<select value={target} onChange={e => { setTarget(e.target.value as any); setParticipants([]); }} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
          <option value="drivers">Kuljettajat</option><option value="teams">Valmistajat / tiimit</option>
        </select></label>
        <label className="text-sm">Kausi<select value={season} onChange={e => setSeason(e.target.value)} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
          <option value="history">Koko historia</option>{(options.data?.seasons ?? []).map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select></label>
        <label className="text-sm">Grafiikkatyyppi<select value={chartType} onChange={e => setChartType(e.target.value as any)} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
          <option value="line">Viivagraafi — kehitys kilpailu kilpailulta</option><option value="bar">Pylväsdiagrammi</option><option value="pie">Piirakkakaavio</option>
        </select></label>
        <label className="text-sm">Tilasto<select value={metric} onChange={e => setMetric(e.target.value)} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
          {Object.entries(metricLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label className="text-sm">Aikaväli<select value={range} onChange={e => setRange(e.target.value as any)} className="mt-1 w-full bg-black/70 border border-primary/30 rounded p-2.5">
          <option value="all">Koko valittu aikaväli</option><option value="last5">Viimeiset 5 kilpailua</option><option value="last10">Viimeiset 10 kilpailua</option><option value="last20">Viimeiset 20 kilpailua</option>
        </select></label>
        <label className="text-sm md:col-span-2">Osallistujat <span className="text-muted-foreground">(Ctrl/Cmd-valinta työpöydällä)</span>
          <select multiple value={selected} onChange={e => setParticipants([...e.target.selectedOptions].map(o => o.value))} className="mt-1 w-full min-h-40 bg-black/70 border border-primary/30 rounded p-2">
            {choices.map((c: any) => <option key={c.slug} value={c.slug}>{c.flag ? `${c.flag} ` : ""}{c.name}</option>)}
          </select>
        </label>
      </div>
      <button disabled={creating || !uid} onClick={create} className="mt-5 w-full md:w-auto bg-primary text-primary-foreground rounded px-6 py-3 font-display uppercase tracking-widest disabled:opacity-50">{creating ? "Luo..." : "📊 Luo grafiikka"}</button>
    </section>

    {graph && <section className="card-dark p-4 md:p-6 mt-6" id="graph-export">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div><h2 className="font-display uppercase tracking-widest text-xl">{graph.title}</h2><p className="text-sm text-muted-foreground">{graph.subtitle}</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadGraphSvg} className="border border-primary/40 rounded px-3 py-2 text-xs inline-flex items-center gap-2"><Download size={14} /> SVG</button>
          <button onClick={() => downloadText("ryhamonoposto-grafiikka.csv", graphCsv(graph), "text/csv;charset=utf-8")} className="border border-primary/40 rounded px-3 py-2 text-xs">CSV</button>
        </div>
      </div>
      <GraphChart graph={graph} />
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Jaa klubin chattiin</div>
        <div className="flex flex-col md:flex-row gap-2">
          <select value={clubId} onChange={e => setClubId(e.target.value)} className="flex-1 bg-black/70 border border-primary/30 rounded p-2.5 text-sm">
            <option value="">Valitse klubi...</option>{(clubs.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button disabled={!clubId || !uid} onClick={async () => { try { await shareFn({ data: { graph_id: graph.id, club_id: clubId } }); toast.success("Grafiikka jaettu klubin chattiin."); } catch (e: any) { toast.error(e?.message ?? "Jakaminen epäonnistui"); } }} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"><Share2 size={15} /> Jaa</button>
        </div>
        {!uid && <p className="text-xs text-muted-foreground mt-2">Kirjaudu sisään nähdäksesi omat klubisi ja jakaaksesi grafiikan.</p>}
        {uid && !clubs.data?.length && <p className="text-xs text-muted-foreground mt-2">Liity klubin jäseneksi, jotta voit jakaa grafiikan klubichattiin.</p>}
      </div>
    </section>}

    <section className="mt-8">
      <h2 className="font-display uppercase tracking-widest text-lg mb-3">Omat grafiikat</h2>
      {!uid ? <p className="text-sm text-muted-foreground">Kirjaudu sisään nähdäksesi omat tallennetut grafiikkasi.</p> : history.isLoading ? <p className="text-sm text-muted-foreground">Ladataan...</p> : !history.data?.length ? <p className="text-sm text-muted-foreground">Et ole vielä tallentanut grafiikoita.</p> : <div className="grid md:grid-cols-2 gap-3">
        {history.data.map(g => <button key={g.id} onClick={() => navigate({ to: "/graphics/$id", params: { id: g.id } })} className="card-dark p-4 text-left hover:border-primary/60 border border-transparent transition"><div className="font-display uppercase">{g.title}</div><div className="text-xs text-muted-foreground mt-1">{g.subtitle}</div></button>)}
      </div>}
    </section>
  </div>;
}
