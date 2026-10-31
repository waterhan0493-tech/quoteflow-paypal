import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { Loader2, Lock } from "lucide-react";
import { formatMoney } from "@/lib/pricing";
import type { ApprovedPayment } from "@/lib/store";

interface Props {
  /** PayPal client ID from the server, or null for the demo button. */
  clientId: string | null;
  amount: number;
  /** "deposit" or "balance", for the demo button text. */
  what: string;
  /** Asks the QuoteFlow server to open a PayPal order for this payment; resolves to its ID. */
  createOrder: () => Promise<string>;
  /** The buyer approved. The server captures the payment when it saves it. */
  onApproved: (payment: ApprovedPayment) => void;
}

/** PayPal buttons for a server-created order, or a demo button when the server has no PayPal keys. */
export function PaymentButtons({ clientId, amount, what, createOrder, onApproved }: Props) {
  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => onApproved({ provider: "demo", orderId: "DEMO-" + Date.now().toString(36).toUpperCase() })}
        className="w-full py-3.5 px-5 rounded-full font-extrabold text-white bg-brand hover:bg-brand-dark flex items-center justify-center gap-2"
      >
        <Lock className="w-4 h-4" />
        Pay {formatMoney(amount)} {what} (demo)
      </button>
    );
  }
  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
        // Keep the buttons in English whatever the browser language (contest material must be English).
        locale: "en_US",
      }}
    >
      <PayPalPaymentButtons amount={amount} createOrder={createOrder} onApproved={onApproved} />
    </PayPalScriptProvider>
  );
}

function PayPalPaymentButtons({
  amount,
  createOrder,
  onApproved,
}: Pick<Props, "amount" | "createOrder" | "onApproved">) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [error, setError] = useState("");

  if (isRejected) {
    return <p className="text-sm text-[#B42318]">PayPal could not load. Check your connection, then reload the page.</p>;
  }

  return (
    <div className="space-y-2">
      {isPending && (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading PayPal…
        </p>
      )}
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill", label: "pay" }}
        forceReRender={[amount]}
        createOrder={async () => {
          setError("");
          try {
            return await createOrder();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start the payment.");
            throw err;
          }
        }}
        onApprove={async (data) => onApproved({ provider: "paypal", orderId: data.orderID })}
        onCancel={() => setError("Payment cancelled. Nothing was charged.")}
        onError={() => setError((e) => e || "PayPal returned an error. Nothing was charged. Please try again.")}
      />
      {error && (
        <p role="alert" className="text-sm text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
}
