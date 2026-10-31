import { ScanLine } from "lucide-react";
import type { SamplePrompt } from "@/data/industries";

interface ScopeScannerProps {
  samplePrompts: SamplePrompt[];
  scanningPromptId: string | null;
  aiMatchedPromptId: string | null;
  activePrompt: SamplePrompt;
  visionModalOpen: boolean;
  accentHex: string;
  darkMode: boolean;
  isMobile: boolean;
  onToggleVision: () => void;
  onRunPrompt: (prompt: SamplePrompt) => void;
}

export function ScopeScanner({
  samplePrompts,
  scanningPromptId,
  aiMatchedPromptId,
  activePrompt,
  visionModalOpen,
  accentHex,
  darkMode,
  isMobile,
  onToggleVision,
  onRunPrompt,
}: ScopeScannerProps) {
  return (
    <div
      className={
        "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 " +
        (darkMode
          ? "bg-slate-900/80 border-slate-800"
          : "bg-[#FAF8F5] border-[#E5E0D8]")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ScanLine
            className="w-4 h-4 shrink-0"
            style={{ color: accentHex }}
          />
          <span className="text-xs font-bold">
            AI Computer-Vision Scope Scanner
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: accentHex + "14",
              borderColor: accentHex + "30",
              color: accentHex,
            }}
          >
            Photo + NLP Auto-Scope
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onRunPrompt(activePrompt)}
            style={{ backgroundColor: "#141413", color: "#FFFFFF" }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <ScanLine className="w-3.5 h-3.5" style={{ color: "#FBBF24" }} />
            Run AI Vision Demo
          </button>
          <button
          type="button"
          onClick={onToggleVision}
          className="text-[11px] font-semibold underline text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          {visionModalOpen ? "Hide camera" : "Show camera"}
        </button>
        </div>
      </div>

      {/* Real Property Photo Camera Viewfinder + Crisp Detection Breakdown Below */}
      {visionModalOpen && (
        <div className="space-y-2.5">
          <div className={"relative rounded-xl overflow-hidden border border-[#141413] bg-[#0F131A] select-none " + (isMobile ? "h-48" : "h-60")}>
            <img
              src={activePrompt.imageUrl}
              alt={activePrompt.photoLabel}
              className="w-full h-full object-cover brightness-95 transition-all duration-500"
            />
            {/* Subtle camera vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/55 pointer-events-none" />

            {/* Camera Viewfinder Corner Brackets */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/80 pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/80 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-white/80 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-white/80 pointer-events-none" />

            {/* Top Camera HUD Bar */}
            <div className="absolute top-2.5 left-4 right-4 flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] font-mono-num text-white pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/20 flex items-center gap-1.5 font-semibold">
                <span
                  className={
                    "w-2 h-2 rounded-full " +
                    (scanningPromptId ? "bg-amber-400 animate-ping" : "bg-emerald-400")
                  }
                />
                {scanningPromptId
                  ? "SCANNING PROPERTY PHOTO..."
                  : "DEMO SCENE: " + activePrompt.photoLabel}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-emerald-950/90 backdrop-blur-md border border-emerald-400/50 text-emerald-300 font-bold">
                DEMO DATA
              </span>
            </div>

            {/* Laser Sweep Bar during scan */}
            {scanningPromptId && (
              <div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_4px_rgba(251,191,36,0.85)] animate-laser-sweep pointer-events-none"
              />
            )}

            {/* Numbered Target Reticle Pins Dead-Center on the Exact Object Coordinates */}
            {!scanningPromptId &&
              activePrompt.detections.map((det, idx) => {
                const alignLeft = det.x >= 55;
                return (
                  <div
                    key={idx}
                    style={{
                      left: det.x + "%",
                      top: det.y + "%",
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute pointer-events-none z-10"
                  >
                    {/* Dead-Center Target Circle Reticle */}
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-9 h-9 rounded-full bg-emerald-400/30 animate-ping" />
                      <span className="relative w-7 h-7 rounded-full bg-emerald-500 text-black font-mono-num font-extrabold text-xs flex items-center justify-center shadow-lg ring-2 ring-white">
                        {idx + 1}
                      </span>
                    </div>
                    {/* Floating Label Pill Anchored Beside the Pin Without Shifting Pin Center */}
                    {!isMobile && (
                      <span
                        style={
                          alignLeft
                            ? { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" }
                            : { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" }
                        }
                        className="hidden sm:block absolute px-2.5 py-1 rounded-md bg-black/85 backdrop-blur-md border border-emerald-400/80 text-white text-[11px] font-semibold shadow-lg whitespace-nowrap"
                      >
                        {det.text}
                      </span>
                    )}
                  </div>
                );
              })}

            {/* Bottom Camera Caption */}
            <div className="absolute bottom-2.5 left-4 right-4 hidden sm:flex items-center justify-between text-[11px] text-white/90 font-medium pointer-events-none">
              <span>Detected 3 pricing scope factors from photo</span>
              <span className="font-mono-num text-emerald-300 font-semibold">Auto-applied ↓</span>
            </div>
          </div>

          {/* Clean 3-Row AI Vision Detection Breakdown (Never clips on Mobile or Desktop!) */}
          <div className="grid grid-cols-1 gap-1.5">
            {activePrompt.detections.map((det, idx) => (
              <div
                key={idx}
                className={
                  "px-3 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 " +
                  (darkMode
                    ? "bg-slate-900 border-slate-800 text-slate-200"
                    : "bg-white border-[#E5E0D8] text-[#141413]")
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono-num font-bold text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold leading-snug">
                    {det.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Demo
                  </span>
                  <span
                    className="font-mono-num font-bold text-xs"
                    style={{ color: accentHex }}
                  >
                    {det.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 3 Clickable Sample Photo Cards (Zero Truncation, Responsive to isMobile) */}
      <div className={"grid gap-2 " + (isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3")}>
        {samplePrompts.map((prompt) => {
          const isScanningThis = scanningPromptId === prompt.id;
          const isMatchedThis = aiMatchedPromptId === prompt.id;
          const isActiveCard = isScanningThis || isMatchedThis;
          return (
            <button
              key={prompt.id}
              type="button"
              onClick={() => onRunPrompt(prompt)}
              style={{
                backgroundColor: isActiveCard
                  ? "#141413"
                  : darkMode
                  ? "#1E222B"
                  : "#FFFFFF",
                borderColor: isScanningThis
                  ? "#F59E0B"
                  : isMatchedThis
                  ? "#141413"
                  : darkMode
                  ? "#334155"
                  : "#E5E0D8",
                color: isActiveCard
                  ? "#FFFFFF"
                  : darkMode
                  ? "#F5F3EF"
                  : "#141413",
              }}
              className={
                "text-left p-2.5 rounded-xl border text-xs transition-all shadow-sm hover:border-slate-400 flex " +
                (isMobile ? "flex-row items-center gap-3" : "flex-col justify-between gap-2")
              }
            >
              <div className={"relative rounded-lg overflow-hidden shrink-0 bg-slate-800 " + (isMobile ? "w-16 h-12" : "w-full h-16")}>
                <img
                  src={prompt.imageUrl}
                  alt={prompt.photoLabel}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-mono-num font-bold">
                  CAM
                </span>
                {isMatchedThis && !isScanningThis && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="font-bold text-[11px] leading-snug"
                  style={{
                    color: isActiveCard
                      ? "#FFFFFF"
                      : darkMode
                      ? "#F5F3EF"
                      : "#141413",
                  }}
                >
                  📸 {prompt.photoLabel}
                </div>
                <p
                  className="text-[11px] leading-snug mt-0.5"
                  style={{
                    color: isActiveCard
                      ? "#D1D5DB"
                      : darkMode
                      ? "#94A3B8"
                      : "#57534E",
                  }}
                >
                  “{prompt.label}”
                </p>
              </div>
            </button>
          );
        })}
      </div>


    </div>
  );
}
