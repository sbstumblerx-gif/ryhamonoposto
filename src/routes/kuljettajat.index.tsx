import { createFileRoute } from "@tanstack/react-router";
import { DriversList } from "./kuljettajat";

export const Route = createFileRoute("/kuljettajat")({
  component: DriversList,
});