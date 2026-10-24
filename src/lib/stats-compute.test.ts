import { test } from "node:test";
import assert from "node:assert/strict";
import { racePositionChange, emptyStatLine, rankingChanges, aggregateNationalityRows, applySprintResult, type ResultLine } from "./stats-compute";

const result = (position: number | null, status: ResultLine["status"] = "FIN"): ResultLine => ({ position, status, driver: "Kuljettaja", team: null });
const row = (name: string, points: number, change = 0) => ({ ...emptyStatLine(name, name, name, "🇫🇮"), points, positionChange: change });

test("a qualifying pole and race P2 yield -1", () => {
  assert.equal(racePositionChange(result(1), result(2)), -1);
});
test("position change accumulates gains and losses across races", () => {
  assert.equal(racePositionChange(result(8), result(3)) + racePositionChange(result(1), result(2)), 4);
});
test("missing qualifying and unclassified finishes do not invent positions", () => {
  assert.equal(racePositionChange(undefined, result(2)), 0);
  for (const status of ["DNF", "DSQ", "DNS"] as const) assert.equal(racePositionChange(result(1), result(null, status)), 0);
});
test("passing another driver in championship standings gives up 1 and down 1", () => {
  const before = [row("A", 25), row("B", 18)];
  const after = [row("A", 25), row("B", 43)];
  assert.equal(rankingChanges(after, before, null).get("B"), 1);
  assert.equal(rankingChanges(after, before, null).get("A"), -1);
});
test("each selected statistic uses its own ranking, including negative position changes", () => {
  const before = [row("A", 100, -1), row("B", 10, -3)];
  const after = [row("A", 125, -2), row("B", 28, 2)];
  assert.equal(rankingChanges(after, before, "positionChange").get("B"), 1);
  assert.equal(rankingChanges(after, before, "positionChange").get("A"), -1);
  assert.equal(rankingChanges(after, before, "points").get("B"), 0);
});
test("new drivers and first-race standings have no fabricated arrows", () => {
  assert.equal(rankingChanges([row("A", 25)], [], "points").has("A"), false);
});
test("ties share rank and lower best finishing position ranks higher", () => {
  const a = { ...row("A", 25), wins: 1, best: 2 };
  const b = { ...row("B", 18), wins: 1, best: 1 };
  assert.equal(rankingChanges([a, b], [a, { ...b, wins: 0 }], "wins").get("B"), 1);
  assert.equal(rankingChanges([a, b], [{ ...a, best: 1 }, { ...b, best: 2 }], "best").get("B"), 1);
});
test("nationalities sum position changes while sprint points do not alter race position change", () => {
  const a = row("A", 25, -1), b = row("B", 18, 5);
  assert.equal(aggregateNationalityRows([a, b])[0]?.positionChange, 4);
  applySprintResult(a, result(1), "sprint");
  assert.equal(a.positionChange, -1);
});