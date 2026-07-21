import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai-search.functions";
import { toast } from "sonner";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AiChat() {
  const run = useServerFn(aiChat);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    try {
      const response = await run({ data: { messages: nextMessages.slice(-10) } });
      setMessages([...nextMessages, { role: "assistant", content: response.answer }]);
    } catch (error: any) {
      toast.error(error?.message ?? "AI-tila ei vastannut");
      setMessages(messages);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-dark p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display uppercase tracking-widest text-primary text-sm">AI-tila</h2>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">Tyhjennä</button>
        )}
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keskustele sarjan kulusta, tuloksista, kuljettajista ja tiimeistä.</p>
        ) : messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block max-w-[92%] rounded border px-3 py-2 text-sm whitespace-pre-wrap ${message.role === "user" ? "border-primary/50 bg-primary/20" : "border-primary/30 bg-black/60"}`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Kysy tarkemmin sarjasta…" className="flex-1 bg-black/70 border border-primary/30 rounded p-2 text-sm" />
        <button disabled={busy || !input.trim()} className="bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-display uppercase tracking-widest disabled:opacity-50">
          {busy ? "Vastaa…" : "Lähetä"}
        </button>
      </form>
    </section>
  );
}