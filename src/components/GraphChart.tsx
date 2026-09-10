import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type GraphData = {
  title: string;
  subtitle: string;
  config: { chartType: "pie" | "bar" | "line"; metric: string };
  totals: { name: string; value: number; color: string }[];
  series: { name: string; color: string; points: { label: string; value: number; round: number; teamColor?: string; teamName?: string }[] }[];
};

const metricLabels: Record<string, string> = { points: "Pisteet", wins: "Voitot", podiums: "Podiumit", dnf: "DNF:t", dsq: "DSQ:t", dns: "DNS:t", poles: "Paalut", starts: "Startit", championships: "Maailmanmestaruudet" };

export function GraphChart({ graph, height = 440 }: { graph: GraphData; height?: number }) {
  const data = graph.data ?? graph;
  const lineData = useMemo(() => {
    const labels = [...new Set(data.series.flatMap(s => s.points.map(p => p.label)))];
    return labels.map(label => {
      const row: Record<string, string | number> = { label };
      for (const s of data.series) row[s.name] = s.points.find(p => p.label === label)?.value ?? 0;
      return row;
    });
  }, [data]);

  if (data.config.chartType === "pie") {
    return <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data.totals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="72%" label>
          {data.totals.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(value: number) => [value, metricLabels[data.config.metric] ?? data.config.metric]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>;
  }

  if (data.config.chartType === "bar") {
    return <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data.totals} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(value: number) => [value, metricLabels[data.config.metric] ?? data.config.metric]} />
        <Bar dataKey="value" name={metricLabels[data.config.metric] ?? data.config.metric}>
          {data.totals.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>;
  }

  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
      <XAxis dataKey="label" angle={-35} textAnchor="end" interval="preserveStartEnd" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Legend />
      {data.series.map(s => <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
    </LineChart>
  </ResponsiveContainer>;
}
