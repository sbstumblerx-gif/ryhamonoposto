import { createFileRoute } from "@tanstack/react-router";
import { TeamsList } from "./tiimit";

export const Route = createFileRoute("/tiimit/")({
  component: TeamsList,
});