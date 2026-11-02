import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import type { IndustryConfig } from "@/data/industries";
import { PaymentButtons } from "@/components/PaymentButtons";
import { ApiError, api } from "@/lib/api";
import { usePublicConfig } from "@/lib/config";
import { formatMoney } from "@/lib/pricing";
import { createQuote, type ApprovedPayment, type QuoteRecord, type Selection } from "@/lib/store";

interface AgentQuote {
  scopeSummary: string;
  frequency: string;
  urgency: "standard" | "rush";
  date?: string;
  total: number;
  deposit: number;
  balance: number;
}

interface AgentBooking extends AgentQuote {
  date: string;
  selection: Selection;
  arrivalWindow: string;
  customerName: string;
  customerEmail: string;
  orderId: string | null;
}

interface AgentReply {
  reply: string;
  quote?: AgentQuote;
  booking?: AgentBooking;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function localToday(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const longDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function BookingAgent({ slug, config, onExit }: { slug: string; config: IndustryConfig; onExit: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<AgentQuote | null>(null);
  const [draft, setDraft] = useState<AgentBooking | null>(null);
  const [booked, setBooked] = useState<QuoteRecord | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const summary = draft ?? quote;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, thinking, draft, booked]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || thinking) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setText("");
    setThinking(true);
    setError("");
    try {
      const data = await api<AgentReply>("/businesses/" + encodeURIComponent(slug) + "/agent", {
        method: "POST",
        body: { messages: next, today: localToday() },
      });
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.quote) setQuote(data.quote);
      if (data.booking) setDraft(data.booking);
    } catch (err) {
      // Put the words back, so a failed send can be repeated without typing them again.
      setMessages(messages);
      setText(content);
      setError(err instanceof ApiError ? err.message : "Could not reach the assistant. Please try again.");
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="max-w-[560px] lg:max-w-[1000px] mx-auto px-5 lg:px-8 pb-28 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:items-start">
        <div className="min-w-0">
        <header className="sticky top-0 z-10 bg-white py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            className="w-10 h-10 rounded-full border border-line grid place-items-center hover:bg-canvas"
            aria-label="Back to the booking form"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <span className="font-extrabold text-[15px] truncate">{config.businessName}</span>
          <span className="w-10" />
        </header>

        <div className="space-y-3 pt-2" aria-live="polite">
          <Bubble role="assistant">
            Hi! Tell me about the job and I will get you a price. You can book and pay the deposit right here.
          </Bubble>
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role}>
              {m.content}
            </Bubble>
          ))}
          {thinking && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              Working on it…
            </p>
          )}
          {quote && !draft && !booked && (
            <div className="lg:hidden">
              <QuoteCard quote={quote} />
            </div>
          )}
          {draft && !booked && <ApprovalCard slug={slug} draft={draft} onBooked={setBooked} />}
          {booked && (
            <div className="rounded-[18px] border border-line p-5 space-y-2" role="status">
              <span className="w-10 h-10 rounded-full bg-success-soft text-success grid place-items-center">
                <Check className="w-5 h-5" strokeWidth={3} />
              </span>
              <h2 className="text-xl font-black">You are booked</h2>
              <p className="text-sm text-muted">
                {config.businessName} has your booking for {longDate(booked.dateSlot)}, arriving {booked.timeSlot}.
              </p>
              {booked.deposit && (
                <p className="text-xs text-muted tabular-nums break-all">
                  {booked.deposit.provider === "paypal" ? "PayPal order " : "Demo order "}
                  {booked.deposit.orderId}
                </p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-[13px] text-red-700">
              {error}
            </p>
          )}
          <div ref={end} className="scroll-mb-28" />
        </div>
        </div>

        <aside className="hidden lg:block sticky top-6 mt-4 rounded-[20px] border border-line bg-white p-5 space-y-3 shadow-[0_22px_46px_-34px_rgba(0,20,53,0.45)]">
          <h2 className="text-[15px] font-extrabold">Your booking</h2>
          {summary ? (
            <>
              {summary.date && <p className="text-sm font-semibold">{longDate(summary.date)}{draft ? " · " + draft.arrivalWindow : ""}</p>}
              <Amounts quote={summary} />
            </>
          ) : (
            <p className="text-sm text-muted">Your price appears here as soon as the assistant has it.</p>
          )}
        </aside>
      </div>

      {!booked && (
        <form onSubmit={send} className="fixed bottom-0 inset-x-0 bg-white border-t border-line">
          <div className="max-w-[560px] lg:max-w-[1000px] mx-auto px-5 lg:pl-8 lg:pr-[412px] pt-3 pb-[max(16px,env(safe-area-inset-bottom))] flex gap-2">
            <label htmlFor="qf-chat" className="sr-only">
              Message
            </label>
            <input
              id="qf-chat"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              autoComplete="off"
              placeholder="Describe the job"
              className="flex-1 min-w-0 rounded-full border border-line px-4 py-3 text-base outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={thinking || !text.trim()}
              className="rounded-full px-5 font-extrabold text-[15px] text-white bg-brand hover:bg-brand-dark disabled:bg-[#9AA6B6]"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Bubble({ role, children }: { role: Message["role"]; children: React.ReactNode }) {
  return (
    <p
      className={
        "max-w-[85%] w-fit rounded-[18px] px-4 py-2.5 text-[15px] leading-snug whitespace-pre-wrap " +
        (role === "user" ? "ml-auto bg-ink text-white" : "bg-canvas")
      }
    >
      {children}
    </p>
  );
}

function Amounts({ quote }: { quote: AgentQuote }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted">{quote.scopeSummary}</p>
      {quote.urgency === "rush" && <p className="text-muted">Next-day rush (+20%) included</p>}
      <div className="flex justify-between items-baseline border-t border-line pt-2">
        <span className="font-bold">Total</span>
        <span className="text-2xl font-black tabular-nums">{formatMoney(quote.total)}</span>
      </div>
      <div className="flex justify-between">
        <span>Due today</span>
        <b className="text-brand tabular-nums">{formatMoney(quote.deposit)}</b>
      </div>
      <div className="flex justify-between">
        <span>After the job</span>
        <span className="tabular-nums">{formatMoney(quote.balance)}</span>
      </div>
    </div>
  );
}

function QuoteCard({ quote }: { quote: AgentQuote }) {
  return (
    <div className="rounded-[18px] border border-line p-4">
      <Amounts quote={quote} />
    </div>
  );
}

function ApprovalCard({
  slug,
  draft,
  onBooked,
}: {
  slug: string;
  draft: AgentBooking;
  onBooked: (b: QuoteRecord) => void;
}) {
  const publicConfig = usePublicConfig();
  const [agreed, setAgreed] = useState(false);
  // Set once the buyer approved, so a failed save is retried with the same order and never paid twice.
  const [payment, setPayment] = useState<ApprovedPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [payError, setPayError] = useState("");

  const finish = async (paid: ApprovedPayment) => {
    setPayment(paid);
    setSaving(true);
    setSaveError("");
    setPayError("");
    try {
      onBooked(
        await createQuote(slug, {
          customerName: draft.customerName,
          customerEmail: draft.customerEmail,
          dateSlot: draft.date,
          timeSlot: draft.arrivalWindow,
          selection: draft.selection,
          deposit: paid,
        })
      );
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

  return (
    <div className="rounded-[18px] border-[1.5px] border-ink p-4 space-y-3">
      <h2 className="font-extrabold">Check and approve</h2>
      <p className="text-sm">
        {longDate(draft.date)} · {draft.arrivalWindow}
        <br />
        <span className="text-muted">
          {draft.customerName} · {draft.customerEmail}
        </span>
      </p>
      <Amounts quote={draft} />
      <label className="flex gap-2.5 items-start text-[13px]">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand"
        />
        I agree to this quote and to paying the rest after the job.
      </label>
      {payment ? (
        <div role="status" className="space-y-2">
          {saving && <p className="text-sm font-bold text-muted">Saving your booking…</p>}
          {saveError && (
            <>
              <p className="rounded-[14px] bg-[#FDECEC] text-[#8A1C1C] text-sm px-4 py-3">
                We could not confirm your booking yet. Trying again will not charge you twice. {saveError}
              </p>
              <button
                type="button"
                onClick={() => finish(payment)}
                className="w-full rounded-full bg-ink text-white py-3 font-extrabold"
              >
                Try saving again
              </button>
            </>
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
            amount={draft.deposit}
            what="deposit"
            createOrder={async () => draft.orderId ?? ""}
            onApproved={finish}
          />
        </div>
      ) : null}
    </div>
  );
}
