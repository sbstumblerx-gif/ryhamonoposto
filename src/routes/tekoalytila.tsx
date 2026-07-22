import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AiChatPanel } from "@/components/AiChatPanel";
import { deleteConvo, renameConvo, useConvos } from "@/lib/ai-conversations";
import { toast } from "sonner";

export const Route = createFileRoute("/tekoalytila")({
  head: () => ({
    meta: [
      { title: "AI-keskustelut — RyhäMonoposto" },
      { name: "description", content: "Keskustele RyhäMonoposto-sarjan AI-tilan kanssa ja hallinnoi tallennettuja keskusteluja." },
      { property: "og:title", content: "AI-keskustelut — RyhäMonoposto" },
      { property: "og:description", content: "Keskustele RyhäMonoposto-sarjan AI-tilan kanssa ja hallinnoi tallennettuja keskusteluja." },
    ],
  }),
  component: AiChatRoute,
});

function AiChatRoute() {
  const convos = useConvos();
  const [activeId, setActiveId] = useState<string | null>(null);

  function rename(id: string, current: string) {
    const t = prompt("Uusi nimi:", current);
    if (t && t.trim()) {
      renameConvo(id, t.trim());
      toast.success("Nimetty uudelleen");
    }
  }

  function remove(id: string) {
    if (!confirm("Poistetaanko keskustelu?")) return;
    deleteConvo(id);
    if (activeId === id) setActiveId(null);
    toast.success("Poistettu");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-[260px_1fr] gap-4">
      <aside className="card-dark p-3 space-y-2 h-fit">
        <div className="font-display uppercase tracking-widest text-primary text-sm">Keskustelut</div>
        <button
          onClick={() => setActiveId(null)}
          className={`w-full text-left text-sm rounded px-2 py-1.5 border ${
            !activeId ? "border-primary bg-primary/10" : "border-primary/30 hover:border-primary/60"
          }`}
        >
          + Uusi keskustelu
        </button>
        <div className="hairline-red" />
        {convos.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Ei tallennettuja keskusteluja.</p>
        ) : (
          <ul className="space-y-1">
            {convos.map((c) => (
              <li key={c.id}>
                <div className={`group rounded border px-2 py-1.5 ${activeId === c.id ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/60"}`}>
                  <button onClick={() => setActiveId(c.id)} className="w-full text-left text-sm truncate">
                    {c.title}
                  </button>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => rename(c.id, c.title)} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">
                      Nimeä
                    </button>
                    <button onClick={() => remove(c.id)} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">
                      Poista
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div>
        <h1 className="font-display uppercase tracking-widest text-2xl text-primary mb-3">AI-keskustelut</h1>
        <div className="hairline-red mb-4" />
        <AiChatPanel
          key={activeId ?? "new"}
          initialConversationId={activeId}
          onConversationChange={setActiveId}
          showLinkToPage={false}
        />
      </div>
    </div>
  );
}
