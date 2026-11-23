/**
 * Money is handled as integer paise (1 rupee = 100 paise) in every calculation,
 * so there are no floating-point rounding errors. Values are converted only at
 * the edges: Decimal columns in the database, and display formatting.
 */

export type Paise = number;

type DecimalLike = { toFixed(dp: number): string };

/** Decimal / string / number of rupees → integer paise. "5000.5" → 500050 */
export function toPaise(rupees: DecimalLike | string | number): Paise {
  const fixed =
    typeof rupees === "number"
      ? rupees.toFixed(2)
      : typeof rupees === "string"
        ? Number(rupees).toFixed(2)
        : rupees.toFixed(2);
  if (!/^-?\d+\.\d{2}$/.test(fixed)) throw new Error(`Invalid money amount: ${String(rupees)}`);
  const negative = fixed.startsWith("-");
  const [whole, fraction] = fixed.replace("-", "").split(".");
  const paise = Number(whole) * 100 + Number(fraction);
  return negative ? -paise : paise;
}

/** Integer paise → rupee string for Decimal(10,2) columns. 500050 → "5000.50" */
export function fromPaise(paise: Paise): string {
  if (!Number.isInteger(paise)) throw new Error(`Paise must be an integer: ${paise}`);
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Percentage of an amount, rounded half-up to the nearest paisa. */
export function percentOf(paise: Paise, percent: number): Paise {
  return Math.round((paise * percent) / 100);
}

/** Round to the nearest whole rupee (half-up). */
export function roundToRupee(paise: Paise): Paise {
  return Math.round(paise / 100) * 100;
}

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

/** ₹5,000 for whole rupees, ₹5,000.50 otherwise (never "₹5,000.5"). */
export function formatPaise(paise: Paise): string {
  return paise % 100 === 0 ? inrWhole.format(paise / 100) : inrPaise.format(paise / 100);
}
