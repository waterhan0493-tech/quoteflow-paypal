import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { INITIAL_PRESETS } from "@/data/industries";
import { DEMO_SLUG, bookingPath, loadBusinessConfig } from "@/lib/business";
import { formatMoney, priceQuote } from "@/lib/pricing";
import { DEPOSIT_RATE, depositFor } from "@/lib/deposit";
import { MoneyFlow, ServerChecks } from "./Sections";

const FACTS = [
  "AI turns one sentence into a priced quote.",
  `A ${Math.round(DEPOSIT_RATE * 100)}% PayPal deposit locks the date.`,
  "Balance links and refunds in one click.",
];

export function Landing() {
  const [config, setConfig] = useState(INITIAL_PRESETS.cleaning);
  const [size, setSize] = useState(INITIAL_PRESETS.cleaning.defaultSize);
  const firstAddOn = config.addOns.find((a) => a.enabledInBuilder);

  useEffect(() => {
    document.title = "QuoteFlow · Quotes that end in a paid deposit";
    loadBusinessConfig(DEMO_SLUG).then((c) => {
      if (c) {
        setConfig(c);
        setSize(c.defaultSize);
      }
    });
  }, []);

  const quote = priceQuote(config, {
    size,
    addOnIds: firstAddOn ? [firstAddOn.id] : [],
    urgency: "standard",
    frequency: "once",
  });
  const deposit = depositFor(quote.total);

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="max-w-[1180px] mx-auto px-5 sm:px-12 py-5 flex items-center justify-between gap-4">
        <BrandMark />
        <a
          href="/dashboard"
          className="rounded-full bg-ink text-white px-4 py-2 text-sm font-extrabold hover:bg-[#0A2A5C]"
        >
          Owner dashboard
        </a>
      </header>

      <main className="max-w-[1180px] mx-auto px-5 sm:px-12 pt-8 pb-20 grid lg:grid-cols-[1fr_400px] gap-12 items-start">
        <div className="pt-2 lg:pt-6">
          <h1 className="text-[clamp(40px,5.4vw,64px)] leading-[1.02] font-black tracking-[-0.03em] max-w-[12ch] [text-wrap:balance]">
            Every quote ends in a paid deposit.
          </h1>
          <p className="mt-5 text-lg text-muted max-w-[44ch]">
            A booking page for home-service businesses. Customers build their own quote from your prices, pick a time
            and lock it with a PayPal deposit.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <a
              href={bookingPath(DEMO_SLUG)}
              className="rounded-full bg-brand text-white px-6 py-3 font-extrabold hover:bg-brand-dark"
            >
              Try the booking page
            </a>
            <a
              href="/dashboard"
              className="rounded-full px-6 py-3 font-extrabold shadow-[inset_0_0_0_1.5px_#001435] hover:bg-canvas"
            >
              See the owner side
            </a>
          </div>
          <ul className="mt-8 grid gap-2.5 max-w-[46ch] text-[15px]">
            {FACTS.map((f) => (
              <li key={f} className="flex gap-2.5 items-start">
                <Check className="w-[18px] h-[18px] mt-0.5 shrink-0 text-success" strokeWidth={2.6} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[18px] border border-line bg-white p-5 space-y-3.5 shadow-[0_22px_46px_-30px_rgba(0,20,53,0.45)]">
          <div className="flex justify-between items-baseline text-[13px] text-muted">
            <span>{config.businessName}</span>
            <span>Live quote</span>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="hero-size" className="text-[13px] font-bold text-muted">
              {config.sizeLabel} ·{" "}
              <span className="text-ink tabular-nums">
                {size.toLocaleString("en-US")} {config.unitLabel}
              </span>
            </label>
            <input
              id="hero-size"
              type="range"
              min={config.minSize}
              max={config.maxSize}
              step={config.stepSize}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Base visit" amount={quote.baseFee} />
            <Row label="Size charge" amount={quote.sizeCharge} />
            {quote.addOns.map((a) => (
              <Row key={a.id} label={a.name} amount={a.price} />
            ))}
          </div>
          <div className="border-t-[1.5px] border-dashed border-line" />
          <div className="text-[52px] leading-none font-black tracking-[-0.03em] tabular-nums">{formatMoney(quote.total)}</div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[14px] bg-brand-soft p-3 grid gap-0.5">
              <small className="text-xs text-muted font-semibold">Due today</small>
              <b className="text-[22px] font-black text-brand tabular-nums">{formatMoney(deposit)}</b>
            </div>
            <div className="rounded-[14px] bg-canvas p-3 grid gap-0.5">
              <small className="text-xs text-muted font-semibold">After the job</small>
              <b className="text-[22px] font-black tabular-nums">{formatMoney(quote.total - deposit)}</b>
            </div>
          </div>
          <a
            href={bookingPath(DEMO_SLUG)}
            className="block text-center rounded-full bg-ink text-white py-3 font-extrabold hover:bg-[#0A2A5C]"
          >
            Book this visit
          </a>
          <p className="text-xs text-muted text-center">Uses the PayPal sandbox. No real money moves.</p>
        </div>
      </main>

      <MoneyFlow config={config} />
      <ServerChecks />

      <footer>
        <div className="max-w-[1180px] mx-auto px-5 sm:px-12 py-6 text-[13px] text-muted flex flex-wrap gap-x-6 gap-y-1">
          <span>Built for the PayPal AI Hackathon 2026</span>
          <span>Open source under the MIT license</span>
        </div>
      </footer>
    </div>
  );
}

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums font-semibold">{formatMoney(amount)}</span>
    </div>
  );
}
