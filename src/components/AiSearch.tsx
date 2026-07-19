import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiSearch } from "@/lib/ai-search.functions";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type Result = { kind: string; slug: string; title: string; snippet?: string };

export function AiSearch() {
  const run = useServerFn(aiSearch);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true);
    try {
      const r = await run({ data: { q: q.trim() } });
      setAnswer(r.answer);
      setResults(r.results as Result[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Haku epäonnistui");
    } finally { setBusy(false); }
  }

  function linkFor(r: Result) {
    switch (r.kind) {
      case "driver": return <Link to="/kuljettajat/$slug" params={{ slug: r.slug }} className="text-primary hover:underline">{r.title}</Link>;
      case "team": return <Link to="/tiimit/$slug" params={{ slug: r.slug }} className="text-primary hover:underline">{r.title}</Link>;
      case "race": return <Link to="/kilpailut/$slug" params={{ slug: r.slug }} className="text-primary hover:underline">{r.title}</Link>;
      case "news": return <Link to="/uutiset/$slug" params={{ slug: r.slug }} className="text-primary hover:underline">{r.title}</Link>;
      case "season": return <Link to="/tilastot/$season" params={{ season: r.slug }} className="text-primary hover:underline">{r.title}</Link>;
      default: return <span>{r.title}</span>;
    }
  }

  return (
    <div className="card-dark p-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Kysy tekoälyltä sivustosta…"
          className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-sm"
        />
        <button disabled={busy || !q.trim()} className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50">
          {busy ? "Haetaan…" : "Hae"}
        </button>
      </form>
      {(answer || results.length > 0) && (
        <div className="mt-3 text-sm space-y-2">
          {answer && <p className="text-muted-foreground" style={{ whiteSpace: "pre-wrap" }}>{answer}</p>}
          {results.length > 0 && (
            <ul className="space-y-1">
              {results.map((r, i) => (
                <li key={i} className="border-l-2 border-primary/50 pl-3">
                  {linkFor(r)}
                  {r.snippet && <div className="text-xs text-muted-foreground">{r.snippet}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
