import type { IndustryConfig, PresetId } from "@/data/industries";
import type { DepositPayment } from "@/lib/deposit";
import { ApiError, api } from "@/lib/api";

// Businesses and bookings, kept by the QuoteFlow server in Supabase.
// Owner-only calls take the access token from src/lib/auth.ts (passed in, so the booking page
// never loads the sign-in code).

export type LeadStatus = "new" | "sent" | "booked";

export interface QuoteRecord {
  id: string;
  quoteId: string;
  customerName: string;
  customerEmail: string;
  industryId: PresetId;
  industryLabel: string;
  scopeSummary: string;
  totalPrice: number;
  urgency: "standard" | "rush";
  frequencyLabel: string;
  /** YYYY-MM-DD */
  dateSlot: string;
  timeSlot: string;
  status: LeadStatus;
  /** ISO timestamp set by the server. */
  createdAt: string;
  signatureDataUrl?: string;
  deposit?: DepositPayment;
}

export type NewBooking = Omit<QuoteRecord, "id" | "quoteId" | "createdAt" | "deposit"> & {
  deposit: DepositPayment;
};

export interface BusinessRecord {
  slug: string;
  name: string;
  industry: PresetId;
  config: IndustryConfig;
}

/** Resolves the owner's access token for a request; null when sign-in is off. */
export type TokenSource = () => Promise<string | null>;

const businessPath = (slug: string) => "/businesses/" + encodeURIComponent(slug);

export async function getBusiness(slug: string): Promise<BusinessRecord | null> {
  try {
    return (await api<{ business: BusinessRecord }>(businessPath(slug))).business;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveBusiness(business: BusinessRecord, token: TokenSource): Promise<void> {
  await api(businessPath(business.slug), { method: "PUT", body: { config: business.config }, token: await token() });
}

export async function listQuotes(slug: string, token: TokenSource): Promise<QuoteRecord[]> {
  return (await api<{ bookings: QuoteRecord[] }>(businessPath(slug) + "/bookings", { token: await token() })).bookings;
}

/** Saves a paid booking. Sending the same deposit order again returns the booking saved the first time. */
export async function createQuote(slug: string, booking: NewBooking): Promise<QuoteRecord> {
  return (await api<{ booking: QuoteRecord }>(businessPath(slug) + "/bookings", { method: "POST", body: booking }))
    .booking;
}

/** Calls back with the fresh list whenever a booking is saved, from any device. */
export function subscribeQuotes(
  slug: string,
  token: TokenSource,
  callback: (quotes: QuoteRecord[]) => void
): () => void {
  const source = new EventSource("/api" + businessPath(slug) + "/events");
  const refresh = () =>
    listQuotes(slug, token).then(callback, () => {
      // Keep the list on screen; the next event or reconnect tries again.
    });
  source.addEventListener("bookings", refresh);
  // After a dropped connection, catch up on anything saved in between.
  let opened = false;
  source.addEventListener("open", () => {
    if (opened) refresh();
    opened = true;
  });
  return () => source.close();
}
