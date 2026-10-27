import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { label: string; axisLabel?: string; value: number; round: number; teamColor?: string; teamName?: string };
type GraphData = { title: string; subtitle: string; config: { chartType: "pie" | "bar" | "line" | "stage"; metric: string; target?: "drivers" | "teams" }; totals: { name: string; value: number; color: string; flag?: string; team?: { name?: string } }[]; series: { name: string; color: string; points: Point[]; segments?: { color: string; data: Point[] }[] }[] };
const metricLabels: Record<string, string> = { points: "Pisteet", wins: "Voitot", podiums: "Podiumit", dnf: "DNF:t", dsq: "DSQ:t", dns: "DNS:t", poles: "Paalut", starts: "Startit", championships: "Maailmanmestaruudet", driverOfTheDay: "Päivän kuljettaja", fastestLaps: "Nopeimmat kierrokset", sprintPoints: "Sprinttipisteet", sprintWins: "Sprinttivoitot", sprintPodiums: "Sprinttipodiumit", sprintPoles: "Sprinttipaalut", sprintFastestLaps: "Sprintin nopeimmat kierrokset", sprintDnf: "Sprintti-DNF:t", sprintDsq: "Sprintti-DSQ:t", sprintDns: "Sprintti-DNS:t", sprintStarts: "Sprinttistartit" };

function StageChart({ data, height }: { data: GraphData; height: number }) {
  const [active, setActive] = useState<number | null>(null);
  const entries = [...data.totals].sort((a, b) => b.value - a.value);
  const max = Math.max(0, ...entries.map((entry) => Number(entry.value) || 0));
  const scaleMax = max || 1;
  const metricLabel = metricLabels[data.config.metric] ?? data.config.metric;
  const rankOf = (entry: typeof entries[number]) => 1 + entries.filter((other) => other.value > entry.value).length;
  return <div className="space-y-4">
    <div className="relative w-full overflow-x-auto">
      <div className="relative min-w-[620px]" style={{ height: Math.max(height, 220) }}>
        <div className="absolute left-5 right-5 bottom-[49px] h-px bg-white/70" />
        <div className="absolute left-5 bottom-[31px] text-xs tabular-nums text-muted-foreground">0</div>
        <div className="absolute right-5 bottom-[31px] text-xs tabular-nums text-muted-foreground">{max.toLocaleString("fi-FI")}</div>
        {entries.map((entry, index) => {
          const x = 20 + (Number(entry.value) / scaleMax) * 960;
          const color = entry.color || "#9ca3af";
          const rank = rankOf(entry);
          return <div key={entry.name} className="absolute inset-0">
            <button type="button" onClick={() => setActive(index)} aria-label={`${entry.name}, ${entry.value} ${metricLabel}, sijoitus ${rank}`}
              className="absolute z-10 w-5 -translate-x-1/2 rounded-t-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              style={{ left: `${x / 10}%`, bottom: 49, height: 68, backgroundColor: color, opacity: active === index ? 1 : 0.85, boxShadow: active === index ? `0 0 0 2px white, 0 0 12px ${color}` : undefined }} />
            <button type="button" onClick={() => setActive(index)}
              className="absolute z-20 max-w-[150px] -translate-x-1/2 truncate rounded px-1 text-center text-xs font-semibold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              style={{ left: `${x / 10}%`, top: 6 + (index % 3) * 27, color, maxWidth: "150px" }}>
              {entry.flag ? `${entry.flag} ` : ""}{entry.name}
            </button>
          </div>;
        })}
      </div>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {entries.map((entry, index) => <button key={entry.name} onClick={() => setActive(index)} className={`inline-flex items-center gap-2 rounded px-2 py-1 ${active === index ? "bg-white/10" : "hover:bg-white/5"}`}>
        <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />{entry.name}
      </button>)}
    </div>
    {active !== null && entries[active] && (() => {
      const entry = entries[active];
      const rank = rankOf(entry);
      const targetName = data.config.target === "drivers" ? "Kuljettaja" : "Tiimi";
      return <div className="rounded-lg border border-primary/40 bg-black/30 p-4" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="text-xs uppercase tracking-widest text-muted-foreground">{targetName}</div><h3 className="mt-1 text-lg font-semibold" style={{ color: entry.color }}>{entry.name}</h3>
          {entry.team?.name && <p className="mt-1 text-sm text-muted-foreground">Tiimi: <span className="text-foreground">{entry.team.name}</span></p>}</div>
          <button type="button" onClick={() => setActive(null)} className="text-sm text-muted-foreground hover:text-foreground">Sulje ×</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded border border-white/10 p-3"><div className="text-xs text-muted-foreground">{metricLabel}</div><div className="mt-1 text-xl font-bold tabular-nums">{Number(entry.value).toLocaleString("fi-FI")}</div></div>
          <div className="rounded border border-white/10 p-3"><div className="text-xs text-muted-foreground">Sijoitus vertailussa</div><div className="mt-1 text-xl font-bold">#{rank} <span className="text-xs font-normal text-muted-foreground">/ {entries.length}</span></div></div>
          <div className="rounded border border-white/10 p-3"><div className="text-xs text-muted-foreground">Osuus korkeimmasta arvosta</div><div className="mt-1 text-xl font-bold">{max ? Math.round((Number(entry.value) / max) * 100) : 0}%</div></div>
        </div>
      </div>;
    })()}
    <p className="text-xs text-muted-foreground">Jana alkaa nollasta ja päättyy vertailun suurimpaan arvoon. Valitse kohteen nimi tai pystyviiva nähdäksesi tarkat tiedot.</p>
  </div>;
}

export function GraphChart({ graph, height = 440 }: { graph: GraphData; height?: number }) {
  const data = (graph as any).data ?? graph;
  if (data.config.chartType === "stage") return <StageChart data={data} height={height} />;
  if (data.config.chartType === "pie") return <ResponsiveContainer width="100%" height={height}><PieChart><Pie data={data.totals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="66%" label={(entry: any) => `${entry.name}: ${entry.value}`}>{data.totals.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number) => [value, metricLabels[data.config.metric] ?? data.config.metric]} /></PieChart></ResponsiveContainer>;
  if (data.config.chartType === "bar") return <ResponsiveContainer width="100%" height={height}><BarChart data={data.totals} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} /><YAxis allowDecimals={false} /><Tooltip formatter={(value: number) => [value, metricLabels[data.config.metric] ?? data.config.metric]} /><Bar dataKey="value" name={metricLabels[data.config.metric] ?? data.config.metric}>{data.totals.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}<LabelList dataKey="value" position="top" fill="currentColor" /></Bar></BarChart></ResponsiveContainer>;
  const labels = [...new Set<string>(data.series.flatMap((s: any) => s.points.map((p: Point) => p.label)))];
  const axisLabels = new Map<string, string>(data.series.flatMap((s: any) => s.points.map((p: Point) => [p.label, p.axisLabel ?? p.label])));
  const lineData = labels.map(label => { const row: Record<string, string | number> = { label: label as string }; for (const s of data.series) row[s.name] = s.points.find((p: Point) => p.label === label)?.value ?? 0; return row; });
  const maxValue = Math.max(0, ...data.series.flatMap((s: any) => s.points.map((p: Point) => p.value))); const yMax = maxValue || 1; const chartWidth = Math.max(720, lineData.length * 44);
  return <div><div className="overflow-x-auto"><div style={{ minWidth: chartWidth }}><ResponsiveContainer width="100%" height={height}><LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 16 }}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="label" interval={0} tickFormatter={(label: string) => axisLabels.get(label) ?? label} tick={{ fontSize: 18 }} /><YAxis allowDecimals={false} allowDataOverflow domain={[0, yMax]} /><Tooltip labelFormatter={(label: string) => label} />{data.series.map((s: any) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false}><LabelList dataKey={s.name} position="top" fill={s.color} fontSize={11} /></Line>)}</LineChart></ResponsiveContainer></div></div><div className="flex flex-wrap gap-x-5 gap-y-2 px-2 pt-2 text-xs">{data.series.map((s: any) => <div key={s.name} className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: s.color }} />{s.name}</div>)}</div>{data.series.some((s: any) => s.points.some((p: Point) => p.teamName)) && <p className="text-[11px] text-muted-foreground mt-2">Kuljettajagraafeissa väri seuraa kilpailukohtaista tiimiä. Tiiminvaihdos vaihtaa viivan värin kyseisessä kohdassa.</p>}</div>;
}
