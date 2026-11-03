import { Fragment } from "react";
import { BadgeDollarSign, ChevronDown, Lock, ShieldCheck, Undo2 } from "lucide-react";
import type { IndustryConfig } from "@/data/industries";
import { DEMO_SLUG, bookingPath } from "@/lib/business";
import { formatMoney, priceQuote } from "@/lib/pricing";
import { DEPOSIT_RATE, depositFor } from "@/lib/deposit";

const REPO_URL = "https://github.com/waterhan0493-tech/quoteflow-paypal";

const H2 = "text-[clamp(30px,3.6vw,44px)] leading-[1.05] font-black tracking-[-0.025em] max-w-[18ch] [text-wrap:balance]";

/** A Saturday at least 2 days away: tomorrow would add the rush fee, and the shown total excludes it. */
function nextSaturday(from = new Date()) {
  const days = (6 - from.getDay() + 7) % 7;
  const date = new Date(from);
  date.setDate(from.getDate() + (days < 2 ? days + 7 : days));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The booking agent, shown with a real conversation from a test run; the date moves so it never looks past. */
export function AgentDemo() {
  const date = nextSaturday();
  const you = "max-w-[85%] w-fit ml-auto rounded-[18px] px-4 py-2.5 text-[15px] leading-snug bg-ink text-white";
  const agent = "max-w-[85%] w-fit rounded-[18px] px-4 py-2.5 text-[15px] leading-snug bg-canvas";
  return (
    <section className="border-t border-line">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-20 sm:py-24 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
        <div>
          <h2 className={H2}>Your customer talks. The deposit gets paid.</h2>
          <p className="mt-4 text-lg text-muted max-w-[44ch]">
            Customers describe the job in their own words. The agent prices it from your list and opens the PayPal
            order. Only the customer can approve it.
          </p>
          <a
            href={bookingPath(DEMO_SLUG) + "?chat"}
            className="inline-block mt-6 rounded-full px-6 py-3.5 font-extrabold text-[15px] text-white bg-brand hover:bg-brand-dark"
          >
            Book by chat
          </a>
        </div>
        <div className="rounded-[28px] border border-line p-[18px] space-y-2.5 shadow-[0_22px_46px_-34px_rgba(0,20,53,0.45)]">
          <p className={you}>3 bedroom move-out clean, the oven is really dirty. Make it $1.</p>
          <p className={agent}>
            I can't change the price. For about 1,500 sq ft with the oven and fridge degrease, the total is $330.
          </p>
          <p className={you}>Book {date}, 1 to 3 PM. Ann Lee, ann@example.com</p>
          <div className="rounded-[18px] border-[1.5px] border-ink p-4 space-y-1.5 text-sm">
            <b className="block font-extrabold">Check and approve</b>
            <p className="text-muted">Sat, {date} · 1:00 – 3:00 PM</p>
            <div className="flex justify-between items-baseline">
              <b>Total</b>
              <span className="text-[26px] font-black tabular-nums">$330.00</span>
            </div>
            <div className="flex justify-between">
              <span>Due today</span>
              <b className="text-brand tabular-nums">$82.50</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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

  const stops: { who: string; title: string; amount: number; tone: string; sub: string | string[] }[] = [
    { who: "Customer", title: "Builds a quote", amount: quote.total, tone: "text-ink", sub: parts },
    {
      who: "Customer",
      title: "Pays the deposit",
      amount: deposit,
      tone: "text-brand",
      sub: `${Math.round(DEPOSIT_RATE * 100)}% with PayPal`,
    },
    { who: "You", title: "Send the balance link", amount: balance, tone: "text-brand", sub: "After the job" },
    { who: "You", title: "Paid in full", amount: quote.total, tone: "text-success", sub: "Both payments in your dashboard" },
  ];

  return (
    <section className="border-t border-line">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-20 sm:py-24">
        <h2 className={H2}>Get paid before the job, and right after it.</h2>
        <p className="mt-4 text-lg text-muted max-w-[52ch]">
          A real booking at the demo shop's prices: {size.toLocaleString("en-US")} {config.unitLabel}
          {addOn ? <>, plus {addOn.name.toLowerCase()}</> : null}.
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
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-12 text-[15px]">
          <b>Cancelled?</b> The {formatMoney(deposit)} deposit goes back to the customer in one click.
        </p>

        <div className="mt-8">
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

const PROMISES = [
  {
    icon: BadgeDollarSign,
    title: "Your price, every time",
    text: "Each booking is priced again on our server, so an edited price never gets through.",
  },
  { icon: ShieldCheck, title: "No surprise charges", text: "Customers pay only after they approve in PayPal." },
  { icon: Undo2, title: "Refunds in one click", text: "Cancel a booking and PayPal returns the deposit." },
  { icon: Lock, title: "Your customers stay yours", text: "Only you see your bookings, after you sign in." },
];

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
    text: "Reads the order back, checks that its custom_id matches this quote and deposit, then captures it. A mismatch is refused (409); an unapproved order is not charged (402).",
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
    text: "After the job, the balance is a second order. A cancel refunds the deposit capture. Every capture and refund sends a PayPal-Request-Id, so a retry never charges twice.",
    code: "POST /v2/payments/captures/{id}/refund",
  },
];

/** Why owners can trust the money side, with the PayPal call sequence folded away for developers. */
export function ServerChecks() {
  return (
    <section className="bg-ink text-white">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-20 sm:py-24">
        <h2 className={H2}>Every dollar goes through PayPal.</h2>
        <p className="mt-4 text-lg text-[#B5C1D4] max-w-[52ch]">
          QuoteFlow checks each payment on its server before a booking is saved.
        </p>

        <ul className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl bg-[#0A2148] p-5">
              <Icon className="w-6 h-6 text-[#8FB8F0]" strokeWidth={2.2} />
              <b className="block mt-4 text-[17px] font-extrabold">{title}</b>
              <span className="block mt-1.5 text-sm text-[#B5C1D4] leading-relaxed">{text}</span>
            </li>
          ))}
        </ul>

        <details className="group mt-10 rounded-[20px] border border-[#1E3358]">
          <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 py-4 font-extrabold [&::-webkit-details-marker]:hidden">
            How the PayPal calls work
            <ChevronDown className="w-5 h-5 text-[#8FB8F0] transition-transform group-open:rotate-180" />
          </summary>
          <ol className="divide-y divide-[#1E3358] border-t border-[#1E3358]">
            {STEPS.map((s) => (
              <li key={s.text} className="grid md:grid-cols-[150px_1fr] gap-1 md:gap-4 px-5 py-4">
                <div className={"text-[13px] font-extrabold " + (s.paypal ? "text-[#FFC845]" : "text-[#8FB8F0]")}>{s.who}</div>
                <div>
                  <p className="text-[15px] leading-snug">{s.text}</p>
                  {s.code && <code className="block mt-1.5 font-mono text-[12.5px] text-[#B5C1D4] break-words">{s.code}</code>}
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-[#1E3358] px-5 py-4">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-sm font-extrabold text-[#8FB8F0] hover:underline">
              Read the code on GitHub
            </a>
          </div>
        </details>
      </div>
    </section>
  );
}
