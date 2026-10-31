import type { IndustryConfig } from "@/data/industries";
import type { Frequency, Urgency } from "@/lib/pricing";

export interface AiQuoteSuggestion {
  size: number;
  addOnIds: string[];
  urgency: Urgency;
  frequency: Frequency;
  summary: string;
}

export type AiQuoteResult =
  | { ok: true; suggestion: AiQuoteSuggestion }
  | { ok: false; message: string };

/** Sends the customer's own words to /api/ai-quote and returns calculator settings. */
export async function requestAiQuote(config: IndustryConfig, request: string): Promise<AiQuoteResult> {
  try {
    const res = await fetch("/api/ai-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request,
        industry: {
          label: config.label,
          sizeLabel: config.sizeLabel,
          unitLabel: config.unitLabel,
          minSize: config.minSize,
          maxSize: config.maxSize,
          stepSize: config.stepSize,
          defaultSize: config.defaultSize,
          addOns: config.addOns
            .filter((a) => a.enabledInBuilder)
            .map(({ id, name, description, price }) => ({ id, name, description, price })),
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return {
        ok: false,
        message: data?.message ?? "The AI assistant is unavailable. Please set the options by hand.",
      };
    }
    return { ok: true, suggestion: data as AiQuoteSuggestion };
  } catch {
    return { ok: false, message: "Could not reach the AI assistant. Please set the options by hand." };
  }
}
