import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck,
  Check,
  Copy,
  ExternalLink,
  House,
  Loader2,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { INITIAL_PRESETS, type IndustryConfig, type PresetId } from "@/data/industries";
import { listQuotes, subscribeQuotes, type QuoteRecord } from "@/lib/store";
import {
  DEMO_SLUG,
  bookingPath,
  isBooking,
  loadBusinessConfig,
  parseDateSlot,
  saveBusinessConfig,
} from "@/lib/business";
import { formatMoney } from "@/lib/pricing";
import { paypalClientId } from "@/lib/deposit";

type Section = "home" | "bookings" | "pricing";
const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "pricing", label: "Pricing", icon: SlidersHorizontal },
];

type Booking = QuoteRecord & { deposit: NonNullable<QuoteRecord["deposit"]> };

function sectionFromHash(): Section {
  const h = window.location.hash.replace("#", "");
  return h === "bookings" || h === "pricing" ? h : "home";
}

function visitDate(b: Booking): Date | null {
  return parseDateSlot(b.dateSlot);
}

function formatVisit(b: Booking): string {
  const d = visitDate(b);
  const day = d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : b.dateSlot;
  return day + " · " + b.timeSlot;
}

export function Dashboard() {
  const slug = DEMO_SLUG;
  const [section, setSection] = useState<Section>(sectionFromHash);
  const [config, setConfig] = useState<IndustryConfig | null>(null);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    document.title = "Dashboard · QuoteFlow";
    const onHash = () => setSection(sectionFromHash());
    window.addEventListener("hashchange", onHash);
    loadBusinessConfig(slug).then(setConfig);
    listQuotes(slug).then(
      (q) => {
        setQuotes(q);
        setLoadError("");
      },
      (err: Error) => setLoadError(err.message)
    );
    // A booking made on any device shows up here at once.
    const unsub = subscribeQuotes(slug, (q) => {
      setQuotes(q);
      setLoadError("");
    });
    return () => {
      window.removeEventListener("hashchange", onHash);
      unsub();
    };
  }, [slug]);

  const bookings = useMemo(
    () =>
      quotes
        .filter(isBooking)
        .sort((a, b) => (a.dateSlot + a.timeSlot).localeCompare(b.dateSlot + b.timeSlot)),
    [quotes]
  );

  const go = (s: Section) => {
    window.location.hash = s === "home" ? "" : s;
    setSection(s);
  };

  if (!config) {
    return (
      <div className="min-h-screen grid place-items-center bg-canvas text-muted">
        <Loader2 className="w-6 h-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      {/* Side menu (top bar on small screens) */}
      <aside className="lg:w-60 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 bg-white border-b lg:border-b-0 lg:border-r border-line flex flex-wrap lg:flex-nowrap lg:flex-col gap-x-4 gap-y-2 px-4 py-3 lg:py-6 items-center lg:items-stretch">
        <div className="flex lg:flex-col items-center lg:items-start gap-3 lg:px-2 shrink-0">
          <a href="/" aria-label="QuoteFlow home">
            <BrandMark />
          </a>
          <span className="rounded-full bg-[#FFF4CC] text-[#6B4E00] text-[11px] font-extrabold px-2.5 py-0.5">
            {paypalClientId() ? "PayPal Sandbox" : "Demo payments"}
          </span>
        </div>
        <nav className="w-full lg:w-auto flex lg:flex-col gap-1 lg:mt-4 overflow-x-auto [scrollbar-width:none] -mx-1 px-1" aria-label="Dashboard">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={section === id ? "page" : undefined}
              className={
                "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-bold whitespace-nowrap transition-colors " +
                (section === id ? "bg-brand-soft text-brand" : "text-ink hover:bg-canvas")
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
              {id === "bookings" && bookings.length > 0 && (
                <span className="tabular-nums text-xs font-extrabold text-muted">{bookings.length}</span>
              )}
            </button>
          ))}
          <a
            href={bookingPath(slug)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-bold whitespace-nowrap text-ink hover:bg-canvas"
          >
            <ExternalLink className="w-[18px] h-[18px]" />
            Booking page
          </a>
        </nav>
        <div className="hidden lg:block mt-auto px-2 text-xs text-muted">
          Signed in as <b className="text-ink">{config.businessName}</b>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-5 sm:px-8 py-7 lg:py-9">
        <div className="max-w-[1080px] mx-auto">
          {loadError && (
            <p role="alert" className="mb-5 rounded-[14px] bg-[#FDECEC] text-[#8A1C1C] text-sm font-semibold px-4 py-3">
              Bookings could not load. {loadError}
            </p>
          )}
          {section === "home" && <HomeSection config={config} slug={slug} bookings={bookings} onOpen={go} />}
          {section === "bookings" && <BookingsSection bookings={bookings} slug={slug} />}
          {section === "pricing" && <PricingSection config={config} slug={slug} onChange={setConfig} />}
        </div>
      </main>
    </div>
  );
}

/* ---------------- Home ---------------- */

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function HomeSection({
  config,
  slug,
  bookings,
  onOpen,
}: {
  config: IndustryConfig;
  slug: string;
  bookings: Booking[];
  onOpen: (s: Section) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = bookings.filter((b) => {
    const d = visitDate(b);
    return d !== null && d >= today;
  });
  const deposits = bookings.reduce((sum, b) => sum + b.deposit.amount, 0);
  const balance = bookings.reduce((sum, b) => sum + (b.totalPrice - b.deposit.amount), 0);

  return (
    <div className="space-y-7">
      <div className="space-y-1">
        <h1 className="text-[32px] leading-tight font-black tracking-tight">
          {greeting()}, {config.businessName}
        </h1>
        <p className="text-muted">
          {upcoming.length === 0
            ? "No visits booked yet. Share your booking page to get the first one."
            : upcoming.length === 1
              ? "You have 1 upcoming visit."
              : "You have " + upcoming.length + " upcoming visits."}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Upcoming visits" value={String(upcoming.length)} note={bookings.length + " booked in total"} />
        <Stat label="Deposits received" value={formatMoney(deposits)} note="Paid when the customer booked" />
        <Stat label="Balance to collect" value={formatMoney(balance)} note="Due after each job" />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <section className="bg-white border border-line rounded-2xl">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-lg font-extrabold">Next visits</h2>
            {bookings.length > 0 && (
              <button type="button" onClick={() => onOpen("bookings")} className="text-sm font-bold text-brand hover:underline">
                All bookings
              </button>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">New bookings appear here as soon as the customer pays the deposit.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {upcoming.slice(0, 5).map((b) => (
                <li key={b.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-bold">{b.customerName}</div>
                    <div className="text-[13px] text-muted">{formatVisit(b)}</div>
                  </div>
                  <span className="tabular-nums font-bold">{formatMoney(b.totalPrice)}</span>
                  <StatusChip booking={b} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <LinkCard slug={slug} />
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-white border border-line rounded-2xl px-5 py-4 grid gap-1">
      <span className="text-[13px] font-bold text-muted">{label}</span>
      <span className="text-[28px] leading-none font-black tracking-tight tabular-nums">{value}</span>
      <span className="text-xs text-muted">{note}</span>
    </div>
  );
}

function StatusChip({ booking }: { booking: Booking }) {
  const demo = booking.deposit.provider === "demo";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap " +
        (demo ? "bg-canvas text-muted" : "bg-success-soft text-success")
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {demo ? "Demo deposit" : "Deposit paid"}
    </span>
  );
}

function LinkCard({ slug }: { slug: string }) {
  const url = window.location.origin + bookingPath(slug);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="bg-white border border-line rounded-2xl p-5 space-y-3">
      <h2 className="text-lg font-extrabold">Your booking page</h2>
      <p className="text-sm text-muted">Send this link to customers or put it on your website. They get a price, pick a time and pay the deposit.</p>
      <div className="rounded-xl bg-canvas px-3 py-2.5 text-sm font-semibold break-all">{url}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-white px-4 py-2 text-sm font-extrabold hover:bg-[#0A2A5C]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={bookingPath(slug)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold shadow-[inset_0_0_0_1.5px_#001435] hover:bg-canvas"
        >
          Open
        </a>
      </div>
    </section>
  );
}

/* ---------------- Bookings ---------------- */

function BookingsSection({ bookings, slug }: { bookings: Booking[]; slug: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-[32px] leading-tight font-black tracking-tight">Bookings</h1>
        <p className="text-muted">Every visit a customer booked and paid a deposit for, soonest first.</p>
      </div>
      {bookings.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-6 space-y-2">
          <p className="font-bold">No bookings yet</p>
          <p className="text-sm text-muted">
            Open your{" "}
            <a href={bookingPath(slug)} target="_blank" rel="noreferrer" className="text-brand font-bold hover:underline">
              booking page
            </a>{" "}
            and make a test booking. It appears here when the deposit is paid.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[13px] text-muted">
                <th className="font-bold px-5 py-3">Customer</th>
                <th className="font-bold px-3 py-3">Visit</th>
                <th className="font-bold px-3 py-3">Job</th>
                <th className="font-bold px-3 py-3 text-right">Total</th>
                <th className="font-bold px-3 py-3 text-right">Deposit</th>
                <th className="font-bold px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {bookings.map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="px-5 py-3.5">
                    <div className="font-bold">{b.customerName}</div>
                    <div className="text-[13px] text-muted">{b.customerEmail}</div>
                    <div className="text-xs text-muted tabular-nums">{b.quoteId}</div>
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    {formatVisit(b)}
                    {b.urgency === "rush" && <div className="text-xs font-bold text-[#9A5B00]">Next-day rush</div>}
                  </td>
                  <td className="px-3 py-3.5">
                    <div>{b.scopeSummary}</div>
                    <div className="text-xs text-muted">{b.frequencyLabel}</div>
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-bold">{formatMoney(b.totalPrice)}</td>
                  <td className="px-3 py-3.5 text-right">
                    <div className="tabular-nums font-bold">{formatMoney(b.deposit.amount)}</div>
                    <div className="text-xs text-muted tabular-nums" title="PayPal order ID">
                      {b.deposit.orderId}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusChip booking={b} />
                    <div className="text-xs text-muted mt-1 tabular-nums">
                      {formatMoney(b.totalPrice - b.deposit.amount)} after the job
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Pricing ---------------- */

function PricingSection({
  config,
  slug,
  onChange,
}: {
  config: IndustryConfig;
  slug: string;
  onChange: (c: IndustryConfig) => void;
}) {
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const update = (next: IndustryConfig) => {
    onChange(next);
    setSaved("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveBusinessConfig(slug, next);
        setSaved("saved");
        setPreviewKey((k) => k + 1);
      } catch (err) {
        setSaved("error");
        setSaveError((err as Error).message);
      }
    }, 500);
  };

  const setAddOn = (id: string, patch: Partial<IndustryConfig["addOns"][number]>) =>
    update({ ...config, addOns: config.addOns.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-[32px] leading-tight font-black tracking-tight">Pricing</h1>
          <p className="text-muted">Customers see these prices on your booking page. Changes save as you type.</p>
        </div>
        <span className={"text-[13px] font-bold " + (saved === "error" ? "text-[#B42318]" : "text-muted")} role="status">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : saved === "error" ? "Not saved. " + saveError : ""}
        </span>
      </div>

      <div className="grid xl:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-5">
          <section className="bg-white border border-line rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-extrabold">Business</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                id="biz-name"
                label="Business name"
                value={config.businessName}
                onChange={(v) => update({ ...config, businessName: v })}
              />
              <div className="space-y-1.5">
                <label htmlFor="biz-type" className="text-[13px] font-bold text-muted">
                  Type of work
                </label>
                <select
                  id="biz-type"
                  value={config.id}
                  onChange={(e) => update({ ...INITIAL_PRESETS[e.target.value as PresetId], businessName: config.businessName })}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 bg-white font-semibold"
                >
                  {Object.values(INITIAL_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">Switching loads that trade's starting prices.</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-line rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-extrabold">Base price</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <MoneyField
                id="base-fee"
                label="Visit fee"
                value={config.baseFee}
                step={1}
                onChange={(v) => update({ ...config, baseFee: v })}
              />
              <MoneyField
                id="unit-rate"
                label={"Price per " + config.unitSingular}
                value={config.multiplier}
                step={config.stepMultiplier}
                onChange={(v) => update({ ...config, multiplier: v })}
              />
            </div>
            <p className="text-[13px] text-muted">
              Example: a {config.defaultSize.toLocaleString("en-US")} {config.unitLabel} job starts at{" "}
              <b className="text-ink tabular-nums">
                {formatMoney(config.baseFee + Math.round(config.defaultSize * config.multiplier))}
              </b>
              .
            </p>
          </section>

          <section className="bg-white border border-line rounded-2xl">
            <h2 className="text-lg font-extrabold px-5 pt-5 pb-3">Add-ons</h2>
            <ul className="divide-y divide-line border-t border-line">
              {config.addOns.map((a) => (
                <li key={a.id} className="px-5 py-3.5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={a.enabledInBuilder}
                    aria-label={(a.enabledInBuilder ? "Hide " : "Offer ") + a.name}
                    onClick={() => setAddOn(a.id, { enabledInBuilder: !a.enabledInBuilder })}
                    className={
                      "relative w-10 h-6 rounded-full shrink-0 transition-colors " +
                      (a.enabledInBuilder ? "bg-brand" : "bg-[#C9D2DE]")
                    }
                  >
                    <span
                      className={
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all " +
                        (a.enabledInBuilder ? "left-[18px]" : "left-0.5")
                      }
                    />
                  </button>
                  <div className={"flex-1 min-w-[200px] " + (a.enabledInBuilder ? "" : "opacity-55")}>
                    <div className="font-bold">{a.name}</div>
                    <div className="text-xs text-muted">{a.description}</div>
                  </div>
                  <div className="w-28">
                    <MoneyField
                      id={"addon-" + a.id}
                      label={"Price for " + a.name}
                      hideLabel
                      value={a.price}
                      step={5}
                      onChange={(v) => setAddOn(a.id, { price: v })}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="hidden xl:block sticky top-8 space-y-2">
          <div className="text-[13px] font-bold text-muted text-center">What customers see</div>
          <div className="mx-auto w-[375px] h-[720px] rounded-[40px] border border-[#CBD3DE] bg-white overflow-hidden shadow-[0_24px_48px_-28px_rgba(0,20,53,0.35)] p-[7px]">
            <iframe
              key={previewKey}
              title="Booking page preview"
              src={bookingPath(slug)}
              className="w-full h-full rounded-[33px] border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line px-3.5 py-2.5 font-semibold outline-none focus:border-brand focus:shadow-[inset_0_0_0_1px_#0070E0]"
      />
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  step,
  onChange,
  hideLabel = false,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  hideLabel?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-[13px] font-bold text-muted"}>
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-line focus-within:border-brand focus-within:shadow-[inset_0_0_0_1px_#0070E0]">
        <span className="pl-3.5 text-muted font-semibold">$</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 0) onChange(v);
          }}
          className="w-full bg-transparent px-2 py-2.5 font-semibold tabular-nums outline-none"
        />
      </div>
    </div>
  );
}
