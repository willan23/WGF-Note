import { describe, expect, it } from "vitest";
import {
  buildLocalDevOpenId,
  isLocalDevAuthEnabled,
  normalizeLocalDevLoginInput,
} from "../server/_core/local-dev-auth";

describe("local development auth", () => {
  it("is enabled only outside production and without external OAuth", () => {
    expect(isLocalDevAuthEnabled({ isProduction: false, oAuthServerUrl: "" })).toBe(true);
    expect(
      isLocalDevAuthEnabled({
        isProduction: false,
        oAuthServerUrl: "https://auth.example.com",
      }),
    ).toBe(false);
    expect(isLocalDevAuthEnabled({ isProduction: true, oAuthServerUrl: "" })).toBe(false);
  });

  it("normalizes safe login input and derives a stable compact openId", () => {
    expect(
      normalizeLocalDevLoginInput({
        email: "  UTILIZADOR@example.com ",
        name: "  Utilizador Local ",
      }),
    ).toEqual({
      email: "utilizador@example.com",
      name: "Utilizador Local",
    });

    const first = buildLocalDevOpenId("UTILIZADOR@example.com");
    const second = buildLocalDevOpenId("utilizador@example.com");
    expect(first).toBe(second);
    expect(first).toMatch(/^local_[a-f0-9]{48}$/);
    expect(first.length).toBeLessThanOrEqual(64);
  });

  it("rejects invalid email and falls back to the email prefix for missing names", () => {
    expect(normalizeLocalDevLoginInput({ email: "sem-arroba", name: "Teste" })).toBeNull();
    expect(normalizeLocalDevLoginInput({ email: "ana@example.com" })).toEqual({
      email: "ana@example.com",
      name: "ana",
    });
  });
});
