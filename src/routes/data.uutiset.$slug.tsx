import { createFileRoute } from "@tanstack/react-router";
import { getNews } from "@/lib/content.functions";

export const Route = createFileRoute("/data/uutiset/$slug")({
  head: ({ params }) => ({ meta: [{ title: `RyhäMonoposto data — uutinen ${params.slug}` }] }),
  loader: async ({ params }) => getNews({ data: { slug: params.slug } }),
  component: NewsDataPage,
});

function NewsDataPage() {
  const n = Route.useLoaderData() as any;
  if (!n) return <pre className="mx-auto max-w-5xl px-4 py-8">Uutista ei löydy.</pre>;
  return <main className="mx-auto max-w-5xl px-4 py-8"><pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">{[
    "RYHÄMONOPOSTO — UUTINEN",
    "",
    `Otsikko: ${n.title}`,
    `Slug: ${n.slug}`,
    `Julkaistu: ${n.published_at ?? "Ei tiedossa"}`,
    "",
    "Tiivistelmä:",
    n.excerpt ?? "Ei tiivistelmää.",
    "",
    "Sisältö:",
    n.content ?? "Ei sisältöä.",
    "",
    `Normaali sivu: /uutiset/${n.slug}`,
  ].join("\n")}</pre></main>;
}
