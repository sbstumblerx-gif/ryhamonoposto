import { createFileRoute } from "@tanstack/react-router";
import { StatsIndex } from "./tilastot";

export const Route = createFileRoute("/tilastot")({
  component: StatsIndex,
});