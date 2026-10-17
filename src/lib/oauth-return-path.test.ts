import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { oauthReturnPath } from "./oauth-return-path";
describe("OAuth consent return paths", () => {
  test("preserves the authorization ID, query and fragment", () => {
    assert.equal(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc&x=1#confirm"), "/.lovable/oauth/consent?authorization_id=abc&x=1#confirm");
  });
  test("rejects external and network redirects", () => {
    for (const value of ["https://outside.invalid", "//outside.invalid", "/\\outside.invalid/", "/\u0000bad", 42, null]) assert.equal(oauthReturnPath(value), "/");
  });
});