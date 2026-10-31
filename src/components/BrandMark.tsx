import { Check } from "lucide-react";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={"inline-flex items-center gap-2 font-black text-[17px] tracking-tight text-ink " + className}>
      <span className="w-[22px] h-[22px] rounded-[7px] bg-brand grid place-items-center">
        <Check className="w-[13px] h-[13px] text-white" strokeWidth={3.5} />
      </span>
      QuoteFlow
    </span>
  );
}
