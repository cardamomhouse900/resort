import { describe, expect, it } from "vitest";
import { addDays, diffDays, eachNight, isISODate, todayAtResort } from "@/utils/dates";
import { formatPaise, fromPaise, percentOf, roundToRupee, toPaise } from "@/utils/money";

describe("dates", () => {
  it("accepts only real calendar dates", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true); // leap year
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-2-3")).toBe(false);
    expect(isISODate("<script>")).toBe(false);
    expect(isISODate(20261220)).toBe(false);
  });

  it("does date arithmetic across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-12-30", "2027-01-02")).toBe(3);
    expect(eachNight("2026-12-30", "2027-01-01")).toEqual(["2026-12-30", "2026-12-31"]);
  });

  it("uses India time for 'today', whatever the server timezone", () => {
    // 19:00 UTC on 21 Nov is 00:30 IST on 22 Nov
    expect(todayAtResort(new Date("2026-11-21T19:00:00Z"))).toBe("2026-11-22");
    expect(todayAtResort(new Date("2026-11-21T18:00:00Z"))).toBe("2026-11-21");
  });
});

describe("money", () => {
  it("converts between rupees and integer paise without float errors", () => {
    expect(toPaise("5000.00")).toBe(500_000);
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise({ toFixed: () => "1071.43" })).toBe(107_143);
    expect(fromPaise(500_050)).toBe("5000.50");
    expect(fromPaise(5)).toBe("0.05");
    expect(() => fromPaise(1.5)).toThrow();
  });

  it("rounds percentages and rupees half-up", () => {
    expect(percentOf(1_000_000, 30)).toBe(300_000);
    expect(roundToRupee(99_950)).toBe(100_000);
    expect(roundToRupee(99_949)).toBe(99_900);
  });

  it("formats in Indian style", () => {
    expect(formatPaise(10_000_000)).toBe("₹1,00,000");
    expect(formatPaise(500_050)).toBe("₹5,000.50");
  });
});
