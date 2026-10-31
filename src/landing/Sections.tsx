import { Fragment } from "react";
import type { IndustryConfig } from "@/data/industries";
import { DEMO_SLUG, bookingPath } from "@/lib/business";
import { formatMoney, priceQuote } from "@/lib/pricing";
import { DEPOSIT_MIN, DEPOSIT_RATE, depositFor } from "@/lib/deposit";

const REPO_URL = "https://github.com/waterhan0493-tech/quoteflow-paypal";

const H2 = "text-[clamp(30px,3.6vw,44px)] leading-[1.05] font-black tracking-[-0.025em] max-w-[18ch] [text-wrap:balance]";

/** One booking followed from quote to paid in full, priced from the demo shop's real price list. */
export function MoneyFlow({ config }: { config: IndustryConfig }) {
  const addOn = config.addOns.find((a) => a.enabledInBuilder);
  const size = config.defaultSize;
  const quote = priceQuote(config, {
    size,
    addOnIds: addOn ? [addOn.id] : [],
    urgency: "standard",
    frequency: "once",
  });
  const deposit = depositFor(quote.total);
  const balance = quote.total - deposit;
  const parts = [`${formatMoney(quote.baseFee)} visit`, `${formatMoney(quote.sizeCharge)} size`];
  if (addOn) parts.push(`${formatMoney(addOn.price)} add-on`);

  const stops = [
    {
      who: "Customer",
      title: "Builds the quote",
      amount: quote.total,
      tone: "text-ink",
      sub: parts,
      body: "Picks the size and extras, or describes the job in a sentence and AI fills it in.",
    },
    {
      who: "Customer",
      title: "Pays the deposit",
      amount: deposit,
      tone: "text-brand",
      sub: `${Math.round(DEPOSIT_RATE * 100)}% with PayPal, at least $${DEPOSIT_MIN}`,
      body: "Signs, picks a time and pays. The visit is booked from this moment.",
    },
    {
      who: "You, after the job",
      title: "Request the balance",
      amount: balance,
      tone: "text-brand",
      sub: "One pay link by email",
      body: "Mark the job done and send the customer a link for the rest.",
    },
    {
      who: "Your dashboard",
      title: "Paid in full",
      amount: quote.total,
      tone: "text-success",
      sub: "Both PayPal payments on one booking",
      body: "The booking moves to Paid in full the moment the customer pays.",
    },
  ];

  return (
    <section className="border-t border-line">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-20 sm:py-24">
        <h2 className={H2}>One booking, from quote to paid in full.</h2>
        <p className="mt-4 text-lg text-muted max-w-[52ch]">
          These are the demo shop's real prices for a {size.toLocaleString("en-US")} {config.unitLabel} home
          {addOn ? <> with the {addOn.name.toLowerCase()} add-on</> : null}.
        </p>

        <div className="relative mt-12 sm:mt-14">
          <div
            aria-hidden
            className="absolute left-[11px] top-3 bottom-3 w-[3px] rounded bg-[linear-gradient(180deg,#0070E0_0_78%,#0A7F4F_78%_100%)] md:left-3 md:right-[calc(25%-12px)] md:top-[11px] md:bottom-auto md:w-auto md:h-[3px] md:bg-[linear-gradient(90deg,#0070E0_0_66.7%,#0A7F4F_66.7%_100%)]"
          />
          <ol className="relative grid gap-9 pl-11 md:pl-0 md:grid-cols-4 md:gap-0">
            {stops.map((s, i) => {
              const last = i === stops.length - 1;
              return (
                <li key={s.title} className="relative md:pr-7">
                  <span
                    aria-hidden
                    className={
                      "absolute -left-11 top-0 md:static block w-[25px] h-[25px] rounded-full border-[3px] " +
                      (last ? "bg-success border-success" : "bg-white border-brand")
                    }
                  />
                  <div className="md:mt-5 text-[13px] font-bold text-muted">{s.who}</div>
                  <h3 className="mt-1 text-[19px] font-extrabold">{s.title}</h3>
                  <div className={"mt-3 text-[32px] md:text-[40px] leading-none font-black tracking-[-0.03em] tabular-nums " + s.tone}>
                    {formatMoney(s.amount)}
                  </div>
                  <div className="mt-1.5 text-[13px] text-muted tabular-nums">
                    {typeof s.sub === "string"
                      ? s.sub
                      : s.sub.map((part, j) => (
                          <Fragment key={part}>
                            {j > 0 && " + "}
                            <span className="whitespace-nowrap">{part}</span>
                          </Fragment>
                        ))}
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed max-w-[30ch]">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-[18px] border border-line bg-canvas px-5 py-4">
          <span className="rounded-full bg-white border border-line px-2.5 py-0.5 text-xs font-extrabold text-muted">
            Cancelled
          </span>
          <p className="flex-1 min-w-[240px] text-[15px] leading-relaxed">
            <b>Plans change?</b> Cancel the booking and the {formatMoney(deposit)} deposit goes back to the customer's
            PayPal in one step.
          </p>
        </div>

        <div className="mt-10">
          <a
            href={bookingPath(DEMO_SLUG)}
            className="inline-block rounded-full bg-brand text-white px-6 py-3 font-extrabold hover:bg-brand-dark"
          >
            Book this job yourself
          </a>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    who: "QuoteFlow server",
    paypal: false,
    text: "Prices the selection again and creates a PayPal order for the deposit.",
    code: "POST /v2/checkout/orders · custom_id = dep|shop|quote hash",
  },
  { who: "PayPal", paypal: true, text: "The customer approves the payment in the PayPal window." },
  {
    who: "QuoteFlow server",
    paypal: false,
    text: "Reads the order back, checks that its custom_id matches this quote and deposit, then captures it.",
    code: "GET /v2/checkout/orders/{id} · POST /v2/checkout/orders/{id}/capture",
  },
  {
    who: "QuoteFlow server",
    paypal: false,
    text: "Saves the booking and tells the owner's dashboard right away.",
    code: "Server-sent event · dashboard refetch",
  },
  {
    who: "PayPal",
    paypal: true,
    text: "After the job, the balance is a second order. A cancel refunds the deposit capture.",
    code: "POST /v2/payments/captures/{id}/refund",
  },
];

const SAFEGUARDS = [
  { title: "A changed price is refused", text: "If the order does not match the server's quote, nothing is saved.", code: "409" },
  {
    title: "No approval, no charge",
    text: "An order the customer did not approve is not captured, and the pay buttons come back.",
    code: "402",
  },
  { title: "Safe to retry", text: "Each capture and refund sends a PayPal-Request-Id, so a retry never charges twice." },
  { title: "Owner data stays private", text: "Owners sign in with Supabase. Only the owner sees their bookings or changes prices." },
];

/** How the server talks to PayPal, for readers who want to know it is real. */
export function ServerChecks() {
  return (
    <section className="bg-ink text-white">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-20 sm:py-24">
        <h2 className={H2}>The server checks every payment.</h2>
        <p className="mt-4 text-lg text-[#B5C1D4] max-w-[52ch]">
          The browser never decides the price. QuoteFlow prices the job again on the server, creates the PayPal order,
          and captures it only if it matches.
        </p>

        <div className="mt-12 sm:mt-14 grid lg:grid-cols-[1.25fr_1fr] gap-8 items-start">
          <ol className="rounded-[20px] border border-[#1E3358] divide-y divide-[#1E3358]">
            {STEPS.map((s) => (
              <li key={s.text} className="grid md:grid-cols-[150px_1fr] gap-1 md:gap-4 px-5 py-4">
                <div className={"text-[13px] font-extrabold " + (s.paypal ? "text-[#FFC845]" : "text-[#8FB8F0]")}>{s.who}</div>
                <div>
                  <p className="text-[15px] leading-snug">{s.text}</p>
                  {s.code && (
                    <code className="block mt-1.5 font-mono text-[12.5px] text-[#B5C1D4] break-words">{s.code}</code>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <ul className="grid gap-3">
            {SAFEGUARDS.map((f) => (
              <li key={f.title} className="rounded-2xl bg-[#0A2148] px-[18px] py-4">
                <b className="block font-extrabold">{f.title}</b>
                <span className="block mt-1 text-sm text-[#B5C1D4] leading-relaxed">
                  {f.text}
                  {f.code && <span className="ml-1.5 font-mono text-[13px] text-[#FFC845]">{f.code}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-full px-6 py-3 font-extrabold shadow-[inset_0_0_0_1.5px_#fff] hover:bg-white/10"
          >
            Read the code on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
