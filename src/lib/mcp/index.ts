import { defineMcp } from "@lovable.dev/mcp-js";
import listRaces from "./tools/list-races";
import listDrivers from "./tools/list-drivers";
import listSessions from "./tools/list-calendar-sessions";

export default defineMcp({
  name: "ryh-monoposto",
  title: "RyhäMonoposto",
  version: "0.2.0",
  instructions: "Public read-only access to RyhäMonoposto races, drivers and calendar sessions. No sign-in is required. These tools only read explicitly selected public series data; they cannot create, update or delete anything. Do not infer missing values. A missing contract end year means no recorded end year, not necessarily that a contract is indefinite.",
  tools: [listRaces, listDrivers, listSessions],
});