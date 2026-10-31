// Request validation for the business and booking routes.
import { z } from "zod";

/** The one business this build serves until owner sign-in exists. Matches src/lib/business.ts. */
export const DEMO_SLUG = "sparkle-co";

export const Slug = z.string().regex(/^[a-z0-9-]{2,40}$/);

const Money = z.number().finite().min(0).max(100_000);
const PresetId = z.enum(["cleaning", "lawn", "wedding"]);

// Pricing fields are checked; display-only fields (sample prompts, colors) pass through.
export const BusinessConfig = z.looseObject({
  id: PresetId,
  label: z.string().max(60),
  businessName: z.string().max(80),
  baseFee: Money,
  multiplier: z.number().finite().min(0).max(1000),
  minSize: z.number().finite().min(0),
  maxSize: z.number().finite().positive(),
  stepSize: z.number().finite().positive(),
  defaultSize: z.number().finite().min(0),
  addOns: z
    .array(
      z.looseObject({
        id: z.string().min(1).max(40),
        name: z.string().max(60),
        price: Money,
        enabledInBuilder: z.boolean(),
      })
    )
    .max(30),
});

/** What the customer picked on the booking page. The server prices it; the browser's total is never trusted. */
export const Selection = z.object({
  size: z.number().finite(),
  addOnIds: z.array(z.string().max(40)).max(30),
  urgency: z.enum(["standard", "rush"]),
  frequency: z.enum(["once", "monthly", "weekly"]),
});

/** A PayPal order the customer approved, or a demo stand-in when the server has no PayPal keys. */
export const Payment = z.object({
  provider: z.enum(["paypal", "demo"]),
  orderId: z.string().min(3).max(64),
});

export const BookingInput = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerEmail: z.email().max(254),
  dateSlot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(1).max(40),
  signatureDataUrl: z.string().startsWith("data:image/").max(200_000).optional(),
  selection: Selection,
  deposit: Payment,
});

export const DepositOrderInput = z.object({ selection: Selection });

export const BookingId = z.uuid();

const NamedConfig = BusinessConfig.extend({ businessName: z.string().trim().min(2).max(80) });

export const SignUpInput = z.object({
  email: z.email().max(254).transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(72),
  config: NamedConfig,
});

export const NewBusinessInput = z.object({ config: NamedConfig });
