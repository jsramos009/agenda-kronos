import assert from "node:assert/strict";
import test from "node:test";
import { hasSupabaseSessionCookie } from "./session-cookie.ts";

test("detecta cookie de sessão inteiro ou fragmentado", () => {
  assert.equal(
    hasSupabaseSessionCookie([{ name: "sb-project-auth-token" }]),
    true,
  );
  assert.equal(
    hasSupabaseSessionCookie([{ name: "sb-project-auth-token.0" }]),
    true,
  );
});

test("ignora cookie PKCE e cookies sem sessão", () => {
  assert.equal(
    hasSupabaseSessionCookie([
      { name: "sb-project-auth-token-code-verifier" },
      { name: "kronos_workspace" },
    ]),
    false,
  );
});
