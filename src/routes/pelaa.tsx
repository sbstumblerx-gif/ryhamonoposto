import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pelaa")({
  head: () => ({ meta: [{ title: "Pelaa — RyhäMonoposto" }] }),
  component: PlayPage,
});

function PlayPage() {
  return <main className="mx-auto max-w-4xl px-4 py-8"><div className="card-dark p-6 border-l-2 border-primary"><div className="text-2xl mb-2">🎮</div><h1 className="font-display uppercase tracking-widest text-primary text-xl">Pelaa</h1><p className="mt-3 text-sm text-muted-foreground">Pelaa-osio rakennetaan myöhemmin.</p></div></main>;
}
