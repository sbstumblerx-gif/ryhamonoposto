import { describe, expect, test } from "bun:test";
import { oauthReturnPath } from "./oauth-return-path";
describe("OAuth consent return paths", () => {
  test("preserves the authorization ID, query and fragment", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc&x=1#confirm")).toBe("/.lovable/oauth/consent?authorization_id=abc&x=1#confirm");
  });
  test("rejects external and network redirects", () => {
    for (const value of ["https://outside.invalid", "//outside.invalid", "/\\outside.invalid/", "/\u0000bad", 42, null]) expect(oauthReturnPath(value)).toBe("/");
  });
});