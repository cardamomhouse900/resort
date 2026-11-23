/**
 * Calendar-date helpers for bookings.
 *
 * Stay dates are plain calendar dates ("2026-12-20") with no time or timezone.
 * They are stored in PostgreSQL `date` columns; Prisma represents those as
 * JavaScript Dates at UTC midnight, so all arithmetic here is done in UTC to
 * avoid off-by-one errors around midnight and daylight-saving changes.
 */

export type ISODate = string; // "YYYY-MM-DD"

export const RESORT_TIME_ZONE = "Asia/Kolkata";
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-30). */
export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** ISO date → Date at UTC midnight (the value Prisma expects for @db.Date). */
export function toDbDate(date: ISODate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Date from a @db.Date column → ISO date. */
export function fromDbDate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDbDate(new Date(toDbDate(date).getTime() + days * DAY_MS));
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toDbDate(b).getTime() - toDbDate(a).getTime()) / DAY_MS);
}

/** Every night of a stay: check-in date up to (not including) check-out. */
export function eachNight(checkIn: ISODate, checkOut: ISODate): ISODate[] {
  const nights: ISODate[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) nights.push(d);
  return nights;
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: ISODate): number {
  return toDbDate(date).getUTCDay();
}

/** Today's date at the resort (India Standard Time), regardless of server timezone. */
export function todayAtResort(now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RESORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "Sat, 20 Dec 2026" */
export function formatStayDate(date: ISODate): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(toDbDate(date));
}
