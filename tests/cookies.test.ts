import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "../server/_core/cookies";

describe("session cookies", () => {
  it("uses lax cookies for local plain-http development", () => {
    const options = getSessionCookieOptions({
      hostname: "127.0.0.1",
      protocol: "http",
      headers: {},
    } as Request);

    expect(options).toMatchObject({
      domain: undefined,
      secure: false,
      sameSite: "lax",
    });
  });

  it("uses cross-site cookies for secure hosted environments", () => {
    const options = getSessionCookieOptions({
      hostname: "3000-demo.manuspre.computer",
      protocol: "https",
      headers: {},
    } as Request);

    expect(options).toMatchObject({
      domain: ".manuspre.computer",
      secure: true,
      sameSite: "none",
    });
  });
});
