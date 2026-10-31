import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import type { IndustryConfig } from "@/data/industries";

export interface AiQuoteSuggestion {
  size: number;
  addOnIds: string[];
  urgency: "standard" | "rush";
  frequency: "once" | "monthly" | "weekly";
  summary: string;
}

interface AiQuoteAssistantProps {
  config: IndustryConfig;
  accentHex: string;
  darkMode: boolean;
  onApply: (suggestion: AiQuoteSuggestion) => void;
}

const EXAMPLES: Record<string, string> = {
  cleaning: "3-bed house, the oven is filthy and we have a dog. Can you come tomorrow?",
  lawn: "Half-acre backyard, hedges are overgrown, want it done every two weeks.",
  wedding: "120 guests, we'd love a second shooter and some drone shots.",
};

export function AiQuoteAssistant({ config, accentHex, darkMode, onApply }: AiQuoteAssistantProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const example = EXAMPLES[config.id] ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const request = text.trim() || example;
    if (request.length < 3) return;
    setLoading(true);
    setError("");
    setSummary("");
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
        setError(data?.message ?? "The AI assistant is unavailable. Please set the options by hand.");
        return;
      }
      if (!text.trim()) setText(request);
      setSummary(data.summary);
      onApply(data as AiQuoteSuggestion);
    } catch {
      setError("Could not reach the AI assistant. Please set the options by hand.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border p-4 space-y-3"
      style={{
        borderColor: accentHex + "40",
        background: darkMode
          ? "linear-gradient(135deg, #0B1B33 0%, #111827 100%)"
          : "linear-gradient(135deg, " + accentHex + "0D 0%, #FFFFFF 70%)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: accentHex }}
        >
          <Sparkles className="w-4 h-4" />
        </span>
        <div>
          <div className="text-sm font-black tracking-tight">Describe the job in your own words</div>
          <div className="text-[11px] text-slate-500">AI fills in the calculator below. You can still change anything.</div>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={600}
        rows={2}
        placeholder={example}
        className={
          "w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 " +
          (darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-[#E3E8EF]")
        }
        style={{ ["--tw-ring-color" as string]: accentHex + "55" }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">
          {text.trim() ? text.length + "/600" : "Empty? We'll try the example."}
        </span>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: accentHex }}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          <span>{loading ? "Reading your request…" : "Build my quote"}</span>
        </button>
      </div>

      {summary && (
        <p
          className="text-xs leading-snug rounded-xl px-3 py-2 border"
          style={{ backgroundColor: accentHex + "0F", borderColor: accentHex + "30" }}
        >
          <span className="font-bold" style={{ color: accentHex }}>
            AI:{" "}
          </span>
          {summary}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
