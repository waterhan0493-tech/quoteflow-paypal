// Shared by the browser and the server (server/pricing.mjs runs this file with Node type stripping),
// so keep it free of browser-only APIs.

/** Share of the quoted total the customer pays up front to lock the booking. */
export const DEPOSIT_RATE = 0.25;
export const DEPOSIT_MIN = 10;
export const DEPOSIT_CURRENCY = "USD";

export interface DepositPayment {
  /** "paypal" for a PayPal capture, "demo" when the server has no PayPal keys. */
  provider: "paypal" | "demo";
  amount: number;
  currency: string;
  orderId: string;
  captureId?: string;
  payerEmail?: string;
  paidAt: string;
}

/** Deposit in dollars, rounded to cents, never more than the total. */
export function depositFor(total: number): number {
  const raw = Math.max(total * DEPOSIT_RATE, DEPOSIT_MIN);
  return Math.round(Math.min(raw, total) * 100) / 100;
}

