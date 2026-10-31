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

export const BookingInput = z.object({
  status: z.enum(["new", "sent", "booked"]).default("booked"),
  customerName: z.string().trim().min(2).max(80),
  customerEmail: z.email().max(254),
  industryId: PresetId,
  industryLabel: z.string().max(60),
  scopeSummary: z.string().max(300),
  totalPrice: Money,
  urgency: z.enum(["standard", "rush"]),
  frequencyLabel: z.string().max(60),
  dateSlot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(1).max(40),
  signatureDataUrl: z.string().startsWith("data:image/").max(200_000).optional(),
  deposit: z.object({
    provider: z.enum(["paypal", "demo"]),
    amount: z.number().finite().positive().max(100_000),
    currency: z.string().length(3),
    orderId: z.string().min(3).max(64),
    captureId: z.string().max(64).optional(),
    payerEmail: z.string().max(254).optional(),
    paidAt: z.iso.datetime(),
  }),
});

const NamedConfig = BusinessConfig.extend({ businessName: z.string().trim().min(2).max(80) });

export const SignUpInput = z.object({
  email: z.email().max(254).transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(72),
  config: NamedConfig,
});

export const NewBusinessInput = z.object({ config: NamedConfig });
