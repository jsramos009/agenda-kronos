const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export function brazilTodayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dateKeyInBrazil(value: string | Date) {
  return brazilTodayKey(typeof value === "string" ? new Date(value) : value);
}

export function mondayOfWeek(dateKey: string) {
  const date = dateFromKey(dateKey);
  const distance = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - distance);
  return keyFromDate(date);
}

export function shiftDateKey(dateKey: string, days: number) {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return keyFromDate(date);
}

export function daysBetween(startKey: string, endKey: string) {
  return Math.round((dateFromKey(endKey).getTime() - dateFromKey(startKey).getTime()) / 86_400_000);
}

export function weekDayLabels(weekStart: string) {
  const weekdays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
  return weekdays.map((weekday, index) => `${weekday} ${shiftDateKey(weekStart, index).slice(8, 10)}`);
}

export function weekRangeLabel(weekStart: string) {
  const start = dateFromKey(weekStart);
  const end = dateFromKey(shiftDateKey(weekStart, 6));
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });
  const year = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()}–${end.getUTCDate()} de ${month.format(end)}, ${year}`;
  }
  return `${start.getUTCDate()} de ${month.format(start)}–${end.getUTCDate()} de ${month.format(end)}, ${year}`;
}

export function isDateKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dateFromKey(value).getTime()));
}

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function keyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
