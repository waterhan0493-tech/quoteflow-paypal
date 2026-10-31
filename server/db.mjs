// Storage for businesses and bookings.
// Supabase when SUPABASE_URL and SUPABASE_SECRET_KEY are set (schema: supabase/schema.sql),
// otherwise an in-memory store so the app runs right after cloning (data resets on restart).
import { createClient } from "@supabase/supabase-js";

export function createDb() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY || "").trim();
  // Accept the project URL with or without the "/rest/v1/" the dashboard sometimes shows.
  return url && key ? supabaseDb(new URL(url).origin, key) : memoryDb();
}

function newQuoteId() {
  return "QF-" + Math.floor(1000 + Math.random() * 9000);
}

// The signature image is only needed on the booking itself, not in lists.
const LIST_COLUMNS =
  "id, business_slug, quote_id, status, customer_name, customer_email, industry_id, industry_label, scope_summary, " +
  "total_price, urgency, frequency_label, date_slot, time_slot, deposit_provider, deposit_amount, deposit_currency, " +
  "deposit_order_id, deposit_capture_id, payer_email, deposit_paid_at, created_at";

function toRow(slug, quoteId, b) {
  return {
    business_slug: slug,
    quote_id: quoteId,
    status: b.status,
    customer_name: b.customerName,
    customer_email: b.customerEmail,
    industry_id: b.industryId,
    industry_label: b.industryLabel,
    scope_summary: b.scopeSummary,
    total_price: b.totalPrice,
    urgency: b.urgency,
    frequency_label: b.frequencyLabel,
    date_slot: b.dateSlot,
    time_slot: b.timeSlot,
    signature_data_url: b.signatureDataUrl ?? null,
    deposit_provider: b.deposit.provider,
    deposit_amount: b.deposit.amount,
    deposit_currency: b.deposit.currency,
    deposit_order_id: b.deposit.orderId,
    deposit_capture_id: b.deposit.captureId ?? null,
    payer_email: b.deposit.payerEmail ?? null,
    deposit_paid_at: b.deposit.paidAt,
  };
}

/** Database row to the QuoteRecord shape the app uses (src/lib/store.ts). */
function fromRow(r) {
  return {
    id: r.id,
    quoteId: r.quote_id,
    status: r.status,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    industryId: r.industry_id,
    industryLabel: r.industry_label,
    scopeSummary: r.scope_summary,
    totalPrice: Number(r.total_price),
    urgency: r.urgency,
    frequencyLabel: r.frequency_label,
    dateSlot: r.date_slot,
    timeSlot: r.time_slot,
    createdAt: r.created_at,
    deposit: r.deposit_provider
      ? {
          provider: r.deposit_provider,
          amount: Number(r.deposit_amount),
          currency: r.deposit_currency,
          orderId: r.deposit_order_id,
          captureId: r.deposit_capture_id ?? undefined,
          payerEmail: r.payer_email ?? undefined,
          paidAt: r.deposit_paid_at,
        }
      : undefined,
  };
}

function supabaseDb(url, key) {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  async function findByOrder(orderId) {
    const { data, error } = await sb.from("bookings").select(LIST_COLUMNS).eq("deposit_order_id", orderId).maybeSingle();
    if (error) throw error;
    return data;
  }

  return {
    kind: "supabase",

    async check() {
      // A real read: HEAD requests report missing tables as success.
      for (const table of ["businesses", "bookings"]) {
        const { error } = await sb.from(table).select("*").limit(1);
        if (error) throw error;
      }
    },

    async getBusiness(slug) {
      const { data, error } = await sb.from("businesses").select("slug, name, industry, config").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },

    async saveBusiness({ slug, name, industry, config }) {
      const { error } = await sb
        .from("businesses")
        .upsert({ slug, name, industry, config, updated_at: new Date().toISOString() }, { onConflict: "slug" });
      if (error) throw error;
    },

    async listBookings(slug) {
      const { data, error } = await sb
        .from("bookings")
        .select(LIST_COLUMNS)
        .eq("business_slug", slug)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data.map(fromRow);
    },

    async insertBooking(slug, input) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await sb
          .from("bookings")
          .insert(toRow(slug, newQuoteId(), input))
          .select(LIST_COLUMNS)
          .single();
        if (!error) return { booking: fromRow(data), created: true };
        if (error.code !== "23505") throw error;
        // Same deposit order saved before (a retried request): return that booking.
        if (error.message.includes("bookings_deposit_order_idx")) {
          const existing = await findByOrder(input.deposit.orderId);
          if (existing && existing.business_slug === slug) return { booking: fromRow(existing), created: false };
          throw Object.assign(new Error("This payment is already attached to another booking."), { status: 409 });
        }
        // Otherwise the random quote ID was taken; draw again.
      }
      throw new Error("Could not assign a quote ID.");
    },
  };
}

function memoryDb() {
  const businesses = new Map();
  const bookings = [];

  return {
    kind: "memory",
    async check() {},

    async getBusiness(slug) {
      return businesses.get(slug) ?? null;
    },

    async saveBusiness(rec) {
      businesses.set(rec.slug, structuredClone(rec));
    },

    async listBookings(slug) {
      return bookings
        .filter((r) => r.business_slug === slug)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(fromRow);
    },

    async insertBooking(slug, input) {
      const existing = bookings.find((r) => r.deposit_order_id === input.deposit.orderId);
      if (existing) {
        if (existing.business_slug !== slug) {
          throw Object.assign(new Error("This payment is already attached to another booking."), { status: 409 });
        }
        return { booking: fromRow(existing), created: false };
      }
      let quoteId = newQuoteId();
      while (bookings.some((r) => r.business_slug === slug && r.quote_id === quoteId)) quoteId = newQuoteId();
      const row = { ...toRow(slug, quoteId, input), id: crypto.randomUUID(), created_at: new Date().toISOString() };
      bookings.push(row);
      return { booking: fromRow(row), created: true };
    },
  };
}
