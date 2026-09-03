import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type AsaasEnvironment = "sandbox" | "production";

type EncryptedSecret = {
  encrypted: string;
  iv: string;
  authTag: string;
};

type AsaasErrorBody = {
  errors?: Array<{ code?: string; description?: string }>;
};

export class AsaasApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AsaasApiError";
  }
}

export async function asaasRequest<T>(
  environment: AsaasEnvironment,
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const baseUrl = environment === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      access_token: apiKey,
      "content-type": "application/json",
      "user-agent": "Kronos/1.0 agendakronos.vercel.app",
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });

  const body = (await response.json().catch(() => ({}))) as T & AsaasErrorBody;
  if (!response.ok) {
    const detail = body.errors?.map((item) => item.description).filter(Boolean).join(" ");
    throw new AsaasApiError(detail || "O Asaas recusou a operação.", response.status);
  }

  return body;
}

export function encryptAsaasApiKey(apiKey: string): EncryptedSecret {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptAsaasApiKey(secret: EncryptedSecret): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(secret.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function normalizeAsaasStatus(value: unknown) {
  const normalized = String(value ?? "unknown").toLocaleLowerCase("en-US");
  const supported = new Set([
    "pending", "confirmed", "received", "received_in_cash", "overdue",
    "refunded", "refund_requested", "refund_in_progress", "deleted",
    "cancelled", "chargeback_requested", "chargeback_dispute",
    "awaiting_chargeback_reversal", "dunning_requested", "dunning_received",
    "awaiting_risk_analysis",
  ]);
  return supported.has(normalized) ? normalized : "unknown";
}

function getEncryptionKey() {
  const encoded = process.env.ASAAS_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("A proteção das credenciais do Asaas não está configurada.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("A chave de proteção das credenciais do Asaas é inválida.");
  return key;
}
