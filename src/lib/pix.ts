const removeAccents = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let result = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    result ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) result = (result & 0x8000) ? ((result << 1) ^ 0x1021) & 0xffff : (result << 1) & 0xffff;
  }
  return result.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload({ key, name, city, amountCents, txid }: { key: string; name: string; city: string; amountCents: number; txid: string }) {
  const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", key.trim());
  const safeName = removeAccents(name).replace(/[^A-Za-z0-9 ]/g, "").trim().toUpperCase().slice(0, 25) || "RECEBEDOR";
  const safeCity = removeAccents(city).replace(/[^A-Za-z0-9 ]/g, "").trim().toUpperCase().slice(0, 15) || "SAO PAULO";
  const safeTxid = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const amount = (amountCents / 100).toFixed(2);
  const partial = field("00", "01") + field("26", merchantAccount) + field("52", "0000") + field("53", "986") + field("54", amount) + field("58", "BR") + field("59", safeName) + field("60", safeCity) + field("62", field("05", safeTxid)) + "6304";
  return partial + crc16(partial);
}
