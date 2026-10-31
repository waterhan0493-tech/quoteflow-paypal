import type { IndustryConfig, PresetId } from "@/data/industries";
import type { DepositPayment } from "@/lib/deposit";
import type { Frequency, Urgency } from "@/lib/pricing";
import { ApiError, api } from "@/lib/api";

// Businesses and bookings, kept by the QuoteFlow server in Supabase.
// Owner-only calls take the access token from src/lib/auth.ts (passed in, so the booking page
// never loads the sign-in code).

/** booked -> balance_requested -> paid, or cancelled (deposit refunded) before the balance is paid. */
export type BookingStatus = "booked" | "balance_requested" | "paid" | "cancelled";

export interface QuoteRecord {
  id: string;
  businessSlug?: string;
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
  status: BookingStatus;
  /** ISO timestamp set by the server. */
  createdAt: string;
  signatureDataUrl?: string;
  deposit?: DepositPayment;
  balance?: { amount: number; requestedAt?: string; orderId?: string; captureId?: string; paidAt?: string };
  refund?: { id: string; amount: number; refundedAt: string };
}

/** What the customer picked. The server prices it again; the browser's total is never trusted. */
export interface Selection {
  size: number;
  addOnIds: string[];
  urgency: Urgency;
  frequency: Frequency;
}

/** A PayPal order the buyer approved (the server captures it), or a demo stand-in. */
export interface ApprovedPayment {
  provider: "paypal" | "demo";
  orderId: string;
}

export interface NewBooking {
  customerName: string;
  customerEmail: string;
  dateSlot: string;
  timeSlot: string;
  signatureDataUrl?: string;
  selection: Selection;
  deposit: ApprovedPayment;
}

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

/** Opens a PayPal order for the deposit on this selection. Returns the PayPal order ID. */
export async function createDepositOrder(slug: string, selection: Selection): Promise<string> {
  return (await api<{ orderId: string }>(businessPath(slug) + "/deposit-orders", { method: "POST", body: { selection } }))
    .orderId;
}

/**
 * Captures the approved deposit and saves the booking. Sending the same order again returns the
 * booking saved the first time. ApiError 402 or 409 means nothing was charged: offer the buttons again.
 */
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

// ---- Owner actions after the visit ----

export async function requestBalance(
  slug: string,
  id: string,
  token: TokenSource
): Promise<{ booking: QuoteRecord; payPath: string }> {
  return api(businessPath(slug) + "/bookings/" + id + "/request-balance", { method: "POST", body: {}, token: await token() });
}

/** Cancels the booking and refunds the deposit in full. */
export async function cancelBooking(slug: string, id: string, token: TokenSource): Promise<QuoteRecord> {
  return (
    await api<{ booking: QuoteRecord }>(businessPath(slug) + "/bookings/" + id + "/cancel", {
      method: "POST",
      body: {},
      token: await token(),
    })
  ).booking;
}

// ---- Balance page (/pay/<booking id>) ----

export interface PayView {
  id: string;
  quoteId: string;
  businessName: string;
  customerName: string;
  industryLabel: string;
  scopeSummary: string;
  dateSlot: string;
  timeSlot: string;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  status: BookingStatus;
  balancePaidAt?: string;
  balanceOrderId?: string;
}

export async function getPayView(id: string): Promise<PayView | null> {
  try {
    return (await api<{ booking: PayView }>("/bookings/" + encodeURIComponent(id))).booking;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createBalanceOrder(id: string): Promise<string> {
  return (await api<{ orderId: string }>("/bookings/" + id + "/balance-orders", { method: "POST", body: {} })).orderId;
}

export async function payBalance(id: string, payment: ApprovedPayment): Promise<PayView> {
  return (await api<{ booking: PayView }>("/bookings/" + id + "/balance-payments", { method: "POST", body: payment }))
    .booking;
}
