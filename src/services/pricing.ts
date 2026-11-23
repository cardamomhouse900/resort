import { dayOfWeek, diffDays, eachNight, type ISODate } from "@/utils/dates";
import { percentOf, roundToRupee, type Paise } from "@/utils/money";

/**
 * Pure pricing logic — no database access, fully unit-tested.
 * The booking service loads the inputs and calls these functions; the browser
 * only ever displays the result.
 */

export type PriceRule = {
  startDate: ISODate; // inclusive
  endDate: ISODate; // inclusive
  daysOfWeek: number[]; // empty = every day
  pricePaise: Paise;
  priority: number;
};

export type QuoteInput = {
  basePricePaise: Paise;
  rules: PriceRule[];
  checkIn: ISODate;
  checkOut: ISODate;
  taxPercent: number;
  pricesIncludeTax: boolean;
  advancePercent: number;
};

export type Quote = {
  nights: number;
  nightly: { date: ISODate; pricePaise: Paise }[];
  subtotalPaise: Paise;
  taxPercent: number;
  /** Tax portion — included in or added to the subtotal depending on settings. */
  taxPaise: Paise;
  pricesIncludeTax: boolean;
  totalPaise: Paise;
  advancePercent: number;
  advancePaise: Paise;
  balancePaise: Paise;
};

/** Nightly price for one date: the highest-priority matching rule, else the base price. */
export function priceForNight(date: ISODate, basePricePaise: Paise, rules: PriceRule[]): Paise {
  const dow = dayOfWeek(date);
  let best: PriceRule | undefined;
  for (const rule of rules) {
    if (date < rule.startDate || date > rule.endDate) continue;
    if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dow)) continue;
    if (
      !best ||
      rule.priority > best.priority ||
      // Same priority: the more specific (shorter) date range wins.
      (rule.priority === best.priority &&
        diffDays(rule.startDate, rule.endDate) < diffDays(best.startDate, best.endDate))
    ) {
      best = rule;
    }
  }
  return best ? best.pricePaise : basePricePaise;
}

export function calculateQuote(input: QuoteInput): Quote {
  const dates = eachNight(input.checkIn, input.checkOut);
  if (dates.length === 0) throw new Error("A stay must be at least one night");
  if (input.advancePercent < 1 || input.advancePercent > 100)
    throw new Error("Advance percent must be 1–100");

  const nightly = dates.map((date) => ({
    date,
    pricePaise: priceForNight(date, input.basePricePaise, input.rules),
  }));
  const subtotalPaise = nightly.reduce((sum, n) => sum + n.pricePaise, 0);

  let taxPaise = 0;
  let totalPaise = subtotalPaise;
  if (input.taxPercent > 0) {
    if (input.pricesIncludeTax) {
      // Tax already inside the price: tax = subtotal × r / (100 + r)
      taxPaise = Math.round((subtotalPaise * input.taxPercent) / (100 + input.taxPercent));
    } else {
      taxPaise = percentOf(subtotalPaise, input.taxPercent);
      totalPaise = subtotalPaise + taxPaise;
    }
  }

  // The advance is rounded to whole rupees so guests see a clean amount;
  // the balance absorbs the difference, so advance + balance = total exactly.
  const advancePaise =
    input.advancePercent === 100
      ? totalPaise
      : Math.min(totalPaise, roundToRupee(percentOf(totalPaise, input.advancePercent)));

  return {
    nights: dates.length,
    nightly,
    subtotalPaise,
    taxPercent: input.taxPercent,
    taxPaise,
    pricesIncludeTax: input.pricesIncludeTax,
    totalPaise,
    advancePercent: input.advancePercent,
    advancePaise,
    balancePaise: totalPaise - advancePaise,
  };
}

export type StayRules = { minNights: number; maxNights: number; bookingWindowDays: number };

export type StayProblem =
  "CHECK_IN_IN_PAST" | "CHECK_OUT_BEFORE_CHECK_IN" | "TOO_FEW_NIGHTS" | "TOO_MANY_NIGHTS" | "TOO_FAR_AHEAD";

/** Validates the requested dates against the booking rules. Returns null when acceptable. */
export function checkStayDates(
  checkIn: ISODate,
  checkOut: ISODate,
  today: ISODate,
  rules: StayRules,
): StayProblem | null {
  if (checkIn < today) return "CHECK_IN_IN_PAST";
  const nights = diffDays(checkIn, checkOut);
  if (nights <= 0) return "CHECK_OUT_BEFORE_CHECK_IN";
  if (nights < rules.minNights) return "TOO_FEW_NIGHTS";
  if (nights > rules.maxNights) return "TOO_MANY_NIGHTS";
  if (diffDays(today, checkIn) > rules.bookingWindowDays) return "TOO_FAR_AHEAD";
  return null;
}

export type Occupancy = { adults: number; children: number };
export type Capacity = { maxAdults: number; maxChildren: number; maxOccupancy: number };

export function fitsOccupancy(guests: Occupancy, room: Capacity): boolean {
  return (
    guests.adults >= 1 &&
    guests.children >= 0 &&
    guests.adults <= room.maxAdults &&
    guests.children <= room.maxChildren &&
    guests.adults + guests.children <= room.maxOccupancy
  );
}
