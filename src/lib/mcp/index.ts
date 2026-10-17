import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRaces from "./tools/list-races";
import listDrivers from "./tools/list-drivers";
import listSessions from "./tools/list-calendar-sessions";
import readProfile from "./tools/read-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";
export default defineMcp({
  name: "ryh-monoposto", title: "RyhäMonoposto", version: "0.1.0",
  instructions: "Read RyhäMonoposto series races, drivers, calendar sessions and your own profile. These tools do not edit or publish anything. Use only returned facts; missing values are unknown. Driver contract 'none' means no contract and 'unknown' means unknown duration, not no seat.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated", requireOAuthClientClaim: true }),
  tools: [listRaces, listDrivers, listSessions, readProfile],
});