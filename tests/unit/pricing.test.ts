import { describe, expect, it } from "vitest";
import {
  calculateQuote,
  checkStayDates,
  fitsOccupancy,
  priceForNight,
  type PriceRule,
} from "@/services/pricing";

const base = {
  basePricePaise: 500_000, // ₹5,000
  rules: [] as PriceRule[],
  taxPercent: 0,
  pricesIncludeTax: true,
  advancePercent: 30,
};

describe("calculateQuote", () => {
  it("matches the example from the requirements (₹5,000 × 2 nights, 30% advance)", () => {
    const q = calculateQuote({ ...base, checkIn: "2026-12-20", checkOut: "2026-12-22" });
    expect(q.nights).toBe(2);
    expect(q.subtotalPaise).toBe(1_000_000); // ₹10,000
    expect(q.totalPaise).toBe(1_000_000);
    expect(q.advancePaise).toBe(300_000); // ₹3,000
    expect(q.balancePaise).toBe(700_000); // ₹7,000
    expect(q.nightly.map((n) => n.date)).toEqual(["2026-12-20", "2026-12-21"]);
  });

  it("applies a weekend pricing rule only on matching days", () => {
    const weekend: PriceRule = {
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      daysOfWeek: [5, 6], // Fri, Sat
      pricePaise: 650_000,
      priority: 1,
    };
    // 2026-12-18 is a Friday: Fri, Sat, Sun nights
    const q = calculateQuote({ ...base, rules: [weekend], checkIn: "2026-12-18", checkOut: "2026-12-21" });
    expect(q.nightly.map((n) => n.pricePaise)).toEqual([650_000, 650_000, 500_000]);
    expect(q.subtotalPaise).toBe(1_800_000);
  });

  it("prefers higher priority, then the more specific date range", () => {
    const season: PriceRule = {
      startDate: "2026-12-01",
      endDate: "2027-01-10",
      daysOfWeek: [],
      pricePaise: 600_000,
      priority: 1,
    };
    const newYear: PriceRule = {
      startDate: "2026-12-30",
      endDate: "2027-01-01",
      daysOfWeek: [],
      pricePaise: 900_000,
      priority: 1,
    };
    const promo: PriceRule = {
      startDate: "2026-12-31",
      endDate: "2026-12-31",
      daysOfWeek: [],
      pricePaise: 400_000,
      priority: 5,
    };
    expect(priceForNight("2026-12-15", 500_000, [season, newYear])).toBe(600_000);
    expect(priceForNight("2026-12-30", 500_000, [season, newYear])).toBe(900_000); // shorter range wins the tie
    expect(priceForNight("2026-12-31", 500_000, [season, newYear, promo])).toBe(400_000); // priority wins
    expect(priceForNight("2027-02-01", 500_000, [season, newYear, promo])).toBe(500_000); // base price
  });

  it("separates tax that is included in the price", () => {
    const q = calculateQuote({
      ...base,
      taxPercent: 12,
      pricesIncludeTax: true,
      checkIn: "2026-12-20",
      checkOut: "2026-12-22",
    });
    expect(q.totalPaise).toBe(1_000_000);
    expect(q.taxPaise).toBe(107_143); // 10000 × 12/112 = 1071.43
  });

  it("adds tax on top when prices exclude it", () => {
    const q = calculateQuote({
      ...base,
      taxPercent: 12,
      pricesIncludeTax: false,
      checkIn: "2026-12-20",
      checkOut: "2026-12-22",
    });
    expect(q.taxPaise).toBe(120_000);
    expect(q.totalPaise).toBe(1_120_000);
    expect(q.advancePaise).toBe(336_000);
    expect(q.balancePaise).toBe(784_000);
  });

  it("rounds the advance to whole rupees and keeps advance + balance = total", () => {
    const q = calculateQuote({
      ...base,
      basePricePaise: 333_333,
      checkIn: "2026-12-20",
      checkOut: "2026-12-21",
    });
    expect(q.advancePaise % 100).toBe(0);
    expect(q.advancePaise).toBe(100_000); // 30% of ₹3,333.33 = ₹999.999 → ₹1,000
    expect(q.advancePaise + q.balancePaise).toBe(q.totalPaise);
  });

  it("supports a 100% advance", () => {
    const q = calculateQuote({
      ...base,
      basePricePaise: 333_333,
      advancePercent: 100,
      checkIn: "2026-12-20",
      checkOut: "2026-12-21",
    });
    expect(q.advancePaise).toBe(333_333);
    expect(q.balancePaise).toBe(0);
  });

  it("rejects zero-night stays and invalid advance percentages", () => {
    expect(() => calculateQuote({ ...base, checkIn: "2026-12-20", checkOut: "2026-12-20" })).toThrow();
    expect(() =>
      calculateQuote({ ...base, advancePercent: 0, checkIn: "2026-12-20", checkOut: "2026-12-21" }),
    ).toThrow();
  });
});

describe("checkStayDates", () => {
  const rules = { minNights: 1, maxNights: 14, bookingWindowDays: 365 };
  const today = "2026-11-22";

  it("accepts a normal stay, including check-in today", () => {
    expect(checkStayDates("2026-11-22", "2026-11-24", today, rules)).toBeNull();
  });
  it.each([
    ["2026-11-21", "2026-11-23", "CHECK_IN_IN_PAST"],
    ["2026-11-25", "2026-11-25", "CHECK_OUT_BEFORE_CHECK_IN"],
    ["2026-11-25", "2026-12-10", "TOO_MANY_NIGHTS"],
    ["2027-12-01", "2027-12-02", "TOO_FAR_AHEAD"],
  ])("%s → %s is %s", (checkIn, checkOut, problem) => {
    expect(checkStayDates(checkIn, checkOut, today, rules)).toBe(problem);
  });
  it("enforces a minimum stay", () => {
    expect(checkStayDates("2026-12-01", "2026-12-02", today, { ...rules, minNights: 2 })).toBe(
      "TOO_FEW_NIGHTS",
    );
  });
});

describe("fitsOccupancy", () => {
  const room = { maxAdults: 2, maxChildren: 1, maxOccupancy: 3 };
  it("checks adults, children and total separately", () => {
    expect(fitsOccupancy({ adults: 2, children: 1 }, room)).toBe(true);
    expect(fitsOccupancy({ adults: 3, children: 0 }, room)).toBe(false);
    expect(fitsOccupancy({ adults: 1, children: 2 }, room)).toBe(false);
    expect(fitsOccupancy({ adults: 0, children: 1 }, room)).toBe(false);
  });
});
