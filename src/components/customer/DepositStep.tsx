import { useState } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { Loader2, Lock } from "lucide-react";
import {
  DEPOSIT_CURRENCY,
  paypalClientId,
  type DepositPayment,
} from "@/lib/deposit";

/** PayPal buttons for the deposit, or a demo button when no client ID is configured. */
export function DepositButtons({
  amount,
  description,
  accentHex,
  onPaid,
}: {
  amount: number;
  description: string;
  accentHex: string;
  onPaid: (payment: DepositPayment) => void;
}) {
  const clientId = paypalClientId();
  if (!clientId) return <DemoDepositButton amount={amount} accentHex={accentHex} onPaid={onPaid} />;
  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: DEPOSIT_CURRENCY,
        intent: "capture",
        // Keep the buttons in English whatever the browser language (contest material must be English).
        locale: "en_US",
      }}
    >
      <PayPalDepositButtons amount={amount} description={description} onPaid={onPaid} />
    </PayPalScriptProvider>
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
        className="w-full py-3.5 px-5 rounded-full text-xs sm:text-sm font-bold text-white shadow-md hover:opacity-95 flex items-center justify-center gap-2"
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
