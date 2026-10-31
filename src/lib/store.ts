import type { IndustryConfig, PresetId } from "@/data/industries";
import type { DepositPayment } from "@/lib/deposit";

// Client for the QuoteFlow server (server/index.mjs). The server keeps the data in Supabase.

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

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

async function api<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method: init?.method ?? "GET",
      headers: init ? { "Content-Type": "application/json" } : undefined,
      body: init ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Could not reach QuoteFlow. Check your connection.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.message ?? "Something went wrong. Please try again.");
  return data as T;
}

const businessPath = (slug: string) => "/businesses/" + encodeURIComponent(slug);

export async function getBusiness(slug: string): Promise<BusinessRecord | null> {
  try {
    return (await api<{ business: BusinessRecord }>(businessPath(slug))).business;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveBusiness(business: BusinessRecord): Promise<void> {
  await api(businessPath(business.slug), { method: "PUT", body: { config: business.config } });
}

export async function listQuotes(slug: string): Promise<QuoteRecord[]> {
  return (await api<{ bookings: QuoteRecord[] }>(businessPath(slug) + "/bookings")).bookings;
}

/** Saves a paid booking. Sending the same deposit order again returns the booking saved the first time. */
export async function createQuote(slug: string, booking: NewBooking): Promise<QuoteRecord> {
  return (await api<{ booking: QuoteRecord }>(businessPath(slug) + "/bookings", { method: "POST", body: booking }))
    .booking;
}

/** Calls back with the fresh list whenever a booking is saved, from any device. */
export function subscribeQuotes(slug: string, callback: (quotes: QuoteRecord[]) => void): () => void {
  const source = new EventSource("/api" + businessPath(slug) + "/events");
  const refresh = () =>
    listQuotes(slug).then(callback, () => {
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
