const PERIOD_SUFFIX = { year: " / year", month: " / month", total: "" } as const;

/** `AED 480,000 / year`, or "Price on request" when the price is hidden. */
export function formatPrice(
  price: number | null,
  currency: string,
  period: keyof typeof PERIOD_SUFFIX | null
): string {
  if (price === null) return "Price on request";
  return `${currency} ${price.toLocaleString("en-US")}${period ? PERIOD_SUFFIX[period] : ""}`;
}

/** `1 October 2026`. */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** "Available now" once the date has passed, otherwise "Available from …". */
export function formatAvailability(ms: number | null): string | null {
  if (ms === null) return null;
  return ms <= Date.now() ? "Available now" : `Available from ${formatDate(ms)}`;
}
