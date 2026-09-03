import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeAsaasStatus } from "@/lib/asaas";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AsaasWebhookPayload = {
  id?: unknown;
  event?: unknown;
  payment?: {
    id?: unknown;
    status?: unknown;
    netValue?: unknown;
    paymentDate?: unknown;
    confirmedDate?: unknown;
    invoiceUrl?: unknown;
    bankSlipUrl?: unknown;
  };
};

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  const { organizationId } = await context.params;
  if (!UUID_PATTERN.test(organizationId)) return NextResponse.json({ ok: false }, { status: 404 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 262_144) return NextResponse.json({ ok: false }, { status: 413 });

  const token = request.headers.get("asaas-access-token") ?? "";
  const admin = createAdminClient();
  const { data: connection } = await admin.from("payment_provider_connections")
    .select("webhook_token_hash, status")
    .eq("organization_id", organizationId)
    .eq("provider", "asaas")
    .maybeSingle();

  if (!connection || connection.status !== "connected" || !matchesHash(token, connection.webhook_token_hash)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    const rawPayload = await request.text();
    if (Buffer.byteLength(rawPayload, "utf8") > 262_144) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
    payload = JSON.parse(rawPayload) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventId = cleanIdentifier(payload.id);
  const eventType = cleanIdentifier(payload.event);
  const paymentId = cleanIdentifier(payload.payment?.id);
  if (!eventId || !eventType) return NextResponse.json({ ok: false }, { status: 400 });

  const eventRecord = {
    organization_id: organizationId,
    provider: "asaas",
    provider_event_id: eventId,
    event_type: eventType,
    provider_payment_id: paymentId,
    payload,
  };
  const { error: eventError } = await admin.from("payment_webhook_events").insert(eventRecord);
  if (eventError && eventError.code !== "23505") {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (eventError?.code === "23505") {
    const { data: existing } = await admin.from("payment_webhook_events")
      .select("processed_at")
      .eq("organization_id", organizationId)
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (existing?.processed_at) return NextResponse.json({ ok: true });
  }

  try {
    if (paymentId) {
      const payment = payload.payment ?? {};
      const update: Record<string, unknown> = {
        status: normalizeAsaasStatus(payment.status),
      };
      if (typeof payment.netValue === "number" && Number.isFinite(payment.netValue)) {
        update.net_amount_cents = Math.round(payment.netValue * 100);
      }
      if (typeof payment.invoiceUrl === "string" && payment.invoiceUrl.startsWith("https://")) {
        update.invoice_url = payment.invoiceUrl;
      }
      if (typeof payment.bankSlipUrl === "string" && payment.bankSlipUrl.startsWith("https://")) {
        update.bank_slip_url = payment.bankSlipUrl;
      }
      const paidAt = asDate(payment.paymentDate ?? payment.confirmedDate);
      if (paidAt) update.paid_at = paidAt;

      const { error } = await admin.from("payment_charges")
        .update(update)
        .eq("organization_id", organizationId)
        .eq("provider", "asaas")
        .eq("provider_payment_id", paymentId);
      if (error) throw error;
    }

    await admin.from("payment_webhook_events").update({
      processed_at: new Date().toISOString(),
      processing_error: null,
    }).eq("organization_id", organizationId).eq("provider_event_id", eventId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    await admin.from("payment_webhook_events").update({
      processing_error: error instanceof Error ? error.message.slice(0, 500) : "Falha de processamento",
    }).eq("organization_id", organizationId).eq("provider_event_id", eventId);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function matchesHash(value: string, expectedHex: string) {
  if (!value || !/^[0-9a-f]{64}$/i.test(expectedHex)) return false;
  const actual = createHash("sha256").update(value).digest();
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cleanIdentifier(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 180 || !/^[A-Za-z0-9_&.-]+$/.test(cleaned)) return null;
  return cleaned;
}

function asDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
