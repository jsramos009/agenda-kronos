export const CALENDAR_TIME_ZONE = "America/Sao_Paulo";
export const SLOT_INTERVALS = [10, 15, 30, 60] as const;
export type SlotInterval = (typeof SLOT_INTERVALS)[number];
export type CalendarSnapshotEntity = { id: string; title: string; description: string; location: string; color: string; customerId: string | null; serviceId: string | null; client?: string; service?: string; notes?: string | null; status: string; startsAt: string; endsAt: string };

export function normalizeSlotInterval(value: unknown): SlotInterval {
  const interval = Number(value);
  return SLOT_INTERVALS.includes(interval as SlotInterval) ? interval as SlotInterval : 30;
}

export function snapMinutes(minutes: number, interval: SlotInterval) {
  return Math.max(0, Math.round(minutes / interval) * interval);
}

export function minutesBetween(start: string | Date, end: string | Date) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  const minutes = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function localDateTimeToIso(value: string, timeZone = CALENDAR_TIME_ZONE) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Data local inválida.");
  const desiredUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let candidate = desiredUtc;
  for (let index = 0; index < 3; index += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(candidate));
    const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const representedUtc = Date.UTC(Number(record.year), Number(record.month) - 1, Number(record.day), Number(record.hour), Number(record.minute));
    candidate += desiredUtc - representedUtc;
  }
  const result = new Date(candidate);
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(result);
  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (`${record.year}-${record.month}-${record.day}T${record.hour}:${record.minute}` !== value) throw new Error("Este horário não existe no fuso da agenda. Escolha outro horário.");
  return result.toISOString();
}

export function moveRange(startsAt: string, endsAt: string, nextStart: string) {
  const duration = minutesBetween(startsAt, endsAt);
  const start = new Date(nextStart);
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + duration * 60_000).toISOString() };
}

export function calendarEntitySignature(entity: CalendarSnapshotEntity) {
  return [entity.id, entity.title, entity.description, entity.location, entity.color, entity.customerId ?? "", entity.serviceId ?? "", entity.client ?? "", entity.service ?? "", entity.notes ?? "", entity.status, entity.startsAt, entity.endsAt].join("|");
}

export function reconcileCalendarSnapshot<T extends CalendarSnapshotEntity>(server: T[], current: T[], pendingIds: ReadonlySet<string>) {
  const local = new Map(current.map((item) => [item.id, item]));
  return server.map((item) => pendingIds.has(item.id) ? local.get(item.id) ?? item : item);
}

export function rollbackCalendarEntity<T extends { id: string }>(current: T[], previous: T) {
  return current.map((item) => item.id === previous.id ? previous : item);
}

export function calendarRoute(view: "day" | "week" | "month" | "list", date: string) {
  return `/agenda?view=${view}&date=${date}`;
}

export function moveGridFocus(index: number, key: string, slotsPerDay: number, totalSlots: number) {
  const delta = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : key === "ArrowRight" ? slotsPerDay : key === "ArrowLeft" ? -slotsPerDay : 0;
  return Math.max(0, Math.min(totalSlots - 1, index + delta));
}
