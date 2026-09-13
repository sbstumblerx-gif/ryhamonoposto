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

export function AiChatPanel({
  pageContext,
  initialConversationId = null,
  onConversationChange,
  showLinkToPage = true,
  compact = false,
}: Props) {
  const run = useServerFn(aiChat);
  const convos = useConvos();

  const [activeId, setActiveId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load messages when active conversation changes (external)
  useEffect(() => {
    if (activeId) {
      const c = getConvo(activeId);
      setMessages(c?.messages ?? []);
    } else {
      setMessages([]);
    }
  }, [activeId]);

  // Always open a conversation at its latest message.
  // requestAnimationFrame waits until the message list has rendered and its
  // scroll height is available, so this does not scroll the whole page.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId, messages.length]);

  useEffect(() => {
    onConversationChange?.(activeId);
  }, [activeId, onConversationChange]);

  // If active conversation is edited elsewhere, sync
  useEffect(() => {
    if (!activeId) return;
    const c = convos.find((x) => x.id === activeId);
    if (c && c.messages.length !== messages.length) {
      setMessages(c.messages);
    }
  }, [convos, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTitle = useMemo(() => {
    if (!activeId) return "Uusi keskustelu";
    return convos.find((c) => c.id === activeId)?.title ?? "Uusi keskustelu";
  }, [activeId, convos]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: AiMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await run({
        data: {
          messages: next.slice(-10),
          pageContext: pageContext ?? undefined,
        },
      });
      const finalMsgs: AiMsg[] = [...next, { role: "assistant", content: res.answer }];
      setMessages(finalMsgs);
      // Auto-persist if already saved
      if (activeId) {
        const existing = getConvo(activeId);
        upsertConvo({
          id: activeId,
          title: existing?.title ?? autoTitle(finalMsgs),
          updatedAt: Date.now(),
          messages: finalMsgs,
        });
      }
    } catch (error: any) {
      toast.error(error?.message ?? "AI-tila ei vastannut");
      setMessages(messages);
    } finally {
      setBusy(false);
    }
  }

  function saveAsNew() {
    if (messages.length === 0) {
      toast.info("Kirjoita ensin viesti");
      return;
    }
    const id = newConvoId();
    const convo: AiConvo = {
      id,
      title: autoTitle(messages),
      updatedAt: Date.now(),
      messages,
    };
    upsertConvo(convo);
    setActiveId(id);
    toast.success("Tallennettu keskusteluihin");
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  return (
    <section className="card-dark p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display uppercase tracking-widest text-primary text-sm">AI-tila</h2>
          {pageContext && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-black/60 border border-primary/30 rounded px-2 py-0.5">
              Sivun konteksti
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {showLinkToPage && (
            <Link
              to="/tekoalytila"
              className="text-[10px] uppercase tracking-widest border border-primary/50 text-primary rounded px-2 py-1 hover:bg-primary/20"
            >
              AI-keskustelut →
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={activeId ?? ""}
          onChange={(e) => setActiveId(e.target.value || null)}
          className="flex-1 min-w-[160px] bg-black/70 border border-primary/30 rounded p-1.5 text-xs font-display uppercase tracking-widest"
        >
          <option value="">Uusi keskustelu</option>
          {convos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          onClick={newChat}
          className="text-[10px] uppercase tracking-widest border border-primary/40 rounded px-2 py-1 hover:border-primary"
        >
          + Uusi
        </button>
        {!activeId && messages.length > 0 && (
          <button
            onClick={saveAsNew}
            className="text-[10px] uppercase tracking-widest bg-primary text-primary-foreground rounded px-2 py-1"
          >
            Tallenna keskusteluun
          </button>
        )}
      </div>

      <div className={`space-y-2 overflow-y-auto pr-1 ${compact ? "max-h-56" : "max-h-80"}`}>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {pageContext
              ? "Kysy tästä sivusta — AI etsii vastauksia sivun sisällöstä ja tarvittaessa muualta."
              : "Keskustele sarjan kulusta, tuloksista, kuljettajista ja tiimeistä."}
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[92%] rounded border px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "border-primary/50 bg-primary/20"
                    : "border-primary/30 bg-black/60"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={pageContext ? "Kysy tästä sivusta…" : "Kysy tarkemmin sarjasta…"}
          className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-sm"
        />
        <button
          disabled={busy || !input.trim()}
          className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? "Vastaa…" : "Lähetä"}
        </button>
      </form>
    </section>
  );
}
