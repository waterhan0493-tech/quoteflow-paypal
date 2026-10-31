import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import type { IndustryConfig } from "@/data/industries";
import { createDepositOrder, createQuote, type ApprovedPayment, type QuoteRecord } from "@/lib/store";
import { ApiError } from "@/lib/api";
import { paymentNotice, usePublicConfig } from "@/lib/config";
import { loadBusinessConfig } from "@/lib/business";
import { FREQUENCY_OPTIONS, formatMoney, priceQuote, type Frequency, type Urgency } from "@/lib/pricing";
import { requestAiQuote } from "@/lib/aiQuote";
import { depositFor } from "@/lib/deposit";
import { PaymentButtons } from "@/components/PaymentButtons";
import { SignaturePad } from "@/components/customer/SignaturePad";

const ARRIVAL_WINDOWS = ["8:00 – 10:00 AM", "10:00 AM – 12:00 PM", "1:00 – 3:00 PM", "3:00 – 5:00 PM"];
const BOOKABLE_DAYS = 14;

type Step = "quote" | "time" | "details" | "deposit" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "quote", label: "Quote" },
  { id: "time", label: "Time" },
  { id: "details", label: "Details" },
  { id: "deposit", label: "Deposit" },
];

function isoDate(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Bookable days start tomorrow; tomorrow is the next-day rush slot. */
function upcomingDays(count: number): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1 + i);
    return d;
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BookingPage({ slug }: { slug: string }) {
  const [config, setConfig] = useState<IndustryConfig | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    loadBusinessConfig(slug).then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (config && config !== "loading") document.title = "Book " + config.businessName;
  }, [config]);

  if (config === "loading") {
    return (
      <div className="min-h-screen bg-white grid place-items-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (!config) {
    return (
      <div className="min-h-screen bg-white grid place-items-center px-6 text-center text-ink">
        <div className="space-y-2 max-w-sm">
          <h1 className="text-2xl font-black">This booking page does not exist</h1>
          <p className="text-muted">Check the link you were sent, or ask the business for a new one.</p>
        </div>
      </div>
    );
  }
  return <BookingFlow slug={slug} config={config} />;
}

function BookingFlow({ slug, config }: { slug: string; config: IndustryConfig }) {
  const [step, setStep] = useState<Step>("quote");

  // Quote
  const [size, setSize] = useState(config.defaultSize);
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Frequency>("once");

  // Time
  const days = useMemo(() => upcomingDays(BOOKABLE_DAYS), []);
  const [dayIndex, setDayIndex] = useState(1);
  const [windowIndex, setWindowIndex] = useState(0);
  const urgency: Urgency = dayIndex === 0 ? "rush" : "standard";

  // Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [signature, setSignature] = useState("");

  // Deposit
  const [agreed, setAgreed] = useState(false);
  const [booking, setBooking] = useState<QuoteRecord | null>(null);
  // Set once the buyer approved, so a failed save is retried with the same order and never paid twice.
  const [payment, setPayment] = useState<ApprovedPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Nothing was charged (declined, or the quote changed): show the payment buttons again with this note.
  const [payError, setPayError] = useState("");
  const publicConfig = usePublicConfig();

  const quote = priceQuote(config, { size, addOnIds, urgency, frequency });
  const deposit = depositFor(quote.total);
  const balance = Math.round((quote.total - deposit) * 100) / 100;
  const addOns = config.addOns.filter((a) => a.enabledInBuilder);
  const day = days[dayIndex];
  const dayLong = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const sizeText = size.toLocaleString("en-US") + " " + config.unitLabel;

  const detailsReady = name.trim().length > 1 && EMAIL_RE.test(email.trim()) && signature !== "";

  const goto = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const applySuggestion = (s: { size: number; addOnIds: string[]; urgency: string; frequency: Frequency }) => {
    const stepped = Math.round(s.size / config.stepSize) * config.stepSize;
    setSize(Math.min(config.maxSize, Math.max(config.minSize, stepped)));
    setAddOnIds(s.addOnIds.filter((id) => addOns.some((a) => a.id === id)));
    setFrequency(s.frequency);
    if (s.urgency === "rush") setDayIndex(0);
    else if (dayIndex === 0) setDayIndex(1);
  };

  const selection = { size, addOnIds, urgency, frequency };

  const finish = async (paid: ApprovedPayment) => {
    setPayment(paid);
    setSaving(true);
    setSaveError("");
    setPayError("");
    try {
      const saved = await createQuote(slug, {
        customerName: name.trim(),
        customerEmail: email.trim(),
        dateSlot: isoDate(day),
        timeSlot: ARRIVAL_WINDOWS[windowIndex],
        signatureDataUrl: signature,
        selection,
        deposit: paid,
      });
      setBooking(saved);
      goto("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      if (err instanceof ApiError && (err.status === 402 || err.status === 409 || err.status === 400)) {
        setPayment(null);
        setPayError(message);
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    setSize(config.defaultSize);
    setAddOnIds([]);
    setFrequency("once");
    setDayIndex(1);
    setWindowIndex(0);
    setAgreed(false);
    setBooking(null);
    setPayment(null);
    setSaveError("");
    setPayError("");
    goto("quote");
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const back: Record<Step, Step | null> = { quote: null, time: "quote", details: "time", deposit: payment ? null : "details", done: null };

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="max-w-[520px] mx-auto px-5 pb-36">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white pt-3 pb-3 space-y-3">
          <div className="h-10 flex items-center justify-between gap-3">
            {back[step] ? (
              <button
                type="button"
                onClick={() => goto(back[step]!)}
                className="w-10 h-10 rounded-full border border-line grid place-items-center hover:bg-canvas"
                aria-label="Back"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
              </button>
            ) : (
              <span className="w-10" />
            )}
            <span className="font-extrabold text-[15px] truncate">{config.businessName}</span>
            <span className="w-10" />
          </div>
          {step !== "done" && (
            <div>
              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <i key={s.id} className={"block h-1 rounded " + (i <= stepIndex ? "bg-brand" : "bg-line")} />
                ))}
              </div>
              <ol className="grid grid-cols-4 mt-1.5 text-[11px] font-bold text-muted">
                {STEPS.map((s, i) => (
                  <li
                    key={s.id}
                    aria-current={i === stepIndex ? "step" : undefined}
                    className={(i === stepIndex ? "text-ink " : "") + (i === 0 ? "" : i === 3 ? "text-right" : "text-center")}
                  >
                    {s.label}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </header>

        {step === "quote" && (
          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <h1 className="text-[28px] leading-[1.1] font-black tracking-tight">What do you need done?</h1>
              <p className="text-muted text-[15px]">
                {config.tagline}. Describe the job in your own words, or set the quote below.
              </p>
            </div>

            <AskBox config={config} onApply={applySuggestion} />

            <div className="rounded-[18px] border border-line p-5 space-y-4">
              <div className="flex justify-between items-baseline text-[13px] text-muted">
                <span>{config.label}</span>
                <span>Quote</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="qf-size" className="text-[13px] font-bold text-muted">
                  {config.sizeLabel} · <span className="text-ink tabular-nums">{sizeText}</span>
                </label>
                <input
                  id="qf-size"
                  type="range"
                  min={config.minSize}
                  max={config.maxSize}
                  step={config.stepSize}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>

              <div className="space-y-2.5 text-sm">
                <Line label="Base visit" amount={quote.baseFee} />
                <Line
                  label={"Size charge ($" + config.multiplier + " / " + config.unitSingular + ")"}
                  amount={quote.sizeCharge}
                />
                {addOns.map((a) => {
                  const on = addOnIds.includes(a.id);
                  return (
                    <div key={a.id} className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setAddOnIds((prev) => (on ? prev.filter((id) => id !== a.id) : [...prev, a.id]))}
                        className="flex items-start gap-2.5 text-left"
                      >
                        <span
                          className={
                            "mt-px w-5 h-5 rounded-md border-[1.5px] grid place-items-center shrink-0 transition-colors " +
                            (on ? "bg-brand border-brand" : "border-[#B9C4D3]")
                          }
                        >
                          {on && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                        </span>
                        <span>
                          <span className="block">{a.name}</span>
                          <span className="block text-xs text-muted">{a.description}</span>
                        </span>
                      </button>
                      <span className={"tabular-nums whitespace-nowrap " + (on ? "font-semibold" : "text-muted")}>
                        {on ? formatMoney(a.price) : "+" + formatMoney(a.price)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <span className="text-[13px] font-bold text-muted">How often?</span>
                <div className="grid grid-cols-3 gap-1 bg-canvas rounded-full p-1">
                  {FREQUENCY_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={frequency === f.id}
                      onClick={() => setFrequency(f.id)}
                      className={
                        "rounded-full py-2 text-[13px] font-bold leading-tight transition " +
                        (frequency === f.id ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,20,53,0.14)]" : "text-muted")
                      }
                    >
                      {f.label}
                      {f.discount > 0 && <span className="block text-[11px] font-semibold">{f.badge}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {quote.rushFee > 0 && <Line label="Next-day rush (+20%)" amount={quote.rushFee} />}
              {quote.discount > 0 && (
                <Line label={quote.frequency.label + " plan (" + quote.frequency.badge + ")"} amount={-quote.discount} />
              )}

              <div className="border-t-[1.5px] border-dashed border-line pt-3 flex justify-between items-baseline">
                <span className="text-[13px] font-bold text-muted">Total</span>
                <span className="text-[40px] leading-none font-black tracking-tight tabular-nums">
                  {formatMoney(quote.total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {step === "time" && (
          <div className="space-y-5 pt-2">
            <h1 className="text-[28px] leading-[1.1] font-black tracking-tight">When should we come?</h1>
            <div className="space-y-2">
              <h2 className="text-[17px] font-extrabold">
                {day.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 [scrollbar-width:none]">
                {days.map((d, i) => {
                  const on = i === dayIndex;
                  return (
                    <button
                      key={isoDate(d)}
                      type="button"
                      aria-pressed={on}
                      aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + (i === 0 ? ", next-day rush, plus 20 percent" : "")}
                      onClick={() => setDayIndex(i)}
                      className={
                        "shrink-0 w-[62px] rounded-2xl border pt-2.5 pb-2 grid justify-items-center gap-px transition-colors " +
                        (on ? "bg-ink border-ink text-white" : "border-line bg-white hover:border-[#B9C4D3]")
                      }
                    >
                      <small className={"text-xs font-semibold " + (on ? "text-[#C9D4E5]" : "text-muted")}>
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </small>
                      <b className="text-xl font-black">{d.getDate()}</b>
                      <em
                        className={
                          "not-italic text-[10px] font-extrabold rounded-full px-1.5 mt-0.5 " +
                          (i === 0 ? "text-[#9A5B00] bg-[#FFF1D6]" : "invisible")
                        }
                      >
                        +20%
                      </em>
                    </button>
                  );
                })}
              </div>
              <p className="text-[13px] text-muted">Tomorrow is a next-day rush visit (+20%). Other days have no extra fee.</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-[17px] font-extrabold">Arrival window</h2>
              <div className="grid gap-2">
                {ARRIVAL_WINDOWS.map((w, i) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={i === windowIndex}
                    onClick={() => setWindowIndex(i)}
                    className={
                      "rounded-[14px] border px-4 py-3.5 flex justify-between items-center font-bold text-[15px] transition-colors " +
                      (i === windowIndex ? "border-brand shadow-[inset_0_0_0_1px_#0070E0]" : "border-line hover:border-[#B9C4D3]")
                    }
                  >
                    {w}
                    <span className="text-[13px] font-medium text-muted">Arrival</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-5 pt-2">
            <h1 className="text-[28px] leading-[1.1] font-black tracking-tight">Your details</h1>
            <Field id="qf-name" label="Full name" value={name} onChange={setName} autoComplete="name" />
            <Field id="qf-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            {email.trim() !== "" && !EMAIL_RE.test(email.trim()) && (
              <p className="text-[13px] text-red-700 -mt-3">Enter an email like name@example.com.</p>
            )}
            <SignaturePad
              onSigned={setSignature}
              onClear={() => setSignature("")}
            />
            <p className="text-[13px] text-muted">
              Your signature accepts the quote of {formatMoney(quote.total)} for {dayLong}, {ARRIVAL_WINDOWS[windowIndex]}.
            </p>
          </div>
        )}

        {step === "deposit" && (
          <div className="space-y-4 pt-2">
            <h1 className="text-[28px] leading-[1.1] font-black tracking-tight">Pay the deposit</h1>
            {publicConfig && paymentNotice(publicConfig) && (
              <div className="bg-[#FFF4CC] text-[#6B4E00] text-xs font-bold px-3 py-2 rounded-[10px] flex gap-2 items-center">
                <Lock className="w-[15px] h-[15px]" />
                {paymentNotice(publicConfig)}
              </div>
            )}
            <div className="rounded-[18px] border border-line p-5 space-y-3.5">
              <div className="flex justify-between items-baseline text-[13px] text-muted gap-3">
                <span>
                  {dayLong} · {ARRIVAL_WINDOWS[windowIndex]}
                </span>
                <span>Booking</span>
              </div>
              <div className="space-y-2 text-sm">
                <Line label={config.label + " · " + sizeText} amount={quote.baseFee + quote.sizeCharge} />
                {quote.addOns.map((a) => (
                  <Line key={a.id} label={a.name} amount={a.price} />
                ))}
                {quote.rushFee > 0 && <Line label="Next-day rush (+20%)" amount={quote.rushFee} />}
                {quote.discount > 0 && <Line label={quote.frequency.label + " plan"} amount={-quote.discount} />}
                <div className="border-t border-line pt-2.5 flex justify-between font-black text-base">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMoney(quote.total)}</span>
                </div>
              </div>
              <Split deposit={deposit} balance={balance} />
            </div>
            <p className="text-[13px] text-muted">
              Your deposit holds this price and time with {config.businessName}. It comes off the final bill.
            </p>
            <button
              type="button"
              aria-pressed={agreed}
              onClick={() => setAgreed((v) => !v)}
              className="flex gap-2.5 items-start text-left text-[13px]"
            >
              <span
                className={
                  "mt-px w-5 h-5 rounded-md border-[1.5px] grid place-items-center shrink-0 " +
                  (agreed ? "bg-brand border-brand" : "border-[#B9C4D3]")
                }
              >
                {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
              </span>
              <span>I agree to the quote and to paying the rest after the job.</span>
            </button>
            {payment ? (
              <div className="space-y-3" role="status">
                {saving ? (
                  <p className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving your booking…
                  </p>
                ) : (
                  saveError && (
                    <>
                      <p className="rounded-[14px] bg-[#FDECEC] text-[#8A1C1C] text-sm px-4 py-3">
                        We could not confirm your booking yet ({payment.provider === "paypal" ? "PayPal order" : "order"}{" "}
                        {payment.orderId}). Trying again will not charge you twice. {saveError}
                      </p>
                      <button
                        type="button"
                        onClick={() => finish(payment)}
                        className="w-full rounded-full bg-ink text-white py-3 font-extrabold hover:bg-[#0A2A5C]"
                      >
                        Try saving again
                      </button>
                    </>
                  )
                )}
              </div>
            ) : agreed && publicConfig ? (
              <div className="space-y-2">
                {payError && (
                  <p role="alert" className="rounded-[14px] bg-[#FDECEC] text-[#8A1C1C] text-sm px-4 py-3">
                    {payError}
                  </p>
                )}
                <PaymentButtons
                  clientId={publicConfig.paypalClientId}
                  amount={deposit}
                  what="deposit"
                  createOrder={() => createDepositOrder(slug, selection)}
                  onApproved={finish}
                />
                {publicConfig.paypalClientId && (
                  <p className="text-xs text-muted text-center flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-success" />
                    Paid through PayPal. QuoteFlow never sees your card.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted rounded-[14px] bg-canvas px-4 py-3">
                Tick the box above to show the payment buttons.
              </p>
            )}
          </div>
        )}

        {step === "done" && booking && (
          <div className="space-y-5 pt-6">
            <div className="space-y-3">
              <span className="w-12 h-12 rounded-full bg-success-soft text-success grid place-items-center">
                <Check className="w-6 h-6" strokeWidth={3} />
              </span>
              <h1 className="text-[28px] leading-[1.1] font-black tracking-tight">You are booked</h1>
              <p className="text-muted text-[15px]">
                {config.businessName} has your booking for {dayLong}, arriving {ARRIVAL_WINDOWS[windowIndex]}.
              </p>
            </div>
            <div className="rounded-[18px] border border-line p-5 space-y-3.5">
              <div className="flex justify-between items-baseline text-[13px] text-muted">
                <span>Booking {booking.quoteId}</span>
                <span>Receipt</span>
              </div>
              <div className="space-y-2 text-sm">
                <Line label={booking.scopeSummary} amount={booking.totalPrice} />
              </div>
              <Split
                deposit={booking.deposit?.amount ?? deposit}
                balance={booking.balance?.amount ?? balance}
                paid
              />
              {booking.deposit && (
                <p className="text-xs text-muted tabular-nums break-all">
                  {booking.deposit.provider === "paypal" ? "PayPal order " : "Demo order "}
                  {booking.deposit.orderId}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={restart}
              className="rounded-full px-5 py-3 font-extrabold text-[15px] shadow-[inset_0_0_0_1.5px_#001435] hover:bg-canvas"
            >
              Book another visit
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar: running total and the one next action */}
      {(step === "quote" || step === "time" || step === "details") && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-line">
          <div className="max-w-[520px] mx-auto px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] flex items-center gap-3">
            <div className="flex-1 grid leading-tight">
              {step === "quote" ? (
                <>
                  <b className="text-lg font-black tabular-nums">{formatMoney(deposit)}</b>
                  <span className="text-xs text-muted">due today to book · total {formatMoney(quote.total)}</span>
                </>
              ) : (
                <>
                  <b className="text-lg font-black tabular-nums">{formatMoney(quote.total)}</b>
                  <span className="text-xs text-muted tabular-nums">
                    {dayLong} · deposit {formatMoney(deposit)}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              disabled={step === "details" && !detailsReady}
              onClick={() => goto(step === "quote" ? "time" : step === "time" ? "details" : "deposit")}
              className="rounded-full px-6 py-3 font-extrabold text-[15px] text-white bg-brand hover:bg-brand-dark disabled:bg-[#9AA6B6] disabled:cursor-not-allowed transition-colors"
            >
              {step === "quote" ? "Choose a time" : step === "time" ? "Continue" : "Go to deposit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AskBox({
  config,
  onApply,
}: {
  config: IndustryConfig;
  onApply: (s: { size: number; addOnIds: string[]; urgency: string; frequency: Frequency }) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const request = text.trim();
    if (request.length < 3) {
      setError("Write a few words about the job first.");
      return;
    }
    setLoading(true);
    setError("");
    setSummary("");
    const result = await requestAiQuote(config, request);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSummary(result.suggestion.summary);
    onApply(result.suggestion);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-[22px] border-[1.5px] border-ink p-4 space-y-3 focus-within:shadow-[0_0_0_3px_#E6F0FC]">
        <label htmlFor="qf-ask" className="sr-only">
          Describe the job
        </label>
        <textarea
          id="qf-ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={600}
          rows={3}
          placeholder={config.samplePrompts[0]?.label ?? "Describe the job"}
          className="w-full resize-none bg-transparent text-base leading-snug outline-none placeholder:text-[#8593A8]"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">AI reads this and fills in the quote.</span>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold text-white bg-brand hover:bg-brand-dark disabled:opacity-70"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Reading…" : "Build my quote"}
          </button>
        </div>
      </div>
      {config.samplePrompts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 [scrollbar-width:none]">
          {config.samplePrompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setText(p.label);
                setError("");
              }}
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold hover:border-[#B9C4D3]"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      {summary && (
        <div className="rounded-[18px] bg-canvas p-3.5 text-sm space-y-1" role="status">
          <b className="block">Here is what I understood</b>
          <p className="text-muted">{summary} Check the quote below and change anything that is off.</p>
        </div>
      )}
      {error && (
        <p className="text-[13px] text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function Line({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums font-semibold shrink-0">
        {amount < 0 ? "−" + formatMoney(-amount) : formatMoney(amount)}
      </span>
    </div>
  );
}

function Split({ deposit, balance, paid = false }: { deposit: number; balance: number; paid?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="rounded-[14px] bg-brand-soft p-3 grid gap-0.5">
        <small className="text-xs text-muted font-semibold">{paid ? "Paid today" : "Due today"}</small>
        <b className="text-[22px] font-black text-brand tabular-nums">{formatMoney(deposit)}</b>
      </div>
      <div className="rounded-[14px] bg-canvas p-3 grid gap-0.5">
        <small className="text-xs text-muted font-semibold">After the job</small>
        <b className="text-[22px] font-black tabular-nums">{formatMoney(balance)}</b>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[14px] border border-line px-4 py-3 text-base outline-none focus:border-brand focus:shadow-[inset_0_0_0_1px_#0070E0]"
      />
    </div>
  );
}
