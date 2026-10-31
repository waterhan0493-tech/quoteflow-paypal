import type { IndustryConfig, PresetId } from "@/data/industries";

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
  dateSlot: string;
  timeSlot: string;
  status: LeadStatus;
  createdAt: string;
  isHotLead?: boolean;
  isNew?: boolean;
  signatureDataUrl?: string;
}

export interface BusinessRecord {
  slug: string;
  name: string;
  industry: PresetId;
  config: IndustryConfig;
}

const BUSINESS_KEY = (slug: string) => `qf:business:${slug}`;
const QUOTES_KEY = (slug: string) => `qf:quotes:${slug}`;
const ALL_BUSINESSES_KEY = "qf:businesses";

const memoryFallback = new Map<string, string>();

function readKey(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // localStorage may be blocked (private mode, sandbox); fall through to memory
  }
  return memoryFallback.has(key) ? memoryFallback.get(key)! : null;
}

function writeKey(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fall through to memory
  }
  memoryFallback.set(key, value);
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function generateQuoteId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `QF-${num}`;
}

export async function getBusiness(slug: string): Promise<BusinessRecord | null> {
  const raw = readKey(BUSINESS_KEY(slug));
  return parse<BusinessRecord | null>(raw, null);
}

export async function saveBusiness(business: BusinessRecord): Promise<void> {
  writeKey(BUSINESS_KEY(business.slug), JSON.stringify(business));
  const allRaw = readKey(ALL_BUSINESSES_KEY);
  const all = parse<string[]>(allRaw, []);
  if (!all.includes(business.slug)) {
    all.push(business.slug);
    writeKey(ALL_BUSINESSES_KEY, JSON.stringify(all));
  }
}

export async function listQuotes(slug: string): Promise<QuoteRecord[]> {
  const raw = readKey(QUOTES_KEY(slug));
  return parse<QuoteRecord[]>(raw, []);
}

export async function createQuote(
  slug: string,
  quote: Omit<QuoteRecord, "quoteId" | "id">
): Promise<QuoteRecord> {
  const existing = await listQuotes(slug);
  let quoteId = generateQuoteId();
  while (existing.some((q) => q.quoteId === quoteId)) {
    quoteId = generateQuoteId();
  }
  const record: QuoteRecord = {
    ...quote,
    id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    quoteId,
  };
  const next = [record, ...existing];
  writeKey(QUOTES_KEY(slug), JSON.stringify(next));
  return record;
}

export async function updateQuoteStatus(
  id: string,
  status: LeadStatus
): Promise<void> {
  // Quotes are stored per-business slug; scan known business slugs.
  const allRaw = readKey(ALL_BUSINESSES_KEY);
  const slugs = parse<string[]>(allRaw, []);
  for (const slug of slugs) {
    const quotes = await listQuotes(slug);
    const idx = quotes.findIndex((q) => q.id === id);
    if (idx !== -1) {
      quotes[idx] = { ...quotes[idx], status };
      writeKey(QUOTES_KEY(slug), JSON.stringify(quotes));
      return;
    }
  }
  // If not found in any business, no-op (defensive).
}

export function subscribeQuotes(
  slug: string,
  callback: (quotes: QuoteRecord[]) => void
): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === QUOTES_KEY(slug)) {
      const next = parse<QuoteRecord[]>(e.newValue, []);
      callback(next);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handler);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handler);
    }
  };
}
