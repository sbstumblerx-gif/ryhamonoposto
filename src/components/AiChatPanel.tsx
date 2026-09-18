import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai-search.functions";
import {
  type AiConvo,
  type AiMsg,
  autoTitle,
  getConvo,
  newConvoId,
  upsertConvo,
  useConvos,
} from "@/lib/ai-conversations";
import { toast } from "sonner";

type Props = {
  pageContext?: string;
  initialConversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
  showLinkToPage?: boolean;
  compact?: boolean;
};

function workQueue(text: string) {
  const q = text.toLowerCase();
  const tasks: string[] = [];
  if (/kuljett|kuski|driver/.test(q)) tasks.push("Etsitään kuljettajat...");
  if (/tiim|team|talli/.test(q)) tasks.push("Etsitään tiimit...");
  if (/uut|news/.test(q)) tasks.push("Etsitään uutiset...");
  if (/sopim|contract/.test(q)) tasks.push("Etsitään sopimukset...");
  if (/tilast|piste|pisteet|mestaru|sijoit|ennätys/.test(q)) tasks.push("Etsitään tilastot...");
  if (/madrid/.test(q)) tasks.push("Etsitään Madrid 2026...");
  if (tasks.length === 0) tasks.push("Etsitään kuljettajat...", "Etsitään tiimit...", "Etsitään uutiset...", "Etsitään tilastot...");
  return tasks;
}

export function AiChatPanel({ pageContext, initialConversationId = null, onConversationChange, showLinkToPage = true, compact = false }: Props) {
  const run = useServerFn(aiChat);
  const convos = useConvos();
  const [activeId, setActiveId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [workStep, setWorkStep] = useState(0);
  const [workItems, setWorkItems] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }

  useEffect(() => {
    if (activeId) {
      const c = getConvo(activeId);
      setMessages(c?.messages ?? []);
    } else setMessages([]);
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [activeId]);

  useEffect(() => { onConversationChange?.(activeId); }, [activeId, onConversationChange]);

  useEffect(() => {
    if (!activeId) return;
    const c = convos.find((x) => x.id === activeId);
    if (c && c.messages.length !== messages.length) {
      setMessages(c.messages);
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [convos, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { requestAnimationFrame(() => scrollToBottom(busy ? "smooth" : "auto")); }, [messages.length, busy, workStep]);

  useEffect(() => {
    if (!busy || workItems.length === 0) return;
    setWorkStep(0);
    const timer = window.setInterval(() => setWorkStep(step => Math.min(step + 1, workItems.length - 1)), 650);
    return () => window.clearInterval(timer);
  }, [busy, workItems.length]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: AiMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setWorkItems(workQueue(text));
    setWorkStep(0);
    setBusy(true);
    requestAnimationFrame(() => scrollToBottom("smooth"));
    try {
      const res = await run({ data: { messages: next.slice(-10), pageContext: pageContext ?? undefined } });
      const finalMsgs: AiMsg[] = [...next, { role: "assistant", content: res.answer, sources: res.sources }];
      setMessages(finalMsgs);
      if (activeId) {
        const existing = getConvo(activeId);
        upsertConvo({ id: activeId, title: existing?.title ?? autoTitle(finalMsgs), updatedAt: Date.now(), messages: finalMsgs });
      }
    } catch (error: any) {
      toast.error(error?.message ?? "AI-tila ei vastannut");
      setMessages(messages);
    } finally { setBusy(false); }
  }

  function saveAsNew() {
    if (!messages.length) return void toast.info("Kirjoita ensin viesti");
    const id = newConvoId();
    upsertConvo({ id, title: autoTitle(messages), updatedAt: Date.now(), messages });
    setActiveId(id);
    toast.success("Tallennettu keskusteluihin");
  }

  function newChat() { setActiveId(null); setMessages([]); setInput(""); }

  return (
    <section className="card-dark p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display uppercase tracking-widest text-primary text-sm">AI-tila</h2>
          {pageContext && <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-black/60 border border-primary/30 rounded px-2 py-0.5">Sivun konteksti</span>}
        </div>
        {showLinkToPage && <Link to="/tekoalytila" className="text-[10px] uppercase tracking-widest border border-primary/50 text-primary rounded px-2 py-1 hover:bg-primary/20">AI-keskustelut →</Link>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={activeId ?? ""} onChange={e => setActiveId(e.target.value || null)} className="flex-1 min-w-[160px] bg-black/70 border border-primary/30 rounded p-1.5 text-xs font-display uppercase tracking-widest" aria-label="Valitse AI-keskustelu">
          <option value="">Uusi keskustelu</option>
          {convos.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button onClick={newChat} className="text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1 hover:border-primary">+ Uusi</button>
        {!activeId && messages.length > 0 && <button onClick={saveAsNew} className="text-[10px] uppercase tracking-widest bg-primary text-primary-foreground rounded px-2 py-1">Tallenna keskusteluun</button>}
      </div>

      <div ref={scrollRef} className={`space-y-3 overflow-y-auto pr-1 ${compact ? "max-h-56" : "max-h-80"}`}>
        {!messages.length ? (
          <p className="text-sm text-muted-foreground">{pageContext ? "Kysy tästä sivusta — AI etsii vastauksia sivun sisällöstä ja tarvittaessa muualta." : "Keskustele sarjan kulusta, tuloksista, kuljettajista ja tiimeistä."}</p>
        ) : messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap shadow-sm ${m.role === "user" ? "rounded-br-md bg-white text-black border border-black/10" : "rounded-bl-md bg-primary text-white border border-primary/80"}`}>
              <div className="font-medium">{m.content}</div>
              {m.role === "assistant" && m.sources?.length ? (
                <details className="mt-3 border-t border-white/25 pt-2">
                  <summary className="cursor-pointer select-none text-xs font-semibold tracking-wide text-white/95 hover:text-white">Näytä lähteet ({m.sources.length})</summary>
                  <div className="mt-2 space-y-2">
                    {m.sources.map((source, index) => (
                      <a
                        key={`${source.url}-${index}`}
                        href={source.url}
                        target={source.url.startsWith("http") ? "_blank" : undefined}
                        rel={source.url.startsWith("http") ? "noreferrer noopener" : undefined}
                        className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-white no-underline hover:bg-white/20 transition"
                      >
                        <span className="shrink-0 text-sm">🔗</span>
                        <span className="min-w-0 flex-1 truncate">{source.title}</span>
                        <span className="shrink-0 text-white/70">↗</span>
                      </a>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-primary text-white border border-primary/80 px-4 py-3 shadow-sm">
              <div className="font-medium text-sm leading-6">Vastaa</div>
              <div className="mt-2 space-y-1 text-xs text-white/90">
                {workItems.slice(0, workStep + 1).map((item, index) => <div key={`${item}-${index}`} className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" /><span>{item}</span></div>)}
                <div className="pt-1 text-white/70">Analysoidaan tietoja…</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={pageContext ? "Kysy tästä sivusta…" : "Kysy tarkemmin sarjasta…"} className="flex-1 bg-black/70 border border-primary/30 rounded-xl p-2.5 text-sm" />
        <button disabled={busy || !input.trim()} className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50">{busy ? "Vastaa…" : "Lähetä"}</button>
      </form>
    </section>
  );
}
