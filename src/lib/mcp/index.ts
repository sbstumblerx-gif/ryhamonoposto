import { defineMcp } from "@lovable.dev/mcp-js";
import listRaces from "./tools/list-races";
import listDrivers from "./tools/list-drivers";
import listSessions from "./tools/list-calendar-sessions";
import getStandings from "./tools/get-standings";
import getTeamStandings from "./tools/get-team-standings";
import { getDriverContracts, getTeamEngine } from "./tools/get-contracts-and-engines";
import getLatestRace from "./tools/get-latest-race";
import getRaceResult from "./tools/get-race-result";
import searchRyhamonoposto from "./tools/search-ryhamonoposto";

export default defineMcp({
  name: "ryh-monoposto",
  title: "RyhäMonoposto",
  version: "0.3.0",
  instructions: "Public, unauthenticated read-only access to RyhäMonoposto's public series data. Available information includes active-season driver and team standings, driver contract records, team engine suppliers, races and results, calendar sessions, and site search. No sign-in is required. Tools only perform bounded reads of explicitly selected fields; they cannot create, update or delete anything. Standings without a year always mean the explicitly active season, never all-time totals. Missing or unknown contract values must not be guessed.",
  tools: [
    listRaces,
    listDrivers,
    listSessions,
    getStandings,
    getTeamStandings,
    getDriverContracts,
    getTeamEngine,
    getLatestRace,
    getRaceResult,
    searchRyhamonoposto,
  ],
});