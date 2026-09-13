import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { label: string; axisLabel?: string; value: number; round: number; teamColor?: string; teamName?: string };
type GraphData = {
  title: string;
  subtitle: string;
  config: { chartType: "pie" | "bar" | "line"; metric: string };
  totals: { name: string; value: number; color: string }[];
  series: { name: string; color: string; points: Point[]; segments?: { color: string; data: Point[] }[] }[];
};

const metricLabels: Record<string, string> = { points: "Pisteet", wins: "Voitot", podiums: "Podiumit", dnf: "DNF:t", dsq: "DSQ:t", dns: "DNS:t", poles: "Paalut", starts: "Startit", championships: "Maailmanmestaruudet" };

export function GraphChart({ graph, height = 440 }: { graph: GraphData; height?: number }) {
  const data = (graph as any).data ?? graph;
  if (data.config.chartType === "pie") return <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie data={data.totals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="72%" label>
        {data.totals.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
      </Pie>
      <Tooltip formatter={(value: number) => [value, metricLabels[data.config.metric] ?? data.config.metric]} />
    </PieChart>
  </ResponsiveContainer>;

  if (data.config.chartType === "bar") return <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data.totals} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
      <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} />
      <YAxis allowDecimals={false} />
      <Tooltip formatter={(value: number) => [value, metricLabels[data.config.metric] ?? data.config.metric]} />
      <Bar dataKey="value" name={metricLabels[data.config.metric] ?? data.config.metric}>
        {data.totals.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>;

  const labels = [...new Set<string>(data.series.flatMap((s: any) => s.points.map((p: Point) => p.label)))];
  const axisLabels = new Map<string, string>(data.series.flatMap((s: any) => s.points.map((p: Point) => [p.label, p.axisLabel ?? p.label])));
  const lineData = labels.map(label => {
    const row: Record<string, string | number> = { label: label as string };
    for (const s of data.series) row[s.name] = s.points.find((p: Point) => p.label === label)?.value ?? 0;
    return row;
  });
  const maxValue = Math.max(0, ...data.series.flatMap((s: any) => s.points.map((p: Point) => p.value)));
  const yMax = maxValue || 1;
  const chartWidth = Math.max(720, lineData.length * 44);

  return <div>
    <div className="overflow-x-auto">
      <div style={{ minWidth: chartWidth }}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" interval={0} tickFormatter={(label: string) => axisLabels.get(label) ?? label} tick={{ fontSize: 18 }} />
            <YAxis allowDecimals={false} allowDataOverflow domain={[0, yMax]} />
            <Tooltip labelFormatter={(label: string) => label} />
            {data.series.map((s: any) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 px-2 pt-2 text-xs">
      {data.series.map((s: any) => <div key={s.name} className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: s.color }} />{s.name}</div>)}
    </div>
    {data.series.some((s: any) => s.points.some((p: Point) => p.teamName)) && <p className="text-[11px] text-muted-foreground mt-2">Kuljettajagraafeissa väri seuraa kilpailukohtaista tiimiä. Tiiminvaihdos vaihtaa viivan värin kyseisessä kohdassa.</p>}
  </div>;
}
