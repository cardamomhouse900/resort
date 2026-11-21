/**
 * Compact availability search shown in the hero (desktop) and on the booking CTA.
 * A plain GET form — works without JavaScript and hands the values to /booking,
 * where availability and prices are always checked by the server.
 */
export function BookingQuickSearch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const field =
    "mt-1 block w-full min-h-11 rounded-md border-0 bg-transparent px-0 text-base font-medium text-forest focus:ring-0 focus-visible:outline-none";
  const label = "text-[0.6875rem] font-semibold tracking-[0.16em] text-olive-ink uppercase";

  return (
    <form
      action="/booking"
      method="get"
      className={`bg-cream/95 grid gap-x-6 gap-y-3 rounded-2xl p-4 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.5)] backdrop-blur-md sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.7fr_0.7fr_auto] lg:items-end lg:rounded-full lg:py-3 lg:pr-3 lg:pl-8 ${
        tone === "dark" ? "ring-line ring-1" : ""
      }`}
      aria-label="Check availability"
    >
      <label className="block">
        <span className={label}>Check-in</span>
        <input type="date" name="checkIn" required className={field} />
      </label>
      <label className="lg:border-line block lg:border-l lg:pl-6">
        <span className={label}>Check-out</span>
        <input type="date" name="checkOut" required className={field} />
      </label>
      <label className="lg:border-line block lg:border-l lg:pl-6">
        <span className={label}>Adults</span>
        <select name="adults" defaultValue="2" className={field}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="lg:border-line block lg:border-l lg:pl-6">
        <span className={label}>Children</span>
        <select name="children" defaultValue="0" className={field}>
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="bg-forest text-cream hover:bg-mountain min-h-12 rounded-full px-8 text-[0.9375rem] font-semibold transition-colors sm:col-span-2 lg:col-span-1"
      >
        Check availability
      </button>
    </form>
  );
}
