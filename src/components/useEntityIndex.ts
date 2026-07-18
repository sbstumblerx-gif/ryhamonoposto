import { useQuery } from "@tanstack/react-query";
import { listDrivers, listTeams } from "@/lib/content.functions";

export type EntityIndex = { slug: string; name: string; kind: "driver" | "team" }[];

export function useEntityIndex(): EntityIndex {
  const drivers = useQuery({
    queryKey: ["all-drivers-index"],
    queryFn: () => listDrivers(),
    staleTime: 60_000,
  });
  const teams = useQuery({
    queryKey: ["all-teams-index"],
    queryFn: () => listTeams(),
    staleTime: 60_000,
  });
  const d = (drivers.data ?? []).map(x => ({ slug: x.slug, name: x.name, kind: "driver" as const }));
  const t = (teams.data ?? []).map(x => ({ slug: x.slug, name: x.name, kind: "team" as const }));
  return [...d, ...t];
}
