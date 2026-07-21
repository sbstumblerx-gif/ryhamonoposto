import { createFileRoute } from "@tanstack/react-router";
import { NewsList } from "./uutiset";

export const Route = createFileRoute("/uutiset")({
  component: NewsList,
});