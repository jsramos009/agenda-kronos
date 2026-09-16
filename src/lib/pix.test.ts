import assert from "node:assert/strict";
import test from "node:test";
import { buildPixPayload } from "./pix.ts";

function crc16(payload: string) {
  let result = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    result ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) result = (result & 0x8000) ? ((result << 1) ^ 0x1021) & 0xffff : (result << 1) & 0xffff;
  }
  return result.toString(16).toUpperCase().padStart(4, "0");
}

test("gera BR Code com chave, valor e CRC válidos", () => {
  const payload = buildPixPayload({ key: "receber@example.com", name: "Climação & Cia", city: "São Paulo", amountCents: 12345, txid: "REC-123" });
  assert.match(payload, /0014br\.gov\.bcb\.pix/);
  assert.match(payload, /5406123\.45/);
  assert.match(payload, /5913CLIMACAO  CIA/);
  assert.equal(payload.slice(-4), crc16(payload.slice(0, -4)));
});
