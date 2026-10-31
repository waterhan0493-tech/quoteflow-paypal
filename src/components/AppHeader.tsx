import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Check,
  Code2,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  MoreHorizontal,
  TrendingUp,
  Building2,
} from "lucide-react";
import type { IndustryConfig, PresetId } from "@/data/industries";
import { soundFX } from "@/lib/sound";

export type AppView = "owner" | "customer" | "leads";

interface AppHeaderProps {
  view: AppView;
  onViewChange: (v: AppView) => void;
  configs: Record<PresetId, IndustryConfig>;
  activePresetId: PresetId;
  onSelectPreset: (id: PresetId) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenEmbed: () => void;
  onOpenRoi: () => void;
  leadsCount: number;
  badgePulse?: boolean;
  stepCompletion: { owner: boolean; customer: boolean; leads: boolean };
}

const STEP_DEFS: { id: AppView; label: string; shortLabel: string }[] = [
  { id: "owner", label: "Set your prices", shortLabel: "Prices" },
  { id: "customer", label: "Book as a customer", shortLabel: "Book" },
  { id: "leads", label: "Leads inbox", shortLabel: "Leads" },
];

export function AppHeader({
  view,
  onViewChange,
  configs,
  activePresetId,
  onSelectPreset,
  darkMode,
  onToggleDarkMode,
  soundEnabled,
  onToggleSound,
  onOpenEmbed,
  onOpenRoi,
  leadsCount,
  badgePulse,
  stepCompletion,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  const handleStepClick = (id: AppView) => {
    soundFX.playTick(id === "owner" ? 560 : id === "customer" ? 620 : 680);
    onViewChange(id);
  };

  return (
    <header
      className={
        "sticky top-0 z-30 border-b backdrop-blur-md transition-colors " +
        (darkMode ? "bg-[#14171F]/90 border-slate-800" : "bg-white/90 border-[#E3E8EF]")
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors"
            style={{ backgroundColor: configs[activePresetId].accentHex }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            QuoteFlow
          </span>
        </div>

        {/* Center: 3-Step Segmented Navigator */}
        <div
          className={
            "flex items-center p-1 rounded-xl border " +
            (darkMode ? "bg-slate-900 border-slate-800" : "bg-[#EEF3F9] border-[#E3E8EF]")
          }
        >
          {STEP_DEFS.map((step, idx) => {
            const isActive = view === step.id;
            const isDone = stepCompletion[step.id];
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={
                  "flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all " +
                  (isActive
                    ? darkMode
                      ? "bg-slate-800 text-white shadow-sm"
                      : "bg-white text-[#001435] shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")
                }
              >
                <span
                  className={
                    "font-mono-num w-4 h-4 rounded-full flex items-center justify-center text-[10px] " +
                    (isDone
                      ? "text-white"
                      : isActive
                      ? darkMode
                        ? "bg-slate-700 text-white"
                        : "bg-slate-200 text-[#001435]"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300")
                  }
                  style={isDone ? { backgroundColor: "#10B981" } : undefined}
                >
                  {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : idx + 1}
                </span>
                <span className="hidden min-[900px]:inline whitespace-nowrap">{step.label}</span>
                <span className="min-[900px]:hidden max-[480px]:text-[10px] whitespace-nowrap">{step.shortLabel}</span>
                {step.id === "leads" && (
                  <span
                    className={
                      "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono-num text-white " +
                      (badgePulse ? "animate-badge-pulse" : "")
                    }
                    style={{ backgroundColor: configs[activePresetId].accentHex }}
                  >
                    {leadsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Industry Switch + Publish + Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Industry Switch (compact select) */}
          <div className="relative hidden sm:block">
            <Building2
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <select
              value={activePresetId}
              onChange={(e) => onSelectPreset(e.target.value as PresetId)}
              className={
                "pl-7 pr-7 py-2 rounded-xl border text-xs font-semibold appearance-none cursor-pointer transition-colors " +
                (darkMode
                  ? "bg-slate-900 border-slate-800 text-white"
                  : "bg-white border-[#E3E8EF] text-[#001435]")
              }
            >
              {(Object.values(configs) as IndustryConfig[]).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.id === "cleaning" && "🏠 "}
                  {preset.id === "lawn" && "🌿 "}
                  {preset.id === "wedding" && "📸 "}
                  {preset.label}
                </option>
              ))}
            </select>
            <svg
              className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Publish & Embed */}
          <button
            onClick={onOpenEmbed}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-all"
            style={{ backgroundColor: configs[activePresetId].accentHex }}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Publish & Embed</span>
          </button>

          {/* "..." Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More options"
              className={
                "p-2 rounded-xl border transition-colors " +
                (darkMode
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-white border-[#E3E8EF] text-slate-600 hover:bg-slate-50")
              }
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className={
                  "absolute right-0 mt-1.5 w-52 rounded-xl border shadow-lg py-1.5 z-50 " +
                  (darkMode
                    ? "bg-[#181B24] border-slate-800 text-white"
                    : "bg-white border-[#E3E8EF] text-[#001435]")
                }
              >
                <button
                  onClick={() => {
                    onToggleSound();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    Tactile Sound FX
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {soundEnabled ? "ON" : "OFF"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    onToggleDarkMode();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {darkMode ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  {darkMode ? "Light mode" : "Dark mode"}
                </button>
                <div
                  className={
                    "my-1 border-t " +
                    (darkMode ? "border-slate-800" : "border-[#E3E8EF]")
                  }
                />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenRoi();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: configs[activePresetId].accentHex }} />
                  ROI Calculator
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
