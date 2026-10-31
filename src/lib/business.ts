import { INITIAL_PRESETS, type IndustryConfig } from "@/data/industries";
import { getBusiness, saveBusiness, type QuoteRecord } from "@/lib/store";

/** The one business this build serves until owner sign-in exists. */
export const DEMO_SLUG = "sparkle-co";

export function bookingPath(slug: string): string {
  return "/b/" + slug;
}

/**
 * Saved config for a slug. The demo business falls back to its preset so its link always works,
 * even before the owner saves prices or while the server is unreachable.
 */
export async function loadBusinessConfig(slug: string): Promise<IndustryConfig | null> {
  const saved = await getBusiness(slug).catch(() => null);
  if (saved?.config) return saved.config;
  return slug === DEMO_SLUG ? INITIAL_PRESETS.cleaning : null;
}

export async function saveBusinessConfig(slug: string, config: IndustryConfig): Promise<void> {
  await saveBusiness({ slug, name: config.businessName, industry: config.id, config });
}

/** A booking is a quote the customer confirmed with a deposit. Older demo leads have none. */
export function isBooking(q: QuoteRecord): q is QuoteRecord & { deposit: NonNullable<QuoteRecord["deposit"]> } {
  return q.deposit !== undefined;
}

/** dateSlot is stored as YYYY-MM-DD in the business's local time. */
export function parseDateSlot(dateSlot: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateSlot);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
