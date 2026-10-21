import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Read the deployed database's actual access rules rather than mocking RLS.
function query(sql: string): unknown {
  return JSON.parse(execFileSync("lovable", ["supabase", "query", sql, "--json"], { encoding: "utf8" }));
}
function output(sql: string): string { return JSON.stringify(query(sql)); }

describe("deployed private user data protections", () => {
  test("prediction rows are readable only by their owner, never anonymously", () => {
    const result = output(`select
      not has_table_privilege('anon', 'public.predictions', 'SELECT') as anonymous_blocked,
      count(*) = 1 and bool_and(roles = array['authenticated']::name[] and qual = '(user_id = auth.uid())') as owner_only
      from pg_policies where schemaname = 'public' and tablename = 'predictions' and cmd in ('SELECT', 'ALL')`);
    assert.match(result, /"anonymous_blocked":true/);
    assert.match(result, /"owner_only":true/);
  });
  test("votes are owner-only and result counts require a vote or a closed poll", () => {
    const result = output(`select
      count(*) = 1 and bool_and(roles = array['authenticated']::name[] and qual = '(user_id = auth.uid())') as owner_only,
      not has_function_privilege('anon', 'public.read_poll_result_counts(uuid)', 'EXECUTE') as anonymous_blocked
      from pg_policies where schemaname = 'public' and tablename = 'poll_votes' and cmd in ('SELECT', 'ALL')`);
    assert.match(result, /"owner_only":true/);
    assert.match(result, /"anonymous_blocked":true/);
    const definition = output(`select pg_get_functiondef('public.read_poll_result_counts(uuid)'::regprocedure) as definition`);
    assert.match(definition, /mine\.user_id = auth\.uid\(\)/);
    assert.match(definition, /p\.closes_at <= now\(\)/);
  });
  test("profiles are owner-only and public projection contains no linked account fields", () => {
    const result = output(`select
      not has_table_privilege('anon', 'public.profiles', 'SELECT') as anonymous_blocked,
      count(*) = 1 and bool_and(roles = array['authenticated']::name[] and qual = '(id = auth.uid())') as owner_only
      from pg_policies where schemaname = 'public' and tablename = 'profiles' and cmd in ('SELECT', 'ALL')`);
    assert.match(result, /"anonymous_blocked":true/);
    assert.match(result, /"owner_only":true/);
    const definition = output(`select pg_get_function_result('public.read_public_profile(uuid)'::regprocedure) as fields`);
    assert.match(definition, /TABLE\(id uuid, display_name text, avatar_url text, club_tag_club_id uuid\)/);
    assert.doesNotMatch(definition, /sv_user_id|sv_linked_at|sv_reward_claimed/);
  });
  test("fan point events cannot be read by anonymous or signed-in clients", () => {
    const result = output(`select
      not has_table_privilege('anon', 'public.fan_point_events', 'SELECT') as anonymous_blocked,
      not has_table_privilege('authenticated', 'public.fan_point_events', 'SELECT') as authenticated_blocked,
      count(*) = 0 as no_read_policies
      from pg_policies where schemaname = 'public' and tablename = 'fan_point_events' and cmd in ('SELECT', 'ALL')`);
    assert.match(result, /"anonymous_blocked":true/);
    assert.match(result, /"authenticated_blocked":true/);
    assert.match(result, /"no_read_policies":true/);
  });
});