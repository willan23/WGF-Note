import { createHash } from "node:crypto";

type LocalDevAuthEnv = {
  isProduction: boolean;
  oAuthServerUrl: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LocalDevLoginInput = {
  email: string;
  name: string;
};

export function isLocalDevAuthEnabled(env: LocalDevAuthEnv) {
  return !env.isProduction && !env.oAuthServerUrl;
}

export function normalizeLocalDevLoginInput(input: unknown): LocalDevLoginInput | null {
  if (!input || typeof input !== "object") return null;

  const body = input as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawName = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    return null;
  }

  const fallbackName = email.split("@")[0] || "Utilizador local";
  const name = rawName.slice(0, 120) || fallbackName;

  return { email, name };
}

export function buildLocalDevOpenId(email: string) {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `local_${digest.slice(0, 48)}`;
}
