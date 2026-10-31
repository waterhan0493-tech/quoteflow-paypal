/** Share of the quoted total the customer pays up front to lock the booking. */
export const DEPOSIT_RATE = 0.25;
export const DEPOSIT_MIN = 10;
export const DEPOSIT_CURRENCY = "USD";

export interface DepositPayment {
  /** "paypal" for a real sandbox capture, "demo" when no client ID is configured. */
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

export function paypalClientId(): string {
  return (import.meta.env.VITE_PAYPAL_CLIENT_ID ?? "").trim();
}
