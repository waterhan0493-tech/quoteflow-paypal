import { useEffect, useState } from "react";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { PaymentButtons } from "@/components/PaymentButtons";
import { ApiError } from "@/lib/api";
import { parseDateSlot } from "@/lib/business";
import { paymentNotice, usePublicConfig } from "@/lib/config";
import { formatMoney } from "@/lib/pricing";
import { createBalanceOrder, getPayView, payBalance, type ApprovedPayment, type PayView } from "@/lib/store";

function visitText(v: PayView): string {
  const d = parseDateSlot(v.dateSlot);
  const day = d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : v.dateSlot;
  return day + " · " + v.timeSlot;
}

function Row({ label, amount, strong = false }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={"flex justify-between gap-3 " + (strong ? "font-black text-base" : "")}>
      <span>{label}</span>
      <span className="tabular-nums">{formatMoney(amount)}</span>
    </div>
  );
}

/** Where a customer pays the balance after the visit, from the link the owner sent. */
export function PayPage({ id }: { id: string }) {
  const [view, setView] = useState<PayView | null | "loading">("loading");
  const [loadError, setLoadError] = useState("");
  const config = usePublicConfig();
  const [payment, setPayment] = useState<ApprovedPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [payError, setPayError] = useState("");

  useEffect(() => {
    getPayView(id).then(setView, (err: Error) => {
      setLoadError(err.message);
      setView(null);
    });
  }, [id]);

  useEffect(() => {
    if (view && view !== "loading") document.title = "Pay " + view.businessName;
  }, [view]);

  const finish = async (paid: ApprovedPayment) => {
    setPayment(paid);
    setSaving(true);
    setSaveError("");
    setPayError("");
    try {
      setView(await payBalance(id, paid));
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

  if (view === "loading") {
    return (
      <div className="min-h-screen bg-white grid place-items-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (!view) {
    return (
      <div className="min-h-screen bg-canvas grid place-items-center px-6 text-center text-ink">
        <div className="space-y-2 max-w-sm">
          <h1 className="text-2xl font-black">This payment link does not work</h1>
          <p className="text-muted">{loadError || "Check the link you were sent, or ask the business for a new one."}</p>
        </div>
      </div>
    );
  }

  const paid = view.status === "paid";
  const cancelled = view.status === "cancelled";
  const due = !paid && !cancelled;
  const firstName = view.customerName.split(" ")[0];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="max-w-[480px] mx-auto px-4 sm:px-5 py-8 sm:py-14 space-y-4">
        <p className="text-center font-black text-[17px]">{view.businessName}</p>

        <div className="bg-white border border-line rounded-[20px] overflow-hidden shadow-[0_22px_46px_-34px_rgba(0,20,53,0.45)]">
          {/* The one number this page is about */}
          <div className="px-6 pt-6 pb-5">
            {paid ? (
              <>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-success-soft text-success px-2.5 py-1 text-xs font-extrabold">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  Paid in full
                </p>
                <div className="mt-3 text-[48px] leading-none font-black tracking-[-0.03em] tabular-nums">
                  {formatMoney(view.totalPrice)}
                </div>
                <p className="mt-2 text-[15px] text-muted">Thank you, {firstName}. Nothing more is due.</p>
              </>
            ) : cancelled ? (
              <>
                <p className="inline-flex rounded-full bg-canvas text-muted px-2.5 py-1 text-xs font-extrabold">Cancelled</p>
                <h1 className="mt-3 text-[28px] leading-[1.1] font-black tracking-tight">This booking was cancelled</h1>
                <p className="mt-2 text-[15px] text-muted">Your deposit was refunded. Nothing is due.</p>
              </>
            ) : (
              <>
                <h1 className="text-[13px] font-bold text-muted">Balance due</h1>
                <div className="mt-1 text-[48px] leading-none font-black tracking-[-0.03em] tabular-nums">
                  {formatMoney(view.balanceAmount)}
                </div>
                <p className="mt-2 text-[15px] text-muted">Hi {firstName}, this is what is left for your visit.</p>
              </>
            )}
          </div>

          {/* Receipt */}
          <div className="border-t border-line px-6 py-5 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3 text-[13px] text-muted">
              <span>{visitText(view)}</span>
              <span className="tabular-nums shrink-0">{view.quoteId}</span>
            </div>
            <p className="text-muted">
              {view.industryLabel} · {view.scopeSummary}
            </p>
            <Row label="Total" amount={view.totalPrice} />
            <Row label={cancelled ? "Deposit refunded" : "Deposit paid"} amount={cancelled ? view.depositAmount : -view.depositAmount} />
            {!cancelled && (
              <div className="border-t border-line pt-2.5">
                <Row label={paid ? "Balance paid" : "Balance due"} amount={view.balanceAmount} strong />
              </div>
            )}
            {paid && view.balanceOrderId && (
              <p className="text-xs text-muted tabular-nums break-all">
                {view.balanceOrderId.startsWith("DEMO-") ? "Demo order " : "PayPal order "}
                {view.balanceOrderId}
              </p>
            )}
          </div>

          {/* Pay */}
          {due && config && (
            <div className="border-t border-line px-6 py-5 space-y-3">
              {paymentNotice(config) && (
                <div className="bg-[#FFF4CC] text-[#6B4E00] text-xs font-bold px-3 py-2 rounded-[10px] flex gap-2 items-center">
                  <Lock className="w-[15px] h-[15px]" />
                  {paymentNotice(config)}
                </div>
              )}
              {payment ? (
                <div role="status" className="space-y-3">
                  {saving ? (
                    <p className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirming your payment…
                    </p>
                  ) : (
                    saveError && (
                      <>
                        <p className="rounded-[14px] bg-[#FDECEC] text-[#8A1C1C] text-sm px-4 py-3">
                          We could not confirm the payment yet (order {payment.orderId}). Trying again will not charge you
                          twice. {saveError}
                        </p>
                        <button
                          type="button"
                          onClick={() => finish(payment)}
                          className="w-full rounded-full bg-ink text-white py-3 font-extrabold hover:bg-[#0A2A5C]"
                        >
                          Try again
                        </button>
                      </>
                    )
                  )}
                </div>
              ) : (
                <>
                  {payError && (
                    <p role="alert" className="rounded-[14px] bg-[#FDECEC] text-[#8A1C1C] text-sm px-4 py-3">
                      {payError}
                    </p>
                  )}
                  <PaymentButtons
                    clientId={config.paypalClientId}
                    amount={view.balanceAmount}
                    what="balance"
                    createOrder={() => createBalanceOrder(id)}
                    onApproved={finish}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {due && config?.paypalClientId && (
          <p className="text-xs text-muted text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            Paid through PayPal. QuoteFlow never sees your card.
          </p>
        )}
      </div>
    </div>
  );
}
