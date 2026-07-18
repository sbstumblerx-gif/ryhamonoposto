import { createFileRoute } from "@tanstack/react-router";
import { RacesIndex } from "./kilpailut";

export const Route = createFileRoute("/kilpailut/")({
  component: RacesIndex,
});
