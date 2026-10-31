// Server-side pricing. Uses the same TypeScript the booking page uses (Node runs it with type
// stripping), so the price a customer sees is the price the server charges.
import { createHash } from "node:crypto";
import { INITIAL_PRESETS } from "../src/data/industries.ts";
import { depositFor } from "../src/lib/deposit.ts";
import { priceQuote } from "../src/lib/pricing.ts";

export { INITIAL_PRESETS };

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

/**
 * Prices a selection against a business's config. Throws { status: 400 } when the selection
 * is outside what the booking page offers.
 */
export function quoteFor(config, selection) {
  const { size } = selection;
  const onStep = Math.abs((size - config.minSize) / config.stepSize - Math.round((size - config.minSize) / config.stepSize)) < 1e-6;
  if (size < config.minSize || size > config.maxSize || !onStep) {
    throw httpError(400, "That size is not offered. Please adjust the quote.");
  }
  const q = priceQuote(config, selection);
  const deposit = depositFor(q.total);
  const addOnNames = q.addOns.length > 0 ? q.addOns.map((a) => a.name).join(", ") : "Base package";
  return {
    total: q.total,
    deposit,
    balance: Math.round((q.total - deposit) * 100) / 100,
    industryId: config.id,
    industryLabel: config.label,
    scopeSummary: size.toLocaleString("en-US") + " " + config.unitLabel + " • " + addOnNames,
    urgency: q.urgency.id,
    frequencyLabel: q.frequency.discount > 0 ? q.frequency.label + " (" + q.frequency.badge + ")" : q.frequency.label,
    // Only what was actually priced, in a fixed order, so the fingerprint is stable.
    selection: {
      size,
      addOnIds: q.addOns.map((a) => a.id).sort(),
      urgency: q.urgency.id,
      frequency: q.frequency.id,
    },
  };
}

/** Ties a PayPal order to one business and one priced selection (PayPal custom_id, max 127 chars). */
export function depositCustomId(slug, quote) {
  const fingerprint = createHash("sha256").update(JSON.stringify([quote.selection, quote.deposit])).digest("hex");
  return "dep|" + slug + "|" + fingerprint.slice(0, 24);
}

export function balanceCustomId(bookingId) {
  return "bal|" + bookingId;
}
