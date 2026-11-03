// PayPal Orders v2 and Payments v2 over REST. Sandbox unless PAYPAL_ENV=live.
// Off (demo payments) when PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing.

const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");
const clientId = clean(process.env.PAYPAL_CLIENT_ID);
const secret = clean(process.env.PAYPAL_CLIENT_SECRET);
export const paypalEnv = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
const base = paypalEnv === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export const paypalConfigured = Boolean(clientId && secret);
/** Public by design: the browser SDK needs it. */
export const paypalClientId = paypalConfigured ? clientId : "";

export class PayPalError extends Error {
  constructor(status, body) {
    const issue = body?.details?.[0]?.issue || body?.name || "PAYPAL_ERROR";
    super(issue);
    this.status = status;
    this.issue = issue;
    this.debugId = body?.debug_id;
  }
}

let token = { value: "", until: 0 };

async function accessToken() {
  if (token.value && token.until > Date.now()) return token.value;
  const res = await fetch(base + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(clientId + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new PayPalError(res.status, body);
  token = { value: body.access_token, until: Date.now() + (body.expires_in - 60) * 1000 };
  return token.value;
}

async function call(method, path, { body, requestId } = {}) {
  const headers = { Authorization: "Bearer " + (await accessToken()), "Content-Type": "application/json" };
  // Same request ID = PayPal returns the first result instead of acting twice.
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new PayPalError(res.status, data);
  return data;
}

const money = (amount) => ({ currency_code: "USD", value: amount.toFixed(2) });

/** Creates a pay-now order for one amount. customId ties it to the quote it was priced from. */
export function createOrder({ amount, description, customId, referenceId, brandName }) {
  return call("POST", "/v2/checkout/orders", {
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          custom_id: customId,
          description: description.slice(0, 127),
          amount: money(amount),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: brandName.slice(0, 127),
            shipping_preference: "NO_SHIPPING", // a service visit, nothing ships
            user_action: "PAY_NOW",
            locale: "en-US", // the SDK locale only covers the buttons, not the approval window
          },
        },
      },
    },
  });
}

export function getOrder(orderId) {
  return call("GET", "/v2/checkout/orders/" + encodeURIComponent(orderId));
}

/**
 * Captures an approved order and returns the captured payment, or the existing capture if this
 * order was captured before (a retried save). Throws PayPalError for a declined or unapproved order.
 * expectCustomId guards against paying for one quote and booking another.
 */
export async function captureApprovedOrder(orderId, expectCustomId) {
  let order = await getOrder(orderId);
  const unit = order.purchase_units?.[0];
  if (unit?.custom_id !== expectCustomId) throw new PayPalError(409, { name: "ORDER_MISMATCH" });
  if (order.status === "APPROVED") {
    order = await call("POST", "/v2/checkout/orders/" + encodeURIComponent(orderId) + "/capture", {
      requestId: "capture-" + orderId,
    });
  }
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (order.status !== "COMPLETED" || !capture || !["COMPLETED", "PENDING"].includes(capture.status)) {
    throw new PayPalError(402, { name: order.status === "COMPLETED" ? "CAPTURE_" + capture?.status : "ORDER_" + order.status });
  }
  return {
    orderId: order.id,
    captureId: capture.id,
    amount: Number(capture.amount.value),
    currency: capture.amount.currency_code,
    payerEmail: order.payer?.email_address,
  };
}

/** Full refund of a capture. Returns the refund ID. */
export async function refundCapture(captureId) {
  const refund = await call("POST", "/v2/payments/captures/" + encodeURIComponent(captureId) + "/refund", {
    body: {},
    requestId: "refund-" + captureId,
  });
  return { refundId: refund.id, status: refund.status };
}
