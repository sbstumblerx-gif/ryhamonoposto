import { createFileRoute } from "@tanstack/react-router";
import { StatsIndex } from "./tilastot";

export const Route = createFileRoute("/tilastot/")({
  head: () => ({ meta: [
    { title: "Tilastokaudet | RyhäMonoposto" },
    { name: "description", content: "RyhäMonoposton kausien ja koko historian kuljettaja- ja valmistajatilastot." },
    { property: "og:title", content: "Tilastokaudet | RyhäMonoposto" },
    { property: "og:description", content: "Kuljettajien ja valmistajien tulokset, sijoitusmuutokset ja kausivertailut." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: StatsIndex,
});