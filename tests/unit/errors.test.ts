import { describe, expect, it } from "vitest";
import { isOverlapViolation, isUniqueViolation } from "@/lib/errors";

// Shape observed from Prisma 7 + @prisma/adapter-pg when the exclusion constraint fires.
const overlapError = {
  name: "PrismaClientKnownRequestError",
  code: "P2039",
  meta: {
    modelName: "Reservation",
    driverAdapterError: { name: "DriverAdapterError", cause: { originalCode: "23P01", kind: "postgres" } },
  },
};

describe("database error classification", () => {
  it("recognises the exclusion-constraint violation", () => {
    expect(isOverlapViolation(overlapError)).toBe(true);
    expect(isUniqueViolation(overlapError)).toBe(false);
  });
  it("recognises unique violations", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isOverlapViolation({ code: "P2002" })).toBe(false);
  });
  it("ignores unrelated errors", () => {
    expect(isOverlapViolation(new Error("boom"))).toBe(false);
    expect(isOverlapViolation(null)).toBe(false);
  });
});
