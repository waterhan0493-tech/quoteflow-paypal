import { useState } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import {
  DEPOSIT_CURRENCY,
  DEPOSIT_RATE,
  depositFor,
  paypalClientId,
  type DepositPayment,
} from "@/lib/deposit";

interface DepositStepProps {
  total: number;
  businessName: string;
  /** Short line shown on the PayPal order, e.g. "Home Cleaning - 1,800 sq ft". */
  orderDescription: string;
  accentHex: string;
  darkMode: boolean;
  onPaid: (payment: DepositPayment) => void;
  onBack: () => void;
}

export function DepositStep({
  total,
  businessName,
  orderDescription,
  accentHex,
  darkMode,
  onPaid,
  onBack,
}: DepositStepProps) {
  const deposit = depositFor(total);
  const balance = Math.round((total - deposit) * 100) / 100;
  const clientId = paypalClientId();

  const panel = {
    backgroundColor: darkMode ? "#1E222B" : "#FAF8F5",
    borderColor: darkMode ? "#334155" : "#E5E0D8",
    color: darkMode ? "#F5F3EF" : "#141413",
  };

  return (
    <div className="space-y-4">
      <div style={panel} className="p-4 rounded-xl border space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Quoted total</span>
          <span className="font-mono-num font-semibold">${total.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold">
            Deposit due now ({Math.round(DEPOSIT_RATE * 100)}%)
          </span>
          <span
            className="text-xl font-mono-num font-extrabold"
            style={{ color: accentHex }}
          >
            ${deposit.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-slate-300 dark:border-slate-700 pt-2.5">
          <span className="text-slate-500">Balance due on service day</span>
          <span className="font-mono-num font-semibold">${balance.toFixed(2)}</span>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-snug">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600" />
        <span>
          Your deposit locks this price and time slot with {businessName}. It is
          deducted from the final bill.
        </span>
      </p>

      {clientId ? (
        <PayPalScriptProvider
          options={{
            clientId,
            currency: DEPOSIT_CURRENCY,
            intent: "capture",
            // Keep the buttons in English whatever the browser language (contest material must be English).
            locale: "en_US",
          }}
        >
          <PayPalDepositButtons
            amount={deposit}
            description={orderDescription}
            onPaid={onPaid}
          />
        </PayPalScriptProvider>
      ) : (
        <DemoDepositButton amount={deposit} accentHex={accentHex} onPaid={onPaid} />
      )}

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-black dark:hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Edit booking details</span>
      </button>
    </div>
  );
}

function PayPalDepositButtons({
  amount,
  description,
  onPaid,
}: {
  amount: number;
  description: string;
  onPaid: (payment: DepositPayment) => void;
}) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [error, setError] = useState("");

  if (isRejected) {
    return (
      <p className="text-xs text-red-600">
        PayPal could not load. Check the client ID and your network, then reload.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading PayPal…</span>
        </div>
      )}
      <PayPalButtons
        style={{ layout: "vertical", shape: "rect", label: "pay" }}
        forceReRender={[amount, description]}
        createOrder={(_data, actions) =>
          actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                description: description.slice(0, 127),
                amount: {
                  currency_code: DEPOSIT_CURRENCY,
                  value: amount.toFixed(2),
                },
              },
            ],
          })
        }
        onApprove={async (data, actions) => {
          if (!actions.order) return;
          const order = await actions.order.capture();
          const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
          setError("");
          onPaid({
            provider: "paypal",
            amount,
            currency: DEPOSIT_CURRENCY,
            orderId: order.id ?? data.orderID,
            captureId: capture?.id,
            payerEmail: order.payer?.email_address,
            paidAt: new Date().toISOString(),
          });
        }}
        onCancel={() => setError("Payment cancelled. Your quote is still saved here.")}
        onError={() => setError("PayPal returned an error. Please try again.")}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Stand-in when no PayPal client ID is configured, so the flow still works locally. */
function DemoDepositButton({
  amount,
  accentHex,
  onPaid,
}: {
  amount: number;
  accentHex: string;
  onPaid: (payment: DepositPayment) => void;
}) {
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() =>
          onPaid({
            provider: "demo",
            amount,
            currency: DEPOSIT_CURRENCY,
            orderId: "DEMO-" + Date.now().toString(36).toUpperCase(),
            paidAt: new Date().toISOString(),
          })
        }
        className="w-full py-3.5 px-5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md hover:opacity-95 flex items-center justify-center gap-2"
        style={{ backgroundColor: accentHex }}
      >
        <Lock className="w-4 h-4" />
        <span>Pay ${amount.toFixed(2)} deposit (demo)</span>
      </button>
      <p className="text-[11px] text-center text-slate-400">
        Demo mode: set VITE_PAYPAL_CLIENT_ID to use the PayPal sandbox.
      </p>
    </div>
  );
}
