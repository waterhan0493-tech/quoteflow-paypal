import type { AddOnItem, IndustryConfig } from "@/data/industries";

export type Frequency = "once" | "monthly" | "weekly";
export type Urgency = "standard" | "rush";

export const FREQUENCY_OPTIONS = [
  { id: "once", label: "One-time", discount: 0, badge: "Standard" },
  { id: "monthly", label: "Bi-Weekly", discount: 0.1, badge: "Save 10%" },
  { id: "weekly", label: "Weekly", discount: 0.2, badge: "Save 20%" },
] as const;

export const URGENCY_OPTIONS = [
  { id: "standard", label: "Standard", multiplier: 1, badge: "No extra fee" },
  { id: "rush", label: "Next-Day Rush", multiplier: 1.2, badge: "+20% priority" },
] as const;

export interface QuoteSelection {
  size: number;
  addOnIds: string[];
  urgency: Urgency;
  frequency: Frequency;
}

export interface QuoteBreakdown {
  baseFee: number;
  sizeCharge: number;
  addOns: AddOnItem[];
  addOnsTotal: number;
  rawSubtotal: number;
  rushFee: number;
  discount: number;
  total: number;
  urgency: (typeof URGENCY_OPTIONS)[number];
  frequency: (typeof FREQUENCY_OPTIONS)[number];
}

/** The one pricing rule: base fee + size charge + add-ons, then rush surcharge, then plan discount. */
export function priceQuote(config: IndustryConfig, sel: QuoteSelection): QuoteBreakdown {
  const addOns = config.addOns.filter((a) => a.enabledInBuilder && sel.addOnIds.includes(a.id));
  const sizeCharge = Math.round(sel.size * config.multiplier);
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0);
  const rawSubtotal = config.baseFee + sizeCharge + addOnsTotal;
  const urgency = URGENCY_OPTIONS.find((u) => u.id === sel.urgency) ?? URGENCY_OPTIONS[0];
  const rushFee = Math.round(rawSubtotal * (urgency.multiplier - 1));
  const frequency = FREQUENCY_OPTIONS.find((f) => f.id === sel.frequency) ?? FREQUENCY_OPTIONS[0];
  const discount = Math.round((rawSubtotal + rushFee) * frequency.discount);
  return {
    baseFee: config.baseFee,
    sizeCharge,
    addOns,
    addOnsTotal,
    rawSubtotal,
    rushFee,
    discount,
    total: rawSubtotal + rushFee - discount,
    urgency,
    frequency,
  };
}

/** "$1,234.50"; negative amounts as "−$91.50" (true minus sign), never "$-91.50". */
export function formatMoney(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "−$" : "$") + abs;
}
