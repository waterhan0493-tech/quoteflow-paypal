import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Check,
  Building2,
  Sliders,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Mail,
  X,
  Copy,
  Flame,
  DollarSign,
  Percent,
  MessageSquare,
  Smartphone,
  Monitor,
  ScanLine,
  Users,
  BarChart3,
} from "lucide-react";
import { AppHeader, type AppView } from "@/components/AppHeader";
import {
  INITIAL_PRESETS,
  type PresetId,
  type SamplePrompt,
  type BlueprintZone,
  type IndustryConfig,
} from "@/data/industries";
import { soundFX } from "@/lib/sound";
import { SignaturePad } from "@/components/customer/SignaturePad";
import { ScopeScanner } from "@/components/customer/ScopeScanner";
import { ReceiptCard } from "@/components/customer/ReceiptCard";
import { DepositStep } from "@/components/customer/DepositStep";
import { AiQuoteAssistant, type AiQuoteSuggestion } from "@/components/customer/AiQuoteAssistant";
import type { DepositPayment } from "@/lib/deposit";
import {
  getBusiness,
  saveBusiness,
  listQuotes,
  createQuote,
  updateQuoteStatus,
  subscribeQuotes,
  type QuoteRecord,
  type BusinessRecord,
} from "@/lib/store";

type MainTabId = "builder" | "crm" | "roi";
type LeadStatus = "new" | "sent" | "booked";
type PreviewDevice = "desktop" | "mobile";
type LeadItem = QuoteRecord;

function useAnimatedNumber(target: number, duration = 260): number {
  const [displayValue, setDisplayValue] = useState(target);
  const rafRef = useRef<number | null>(null);
  const startValRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startValRef.current = displayValue;
    startTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (target - startValRef.current) * eased;
      setDisplayValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayValue;
}

const FREQUENCY_OPTIONS = [
  { id: "once", label: "One-time", discount: 0, badge: "Standard" },
  { id: "monthly", label: "Bi-Weekly", discount: 0.1, badge: "Save 10%" },
  { id: "weekly", label: "Weekly", discount: 0.2, badge: "Save 20%" },
] as const;

const URGENCY_OPTIONS = [
  { id: "standard", label: "Standard", multiplier: 1, badge: "No extra fee" },
  { id: "rush", label: "Next-Day Rush", multiplier: 1.2, badge: "+20% priority" },
] as const;

const TIME_SLOTS = [
  "09:00 AM – 11:00 AM",
  "11:30 AM – 01:30 PM",
  "02:00 PM – 04:00 PM",
  "04:30 PM – 06:30 PM",
];

const SEED_LEADS: QuoteRecord[] = [
  {
    id: "lead-1",
    quoteId: "QF-8941",
    customerName: "Sophia Martinez",
    customerEmail: "sophia.m@meridian.co",
    industryId: "cleaning",
    industryLabel: "Home Cleaning",
    scopeSummary: "2,200 sq ft • Interior Oven & Fridge, HEPA Pet Treatment",
    totalPrice: 459,
    urgency: "rush",
    frequencyLabel: "One-time",
    dateSlot: "2026-05-14",
    timeSlot: "09:00 AM – 11:00 AM",
    status: "booked",
    createdAt: "12 mins ago",
    isHotLead: true,
  },
  {
    id: "lead-2",
    quoteId: "QF-8938",
    customerName: "Marcus Vance",
    customerEmail: "mvance@oakridge.io",
    industryId: "lawn",
    industryLabel: "Lawn & Landscape",
    scopeSummary: "5,500 sq ft • Cedar Mulch Install, Seasonal Leaf Haul",
    totalPrice: 585,
    urgency: "rush",
    frequencyLabel: "One-time",
    dateSlot: "2026-05-16",
    timeSlot: "11:30 AM – 01:30 PM",
    status: "new",
    createdAt: "28 mins ago",
    isHotLead: true,
  },
  {
    id: "lead-3",
    quoteId: "QF-8924",
    customerName: "Elena & Liam Chen",
    customerEmail: "elena.chen@studio.design",
    industryId: "wedding",
    industryLabel: "Wedding Photo",
    scopeSummary: "120 guests • Second Photographer (8 hrs), 4K Drone Aerials",
    totalPrice: 4220,
    urgency: "standard",
    frequencyLabel: "One-time",
    dateSlot: "2026-06-20",
    timeSlot: "02:00 PM – 04:00 PM",
    status: "sent",
    createdAt: "1 hour ago",
    isHotLead: true,
  },
  {
    id: "lead-4",
    quoteId: "QF-8919",
    customerName: "David Kim",
    customerEmail: "dkim@crestview.org",
    industryId: "cleaning",
    industryLabel: "Home Cleaning",
    scopeSummary: "1,800 sq ft • Deep Baseboard & Grout Scrub",
    totalPrice: 301,
    urgency: "standard",
    frequencyLabel: "Weekly (Save 20%)",
    dateSlot: "2026-05-18",
    timeSlot: "09:00 AM – 11:00 AM",
    status: "new",
    createdAt: "3 hours ago",
  },
  {
    id: "lead-5",
    quoteId: "QF-8910",
    customerName: "Hannah Sterling",
    customerEmail: "hannah@sterlingproperties.com",
    industryId: "lawn",
    industryLabel: "Lawn & Landscape",
    scopeSummary: "4,500 sq ft • 40ft Boxwood Hedge Sculpting",
    totalPrice: 345,
    urgency: "standard",
    frequencyLabel: "Bi-Weekly (Save 10%)",
    dateSlot: "2026-05-19",
    timeSlot: "02:00 PM – 04:00 PM",
    status: "booked",
    createdAt: "Yesterday",
  },
];

const BUSINESS_SLUG = "sparkle-co";

function buildBusinessRecord(
  presetId: PresetId,
  config: IndustryConfig
): BusinessRecord {
  return {
    slug: BUSINESS_SLUG,
    name: config.businessName,
    industry: presetId,
    config,
  };
}
export function App() {
  const [view, setView] = useState<AppView>("owner");
  const [activeTab, setActiveTab] = useState<MainTabId>("builder");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [roiOpen, setRoiOpen] = useState<boolean>(false);
  const [ownerStepDone, setOwnerStepDone] = useState<boolean>(false);
  const [customerStepDone, setCustomerStepDone] = useState<boolean>(false);
  const [leadsStepDone, setLeadsStepDone] = useState<boolean>(false);
  const [hasNewLead, setHasNewLead] = useState<boolean>(false);
  const [toastLead, setToastLead] = useState<LeadItem | null>(null);
  const [prevLeadsCount, setPrevLeadsCount] = useState<number>(SEED_LEADS.length);
  const [badgePulse, setBadgePulse] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  // Sync view to URL query (?view=customer) and restore on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "owner" || v === "customer" || v === "leads") {
      setView(v);
      if (v === "leads") setActiveTab("crm");
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === "owner") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", view);
    }
    window.history.replaceState({}, "", url.toString());
  }, [view]);

  useEffect(() => {
    if (view === "leads" && hasNewLead) {
      setLeadsStepDone(true);
      setHasNewLead(false);
    }
  }, [view, hasNewLead]);

  const [activePresetId, setActivePresetId] = useState<PresetId>("cleaning");
  const [configs, setConfigs] = useState<Record<PresetId, IndustryConfig>>(INITIAL_PRESETS);

  const [customerSize, setCustomerSize] = useState<number>(INITIAL_PRESETS.cleaning.defaultSize);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(["oven-fridge"]);
  const [frequency, setFrequency] = useState<"once" | "monthly" | "weekly">("once");
  const [urgency, setUrgency] = useState<"standard" | "rush">("standard");
  const [pricePulse, setPricePulse] = useState<boolean>(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [flashTs, setFlashTs] = useState<number>(0);
  const prefersReducedMotion = useRef<boolean>(false);

  const [scanningPromptId, setScanningPromptId] = useState<string | null>(null);
  const [aiMatchedPromptId, setAiMatchedPromptId] = useState<string | null>("clean-1");
  const [visionModalOpen, setVisionModalOpen] = useState<boolean>(true);

  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<"form" | "deposit" | "receipt">("form");
  const [customerName, setCustomerName] = useState<string>("Alex Rivera");
  const [customerEmail, setCustomerEmail] = useState<string>("alex.rivera@example.com");
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  });
  const todayISO = (() => {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  })();
  const [bookingTime, setBookingTime] = useState<string>(TIME_SLOTS[0]);
  const [signatureUrl, setSignatureUrl] = useState<string>("");

  const [crmLeads, setCrmLeads] = useState<LeadItem[]>(SEED_LEADS);
  const [activeReceipt, setActiveReceipt] = useState<LeadItem | null>(null);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Hydrate business config + quotes from the store on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedBusiness = await getBusiness(BUSINESS_SLUG);
      if (!cancelled && savedBusiness && savedBusiness.config) {
        // The owner cannot edit the accent color, so always take it from the preset.
        // This also moves older saved configs onto the current palette.
        const preset = INITIAL_PRESETS[savedBusiness.industry];
        const config = preset
          ? { ...savedBusiness.config, accentHex: preset.accentHex }
          : savedBusiness.config;
        setConfigs((prev) => ({ ...prev, [savedBusiness.industry]: config }));
        if (savedBusiness.industry) setActivePresetId(savedBusiness.industry);
      } else {
        // Seed default business on first run.
        await saveBusiness(
          buildBusinessRecord("cleaning", INITIAL_PRESETS.cleaning)
        );
      }
      const savedQuotes = await listQuotes(BUSINESS_SLUG);
      if (!cancelled) {
        if (savedQuotes.length > 0) {
          setCrmLeads(savedQuotes);
          setPrevLeadsCount(savedQuotes.length);
        } else {
          // Seed demo leads so the CRM board isn't empty on first visit.
          for (const lead of SEED_LEADS) {
            await createQuote(BUSINESS_SLUG, lead);
          }
          setCrmLeads(SEED_LEADS);
        }
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cross-tab: a booking made in another browser tab appears instantly.
  useEffect(() => {
    const unsub = subscribeQuotes(BUSINESS_SLUG, (next) => {
      setCrmLeads(next);
    });
    return unsub;
  }, []);

  // Persist owner pricing config changes to the business record.
  useEffect(() => {
    if (!hydrated) return;
    saveBusiness(buildBusinessRecord(activePresetId, configs[activePresetId]));
  }, [hydrated, activePresetId, configs]);

  useEffect(() => {
    if (!hydrated) return;
    if (crmLeads.length > prevLeadsCount) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 1600);
      setPrevLeadsCount(crmLeads.length);
      return () => clearTimeout(t);
    }
    setPrevLeadsCount(crmLeads.length);
  }, [crmLeads.length, prevLeadsCount, hydrated]);

  useEffect(() => {
    if (!toastLead) return;
    const t = setTimeout(() => setToastLead(null), 6000);
    return () => clearTimeout(t);
  }, [toastLead]);

  useEffect(() => {
    if (view !== "leads") return;
    const newOnes = crmLeads.filter((l) => l.isNew);
    if (newOnes.length === 0) return;
    const t = setTimeout(() => {
      setCrmLeads((prev) =>
        prev.map((l) => (l.isNew ? { ...l, isNew: false } : l))
      );
    }, 3000);
    return () => clearTimeout(t);
  }, [view, crmLeads]);

  const [isEmbedOpen, setIsEmbedOpen] = useState<boolean>(false);
  const [embedCopied, setEmbedCopied] = useState<boolean>(false);

  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(1200);
  const [avgTicketSize, setAvgTicketSize] = useState<number>(345);

  const isMobile = previewDevice === "mobile";
  const currentConfig = configs[activePresetId];
  const activePromptObj =
    currentConfig.samplePrompts.find((p) => p.id === (scanningPromptId || aiMatchedPromptId)) ||
    currentConfig.samplePrompts[0];

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFX.enabled = next;
    setSoundEnabled(next);
    if (next) soundFX.playToggle(true);
  };

  const handleSelectPreset = (id: PresetId) => {
    soundFX.playToggle(true);
    setActivePresetId(id);
    const nextPreset = configs[id];
    setCustomerSize(nextPreset.defaultSize);
    const firstEnabled = nextPreset.addOns.find((a) => a.enabledInBuilder);
    setSelectedAddOns(firstEnabled ? [firstEnabled.id] : []);
    setFrequency("once");
    setUrgency("standard");
    setAiMatchedPromptId(nextPreset.samplePrompts[0]?.id || null);
    setScanningPromptId(null);
    setIsBookingOpen(false);
  };

  useEffect(() => {
    setPricePulse(true);
    const timer = setTimeout(() => setPricePulse(false), 260);
    return () => clearTimeout(timer);
  }, [
    customerSize,
    selectedAddOns,
    frequency,
    urgency,
    currentConfig.baseFee,
    currentConfig.multiplier,
    activePresetId,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      prefersReducedMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (!flashKey) return;
    const t = setTimeout(() => setFlashKey(null), 1200);
    return () => clearTimeout(t);
  }, [flashKey, flashTs]);

  const flashLineClass = (key: string): string => {
    const active = flashKey === key;
    const bg = active ? "bg-amber-100 dark:bg-amber-500/15" : "";
    const transition = prefersReducedMotion.current ? "" : "transition-colors duration-700";
    return ["-mx-2 px-2 rounded", bg, transition].join(" ");
  };
  const isFlashed = (key: string): boolean => flashKey === key;

  const updateConfigField = <K extends keyof IndustryConfig>(
    field: K,
    value: IndustryConfig[K]
  ) => {
    setConfigs((prev) => ({
      ...prev,
      [activePresetId]: {
        ...prev[activePresetId],
        [field]: value,
      },
    }));
    setOwnerStepDone(true);
    if (field === "baseFee") {
      setFlashKey("baseFee");
      setFlashTs(Date.now());
    } else if (field === "multiplier") {
      setFlashKey("sizeCharge");
      setFlashTs(Date.now());
    }
  };

  const toggleBuilderAddOn = (addOnId: string) => {
    soundFX.playToggle(true);
    setConfigs((prev) => {
      const updatedAddOns = prev[activePresetId].addOns.map((item) =>
        item.id === addOnId
          ? { ...item, enabledInBuilder: !item.enabledInBuilder }
          : item
      );
      return {
        ...prev,
        [activePresetId]: {
          ...prev[activePresetId],
          addOns: updatedAddOns,
        },
      };
    });

    setSelectedAddOns((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : prev
    );
    setFlashKey(addOnId);
    setFlashTs(Date.now());
  };

  const toggleCustomerAddOn = (addOnId: string) => {
    const willSelect = !selectedAddOns.includes(addOnId);
    soundFX.playToggle(willSelect);
    setSelectedAddOns((prev) =>
      prev.includes(addOnId)
        ? prev.filter((id) => id !== addOnId)
        : [...prev, addOnId]
    );
  };

  const handleZoneClick = (zone: BlueprintZone) => {
    soundFX.playToggle(true);
    if (customerSize < zone.minSize) {
      setCustomerSize(zone.sizeBoost);
    }
    if (zone.linkedAddOnId) {
      toggleCustomerAddOn(zone.linkedAddOnId);
    }
  };

  const handleRunAiPrompt = (prompt: SamplePrompt) => {
    if (scanningPromptId) return;
    soundFX.playScanChime();
    setIsBookingOpen(false);
    setVisionModalOpen(true);
    setScanningPromptId(prompt.id);
    setAiMatchedPromptId(null);

    setTimeout(() => {
      setConfigs((prev) => {
        const updatedAddOns = prev[activePresetId].addOns.map((item) =>
          prompt.addOnIds.includes(item.id)
            ? { ...item, enabledInBuilder: true }
            : item
        );
        return {
          ...prev,
          [activePresetId]: {
            ...prev[activePresetId],
            addOns: updatedAddOns,
          },
        };
      });

      setCustomerSize(prompt.size);
      setUrgency(prompt.urgency);
      setFrequency(prompt.frequency);
      setSelectedAddOns(prompt.addOnIds);
      setScanningPromptId(null);
      setAiMatchedPromptId(prompt.id);
      soundFX.playToggle(true);
    }, 1350);
  };

  // AI quote assistant: apply Claude's suggested settings to the calculator.
  const handleApplyAiSuggestion = (s: AiQuoteSuggestion) => {
    setCustomerSize(s.size);
    setSelectedAddOns(s.addOnIds);
    setUrgency(s.urgency);
    setFrequency(s.frequency);
    setAiMatchedPromptId(null);
    soundFX.playToggle(true);
  };

  const visibleAddOns = currentConfig.addOns.filter((a) => a.enabledInBuilder);
  const activeCustomerAddOns = visibleAddOns.filter((a) =>
    selectedAddOns.includes(a.id)
  );

  const sizeCharge = Math.round(customerSize * currentConfig.multiplier);
  const addOnsTotal = activeCustomerAddOns.reduce((sum, a) => sum + a.price, 0);
  const rawSubtotal = currentConfig.baseFee + sizeCharge + addOnsTotal;

  const urgencyObj =
    URGENCY_OPTIONS.find((u) => u.id === urgency) || URGENCY_OPTIONS[0];
  const rushFee =
    urgency === "rush" ? Math.round(rawSubtotal * (urgencyObj.multiplier - 1)) : 0;
  const subtotalWithUrgency = rawSubtotal + rushFee;

  const freqObj =
    FREQUENCY_OPTIONS.find((f) => f.id === frequency) || FREQUENCY_OPTIONS[0];
  const discountAmount = Math.round(subtotalWithUrgency * freqObj.discount);
  const finalTotal = subtotalWithUrgency - discountAmount;

  const animatedTotal = useAnimatedNumber(finalTotal, 280);

  const sizeRatio =
    (customerSize - currentConfig.minSize) /
    (currentConfig.maxSize - currentConfig.minSize);
  const estPros = sizeRatio > 0.55 || urgency === "rush" ? 3 : 2;
  const estHours = (1.5 + sizeRatio * 3.2 + activeCustomerAddOns.length * 0.6).toFixed(1);

  const handleOpenBooking = () => {
    soundFX.playToggle(true);
    setBookingStep("form");
    setIsBookingOpen(true);
  };

  // Step 2 -> 3: details and signature are in; ask for the PayPal deposit.
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playToggle(true);
    setBookingStep("deposit");
  };

  // Step 3 -> receipt: the deposit is captured, so the booking is saved.
  const finalizeBooking = (deposit: DepositPayment) => {
    soundFX.playStampSuccess();
    const scopeAddOns =
      activeCustomerAddOns.length > 0
        ? activeCustomerAddOns.map((a) => a.name).join(", ")
        : "Base package";

    const quoteInput = {
      customerName: customerName.trim() || "Valued Customer",
      customerEmail: customerEmail.trim() || "customer@example.com",
      industryId: activePresetId,
      industryLabel: currentConfig.label,
      scopeSummary: customerSize.toLocaleString() + " " + currentConfig.unitLabel + " • " + scopeAddOns,
      totalPrice: finalTotal,
      urgency,
      frequencyLabel:
        freqObj.discount > 0 ? freqObj.label + " (" + freqObj.badge + ")" : freqObj.label,
      dateSlot: bookingDate,
      timeSlot: bookingTime,
      status: "booked" as const,
      createdAt: "Just now",
      isHotLead: finalTotal >= 300 || urgency === "rush",
      signatureDataUrl: signatureUrl,
      deposit,
    };

    // Persist via the store (assigns the QF-XXXX id) then update UI.
    createQuote(BUSINESS_SLUG, quoteInput).then((saved) => {
      const leadWithFlag: LeadItem = { ...saved, isNew: true };
      setCrmLeads((prev) => [leadWithFlag, ...prev]);
      setActiveReceipt(saved);
      setToastLead(saved);
    });
    setBookingStep("receipt");
    setCustomerStepDone(true);
    setHasNewLead(true);
  };

  const moveLeadStatus = (leadId: string, nextStatus: LeadStatus) => {
    soundFX.playToggle(true);
    setCrmLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l))
    );
    updateQuoteStatus(leadId, nextStatus);
  };

  const handleCopyFollowUp = (lead: LeadItem) => {
    soundFX.playToggle(true);
    const text = "Hi " + lead.customerName.split(" ")[0] + ", your instant quote (" + lead.quoteId + ") from " + currentConfig.businessName + " for $" + lead.totalPrice.toLocaleString() + " is locked and ready! Scope: " + lead.scopeSummary + ". Booked slot: " + lead.dateSlot + " (" + lead.timeSlot + "). Reply YES to confirm dispatch!";
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedLeadId(lead.id);
    setTimeout(() => setCopiedLeadId(null), 2000);
  };

  const embedSnippet = '<iframe src="' + window.location.origin + '/?view=customer" title="' + currentConfig.businessName + ' instant quote" style="width:100%;height:900px;border:0"></iframe>';

  const handleCopyEmbed = () => {
    soundFX.playToggle(true);
    navigator.clipboard?.writeText(embedSnippet).catch(() => {});
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const oldConversionRate = 0.021;
  const quoteFlowConversionRate = 0.068;
  const oldMonthlyLeads = Math.round(monthlyVisitors * oldConversionRate);
  const newMonthlyBookings = Math.round(monthlyVisitors * quoteFlowConversionRate);
  const oldMonthlyRevenue = oldMonthlyLeads * avgTicketSize;
  const newMonthlyRevenue = newMonthlyBookings * avgTicketSize;
  const monthlyRevenueLift = newMonthlyRevenue - oldMonthlyRevenue;
  const hoursSavedPerMonth = Math.round((newMonthlyBookings * 22) / 60);
  return (
    <div
      className={
        "min-h-screen transition-colors duration-200 flex flex-col " +
        (darkMode ? "dark bg-[#0F1115] text-[#EEF2F7]" : "bg-[#F5F7FA] text-[#001435]")
      }
    >
      {/* Top Navigation Bar */}
      <AppHeader
        view={view}
        onViewChange={(v) => {
          setView(v);
          if (v === "leads") setActiveTab("crm");
          else setActiveTab("builder");
        }}
        configs={configs}
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        darkMode={darkMode}
        onToggleDarkMode={() => {
          soundFX.playToggle(!darkMode);
          setDarkMode(!darkMode);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenEmbed={() => {
          soundFX.playToggle(true);
          setIsEmbedOpen(true);
        }}
        onOpenRoi={() => setRoiOpen(true)}
        leadsCount={crmLeads.length}
        badgePulse={badgePulse}
        stepCompletion={{
          owner: ownerStepDone,
          customer: customerStepDone,
          leads: leadsStepDone,
        }}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {view === "customer" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-2.5">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              This is exactly what your customers see at your booking link.
            </span>
            <button
              type="button"
              onClick={() => setView("owner")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to pricing</span>
            </button>
          </div>
        )}
        {(view === "owner" || view === "customer") && activeTab === "builder" && (
          <div className="space-y-6">
            {/* Compact Owner Instruction Line */}
            {view === "owner" && (
            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Left: what you control. Right: exactly what your customer sees,{" "}
                <span
                  className="font-black"
                  style={{ color: currentConfig.accentHex }}
                >
                  live
                </span>
                .
              </p>
              
            </div>
            )}

            {/* Split-Screen Grid */}
            <div className={"grid grid-cols-1 lg:grid-cols-12 gap-6 items-start " + (view === "customer" ? "max-w-[880px] mx-auto" : "")}>
              {/* LEFT SIDE: Builder Controls (5 cols) */}
              {view === "owner" && (
              <div className="lg:col-span-5 lg:sticky lg:top-20 self-start space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    OWNER CONTROLS
                  </span>
                </div>
              <section
                className={
                  "rounded-2xl border p-6 shadow-sm space-y-5 " +
                  (darkMode ? "bg-[#181B24] border-slate-800" : "bg-white border-[#E3E8EF]")
                }
              >
                <div className="space-y-2.5 border-b pb-4 border-[#E3E8EF] dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: currentConfig.accentHex }}
                      >
                        Merchant Configuration
                      </span>
                      <h2 className="text-lg font-black tracking-tight mt-0.5">
                        Builder Controls
                      </h2>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border"
                      style={{
                        backgroundColor: currentConfig.accentHex + "14",
                        borderColor: currentConfig.accentHex + "30",
                        color: currentConfig.accentHex,
                      }}
                    >
                      {currentConfig.label}
                    </span>
                  </div>

                  {/* 2026 US Market Pricing Benchmark Badge */}
                  <div
                    className={
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium " +
                      (darkMode
                        ? "bg-slate-900/90 border-slate-800 text-slate-300"
                        : "bg-[#F7F9FC] border-[#E3E8EF] text-slate-600")
                    }
                  >
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" style={{ color: currentConfig.accentHex }} />
                    <span>
                      <strong>Calibrated to 2026 US Market Averages:</strong> {currentConfig.benchmarkSource}
                    </span>
                  </div>
                </div>

                {/* 1. Business Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="business-name-input"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-300"
                  >
                    Business Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="business-name-input"
                      type="text"
                      value={currentConfig.businessName}
                      onChange={(e) => updateConfigField("businessName", e.target.value)}
                      className={
                        "w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all " +
                        (darkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-[#F7F9FC] border-[#E3E8EF] text-[#001435]")
                      }
                      placeholder="Enter your business name"
                    />
                  </div>
                </div>

                {/* 2. Base Fee ($) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="base-fee-input"
                      className="text-xs font-semibold text-slate-800 dark:text-slate-300"
                    >
                      Base Dispatch & Setup Fee ($)
                    </label>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Minimum call-out charge
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono-num font-semibold text-slate-400">
                        $
                      </span>
                      <input
                        id="base-fee-input"
                        type="number"
                        min={0}
                        step={5}
                        value={currentConfig.baseFee}
                        onChange={(e) => {
                          soundFX.playTick(520);
                          updateConfigField("baseFee", Math.max(0, Number(e.target.value)));
                        }}
                        className={
                          "w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-mono-num font-semibold focus:outline-none focus:ring-2 transition-all " +
                          (darkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-[#F7F9FC] border-[#E3E8EF] text-[#001435]")
                        }
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Decrease base fee"
                      onClick={() => {
                        soundFX.playTick(440);
                        updateConfigField("baseFee", Math.max(0, currentConfig.baseFee - 10));
                      }}
                      className={
                        "px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors " +
                        (darkMode
                          ? "bg-slate-900 border-slate-700 hover:bg-slate-800"
                          : "bg-[#F7F9FC] border-[#E3E8EF] hover:bg-slate-100")
                      }
                    >
                      −
                    </button>
                    <button
                      type="button"
                      aria-label="Increase base fee"
                      onClick={() => {
                        soundFX.playTick(640);
                        updateConfigField("baseFee", currentConfig.baseFee + 10);
                      }}
                      className={
                        "px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors " +
                        (darkMode
                          ? "bg-slate-900 border-slate-700 hover:bg-slate-800"
                          : "bg-[#F7F9FC] border-[#E3E8EF] hover:bg-slate-100")
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Rate Multiplier Slider */}
                <div
                  className={
                    "p-4 rounded-xl border space-y-3 " +
                    (darkMode
                      ? "bg-slate-900/60 border-slate-800"
                      : "bg-[#F7F9FC] border-[#E3E8EF]")
                  }
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="rate-slider"
                      className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      <span>Rate per {currentConfig.unitSingular}</span>
                    </label>
                    <span
                      className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-lg border shadow-sm"
                      style={{
                        backgroundColor: currentConfig.accentHex + "14",
                        borderColor: currentConfig.accentHex + "35",
                        color: currentConfig.accentHex,
                      }}
                    >
                      ${currentConfig.multiplier.toFixed(currentConfig.stepMultiplier < 0.01 ? 3 : currentConfig.stepMultiplier < 1 ? 2 : 0)} / {currentConfig.unitSingular}
                    </span>
                  </div>
                  <input
                    id="rate-slider"
                    type="range"
                    min={currentConfig.minMultiplier}
                    max={currentConfig.maxMultiplier}
                    step={currentConfig.stepMultiplier}
                    value={currentConfig.multiplier}
                    onChange={(e) => {
                      soundFX.playTick(700);
                      updateConfigField("multiplier", parseFloat(e.target.value));
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span>US Low (${currentConfig.minMultiplier})</span>
                    <span>Multiplied by {currentConfig.sizeLabel.toLowerCase()}</span>
                    <span>US High (${currentConfig.maxMultiplier})</span>
                  </div>
                </div>

                {/* 4. Toggleable Add-on Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                      Optional Add-ons ({visibleAddOns.length} of {currentConfig.addOns.length} active)
                    </label>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Click to show/hide in quote
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentConfig.addOns.map((addon) => {
                      const active = addon.enabledInBuilder;
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => toggleBuilderAddOn(addon.id)}
                          className={
                            "w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 " +
                            (active
                              ? darkMode
                                ? "bg-slate-900 border-slate-700 shadow-sm"
                                : "bg-white border-[#CBD5E1] shadow-sm"
                              : darkMode
                              ? "bg-slate-900/30 border-slate-800/60 opacity-50"
                              : "bg-slate-50/60 border-slate-200/70 opacity-55")
                          }
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={
                                "w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors " +
                                (active
                                  ? "text-white"
                                  : "border border-slate-300 dark:border-slate-600 bg-transparent")
                              }
                              style={{
                                backgroundColor: active ? currentConfig.accentHex : undefined,
                              }}
                            >
                              {active && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold leading-snug">
                                {addon.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                                {addon.description}
                              </div>
                            </div>
                          </div>
                          <div
                            className="text-xs font-mono-num font-bold shrink-0 px-2.5 py-1 rounded-lg border"
                            style={{
                              backgroundColor: active ? currentConfig.accentHex + "14" : "#EEF3F9",
                              borderColor: active ? currentConfig.accentHex + "35" : "#E3E8EF",
                              color: active ? currentConfig.accentHex : "#64748B",
                            }}
                          >
                            +${addon.price.toFixed(0)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
              </div>
              )}
              {/* RIGHT SIDE: Live Customer Quote Preview (7 cols) */}
              <section className={view === "customer" ? "lg:col-span-12 flex flex-col items-center" : "lg:col-span-7 flex flex-col items-center"}>
                <div className="w-full mb-2 flex items-center gap-1.5">
                  {view === "owner" && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200">
                        CUSTOMER SEES THIS — LIVE
                      </span>
                    </>
                  )}
                </div>
                {/* Preview-as toolbar (Desktop/Mobile toggle moved out of the phone frame) */}
                <div className="w-full flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Preview as:</span>
                  <div className={"flex items-center p-0.5 rounded-lg border " + (darkMode ? "bg-slate-900 border-slate-800" : "bg-[#EEF3F9] border-[#E3E8EF]")}>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playTick(580);
                        setPreviewDevice("desktop");
                      }}
                      className={
                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all " +
                        (previewDevice === "desktop"
                          ? darkMode
                            ? "bg-slate-800 text-white shadow-sm"
                            : "bg-white text-[#001435] shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")
                      }
                    >
                      <Monitor className="w-3 h-3" />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playTick(720);
                        setPreviewDevice("mobile");
                      }}
                      className={
                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all " +
                        (previewDevice === "mobile"
                          ? darkMode
                            ? "bg-slate-800 text-white shadow-sm"
                            : "bg-white text-[#001435] shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")
                      }
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>
                <div
                  className={
                    "w-full transition-all duration-500 rounded-2xl border shadow-sm overflow-hidden " +
                    (isMobile
                      ? "max-w-[405px] rounded-[42px] border-[7px] border-[#001435] dark:border-slate-700 shadow-2xl "
                      : "") +
                    (darkMode
                      ? "bg-[#181B24] border-slate-800"
                      : "bg-white border-[#E3E8EF]")
                  }
                >
                  {/* Dynamic Island Notch when in Mobile Preview mode */}
                  {isMobile && (
                    <div className="bg-[#001435] text-white pt-2.5 pb-1.5 px-6 flex items-center justify-between text-[10px] font-mono-num">
                      <span>9:41</span>
                      <div className="w-24 h-4 bg-black rounded-full border border-slate-800 flex items-center justify-end pr-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <span>5G 100%</span>
                    </div>
                  )}

                  {/* Top Live Preview Bar */}
                  <div className="px-4 sm:px-5 py-3 bg-[#001435] text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold tracking-wide">
                      Live Customer Quote Preview
                    </span>
                  </div>

                  {/* Main Body inside Preview Frame: switches between Calculator OR Inline Booking/Receipt */}
                  {isBookingOpen ? (
                    <div className={isMobile ? "p-4 space-y-4" : "p-6 sm:p-7 space-y-5"}>
                      <div className="flex items-center justify-between border-b pb-3.5 border-[#E3E8EF] dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playTick(500);
                            setIsBookingOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back to Calculator</span>
                        </button>
                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: currentConfig.accentHex + "14",
                            borderColor: currentConfig.accentHex + "30",
                            color: currentConfig.accentHex,
                          }}
                        >
                          {bookingStep === "form"
                            ? "Step 2 of 3 • E-Sign Dispatch"
                            : bookingStep === "deposit"
                              ? "Step 3 of 3 • Secure Deposit"
                              : "Official Receipt"}
                        </span>
                      </div>

                      {bookingStep === "form" ? (
                        <form onSubmit={handleConfirmBooking} className="space-y-4">
                          <div style={{ backgroundColor: darkMode ? "#1E222B" : "#F7F9FC", borderColor: darkMode ? "#334155" : "#E3E8EF", color: darkMode ? "#F1F5F9" : "#001435" }} className="p-3.5 rounded-xl border flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold">
                                {currentConfig.businessName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {customerSize.toLocaleString()} {currentConfig.unitLabel} • {freqObj.label}
                              </div>
                            </div>
                            <div
                              className="text-xl font-mono-num font-extrabold shrink-0"
                              style={{ color: currentConfig.accentHex }}
                            >
                              ${finalTotal.toFixed(2)}
                            </div>
                          </div>

                          <div className={"grid gap-3 " + (isMobile ? "grid-cols-1" : "grid-cols-2")}>
                            <div>
                              <label className="block text-xs font-semibold mb-1">
                                Your Full Name
                              </label>
                              <div className="relative">
                                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  required
                                  value={customerName}
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  className={
                                    "w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium " +
                                    (darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-[#F7F9FC] border-[#E3E8EF]")
                                  }
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold mb-1">
                                Email Address
                              </label>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="email"
                                  required
                                  value={customerEmail}
                                  onChange={(e) => setCustomerEmail(e.target.value)}
                                  className={
                                    "w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium " +
                                    (darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-[#F7F9FC] border-[#E3E8EF]")
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div className={"grid gap-3 " + (isMobile ? "grid-cols-1" : "grid-cols-2")}>
                            <div>
                              <label className="block text-xs font-semibold mb-1">
                                Preferred Service Date
                              </label>
                              <div className="relative">
                                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="date"
                                  required
                                  min={todayISO}
                                  value={bookingDate}
                                  onChange={(e) => setBookingDate(e.target.value)}
                                  className={
                                    "w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-mono-num " +
                                    (darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-[#F7F9FC] border-[#E3E8EF]")
                                  }
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold mb-1">
                                Arrival Time Window
                              </label>
                              <select
                                value={bookingTime}
                                onChange={(e) => setBookingTime(e.target.value)}
                                className={
                                  "w-full px-3 py-2 rounded-xl border text-xs font-medium " +
                                  (darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-[#F7F9FC] border-[#E3E8EF]")
                                }
                              >
                                {TIME_SLOTS.map((slot) => (
                                  <option key={slot} value={slot}>
                                    {slot}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Interactive HTML5 Signature Pad */}
                          <SignaturePad
                            accentHex={currentConfig.accentHex}
                            autoSignName={customerName}
                            shouldAutoSign={isBookingOpen && bookingStep === "form"}
                            onSigned={(dataUrl) => {
                              setSignatureUrl(dataUrl);
                            }}
                            onClear={() => {
                              setSignatureUrl("");
                            }}
                          />

                          <button
                            type="submit"
                            className="w-full py-3.5 px-5 rounded-full text-xs sm:text-sm font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                            style={{ backgroundColor: currentConfig.accentHex }}
                          >
                            <span>Continue to Deposit — ${finalTotal.toFixed(2)}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>
                      ) : bookingStep === "deposit" ? (
                        <DepositStep
                          total={finalTotal}
                          businessName={currentConfig.businessName}
                          orderDescription={
                            currentConfig.businessName + " deposit - " + currentConfig.label + ", " +
                            customerSize.toLocaleString() + " " + currentConfig.unitLabel
                          }
                          accentHex={currentConfig.accentHex}
                          darkMode={darkMode}
                          onPaid={finalizeBooking}
                          onBack={() => setBookingStep("form")}
                        />
                      ) : (
                        activeReceipt && (
                          <ReceiptCard
                            receipt={activeReceipt}
                            businessName={currentConfig.businessName}
                            accentHex={currentConfig.accentHex}
                            darkMode={darkMode}
                            onPrint={() => window.print()}
                            onCloseAndOpenCrm={() => {
                              setIsBookingOpen(false);
                              setView("leads");
                              setActiveTab("crm");
                            }}
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <div className={isMobile ? "p-4 space-y-5" : "p-5 sm:p-7 space-y-6"}>
                      {/* Customer Widget Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3.5 border-[#E3E8EF] dark:border-slate-800">
                        <div>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: currentConfig.accentHex }}
                          >
                            Instant Online Price Calculator
                          </span>
                          <h3 className={isMobile ? "text-lg font-black tracking-tight mt-0.5" : "text-xl sm:text-2xl font-black tracking-tight mt-0.5"}>
                            {currentConfig.businessName || "Your Service Business"}
                          </h3>
                        </div>

                        {aiMatchedPromptId && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                            <Sparkles className="w-3 h-3" />
                            Demo scene applied
                          </span>
                        )}
                      </div>

                      {/* FEATURE 0: AI quote assistant (Claude) - free text to calculator settings */}
                      <AiQuoteAssistant
                        config={currentConfig}
                        accentHex={currentConfig.accentHex}
                        darkMode={darkMode}
                        onApply={handleApplyAiSuggestion}
                      />

                      {/* FEATURE 1: Computer-Vision "AI Photo & Scope Scanner" with REAL Photos */}
                      <ScopeScanner
                        samplePrompts={currentConfig.samplePrompts}
                        scanningPromptId={scanningPromptId}
                        aiMatchedPromptId={aiMatchedPromptId}
                        activePrompt={activePromptObj}
                        visionModalOpen={visionModalOpen}
                        accentHex={currentConfig.accentHex}
                        darkMode={darkMode}
                        isMobile={isMobile}
                        onToggleVision={() => setVisionModalOpen(!visionModalOpen)}
                        onRunPrompt={handleRunAiPrompt}
                      />
                      {/* FEATURE 2: Interactive Visual Blueprint / Space Configurator + Slider */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-sm font-bold flex flex-wrap items-center gap-1.5">
                            <span>{currentConfig.sizeLabel}</span>
                            <span className="text-[11px] font-normal text-slate-400">
                              (Tap room zones or drag slider)
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm sm:text-base font-mono-num font-bold px-3 py-1 rounded-xl border"
                              style={{
                                backgroundColor: currentConfig.accentHex + "12",
                                borderColor: currentConfig.accentHex + "30",
                                color: currentConfig.accentHex,
                              }}
                            >
                              {customerSize.toLocaleString()} {currentConfig.unitLabel}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Clickable Blueprint Zone Grid (2x2 on Mobile, 4-col on Desktop, Zero Truncation) */}
                        <div className={"grid gap-2 " + (isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
                          {currentConfig.zones.map((zone) => {
                            const isZoneActive =
                              customerSize >= zone.minSize &&
                              (!zone.linkedAddOnId || selectedAddOns.includes(zone.linkedAddOnId));
                            return (
                              <button
                                key={zone.id}
                                type="button"
                                onClick={() => handleZoneClick(zone)}
                                className={
                                  "p-2.5 rounded-xl border text-left transition-all relative " +
                                  (isZoneActive
                                    ? darkMode
                                      ? "bg-slate-900 border-emerald-500/60 shadow-sm"
                                      : "bg-[#F7F9FC] border-slate-400 shadow-sm"
                                    : darkMode
                                    ? "bg-slate-900/40 border-slate-800 opacity-65 hover:opacity-95"
                                    : "bg-slate-50/70 border-[#E3E8EF] opacity-70 hover:opacity-100")
                                }
                              >
                                <div className="flex items-start justify-between gap-1 mb-0.5">
                                  <span className="text-xs font-bold leading-snug">{zone.label}</span>
                                  <span
                                    className={
                                      "w-2 h-2 rounded-full mt-1 shrink-0 " +
                                      (isZoneActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700")
                                    }
                                  />
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                  {zone.sublabel}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="range"
                          min={currentConfig.minSize}
                          max={currentConfig.maxSize}
                          step={currentConfig.stepSize}
                          value={customerSize}
                          onChange={(e) => {
                            soundFX.playTick(600);
                            setCustomerSize(Number(e.target.value));
                          }}
                          className="w-full"
                        />

                        {/* Live Crew & Duration Telemetry Pill */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                          <span>
                            Min: {currentConfig.minSize.toLocaleString()} {currentConfig.unitLabel}
                          </span>
                          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#001435] text-white text-[11px] font-semibold shadow-sm">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-emerald-400" />
                              Est. Crew: {estPros} Pros
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              ~{estHours} hrs
                            </span>
                          </div>
                          <span>
                            Max: {currentConfig.maxSize.toLocaleString()} {currentConfig.unitLabel}
                          </span>
                        </div>
                      </div>

                      {/* 2. Service Speed & Booking Frequency (Stacked on Mobile so buttons never clip!) */}
                      <div className={"grid gap-4 " + (isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
                        {/* Urgency */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Service Speed
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {URGENCY_OPTIONS.map((opt) => {
                              const selected = urgency === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    soundFX.playToggle(true);
                                    setUrgency(opt.id);
                                  }}
                                  className={
                                    "p-2.5 rounded-xl border text-left transition-all " +
                                    (selected
                                      ? darkMode
                                        ? "bg-slate-800 border-white text-white shadow-sm"
                                        : "bg-[#001435] border-[#001435] text-white shadow-sm"
                                      : darkMode
                                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                                      : "bg-[#F7F9FC] border-[#E3E8EF] text-[#001435] hover:border-slate-300")
                                  }
                                >
                                  <div className="text-xs font-bold leading-snug">{opt.label}</div>
                                  <div
                                    className={
                                      "text-[11px] mt-0.5 " +
                                      (selected ? "text-slate-300" : "text-slate-500")
                                    }
                                  >
                                    {opt.badge}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Frequency */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Booking Frequency
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {FREQUENCY_OPTIONS.map((opt) => {
                              const selected = frequency === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    soundFX.playToggle(true);
                                    setFrequency(opt.id);
                                  }}
                                  className={
                                    "p-2.5 rounded-xl border text-center transition-all " +
                                    (selected
                                      ? darkMode
                                        ? "bg-slate-800 border-white text-white shadow-sm"
                                        : "bg-[#001435] border-[#001435] text-white shadow-sm"
                                      : darkMode
                                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                                      : "bg-[#F7F9FC] border-[#E3E8EF] text-[#001435] hover:border-slate-300")
                                  }
                                >
                                  <div className="text-xs font-bold leading-snug">{opt.label}</div>
                                  <div
                                    className={
                                      "text-[10px] font-semibold mt-0.5 " +
                                      (selected
                                        ? "text-emerald-300"
                                        : opt.discount > 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-slate-500")
                                    }
                                  >
                                    {opt.badge}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 3. Customer Selectable Add-ons (Zero Truncation) */}
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Extra Services
                        </label>
                        {visibleAddOns.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                            All optional add-ons are currently hidden in Builder Controls.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {visibleAddOns.map((addon) => {
                              const isChecked = selectedAddOns.includes(addon.id);
                              return (
                                <button
                                  key={addon.id}
                                  type="button"
                                  onClick={() => toggleCustomerAddOn(addon.id)}
                                  className={
                                    "p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 " +
                                    (isChecked
                                      ? darkMode
                                        ? "bg-slate-900 border-slate-600 shadow-sm"
                                        : "bg-[#F7F9FC] border-[#001435] shadow-sm"
                                      : darkMode
                                      ? "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                                      : "bg-white border-[#E3E8EF] hover:border-slate-300")
                                  }
                                >
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div
                                      className={
                                        "w-5 h-5 rounded-md flex items-center justify-center mt-0.5 transition-colors shrink-0 " +
                                        (isChecked
                                          ? "text-white"
                                          : "border border-slate-300 dark:border-slate-600")
                                      }
                                      style={{
                                        backgroundColor: isChecked
                                          ? currentConfig.accentHex
                                          : undefined,
                                      }}
                                    >
                                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold leading-snug">
                                        {addon.name}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                                        {addon.description}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className="text-xs font-mono-num font-bold shrink-0 px-2.5 py-1 rounded-lg border"
                                    style={{
                                      backgroundColor: isChecked ? currentConfig.accentHex + "14" : "#EEF3F9",
                                      borderColor: isChecked ? currentConfig.accentHex + "35" : "#E3E8EF",
                                      color: isChecked ? currentConfig.accentHex : "#475569",
                                    }}
                                  >
                                    +${addon.price.toFixed(0)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 4. Tactile Paper Invoice / Live Estimate Breakdown + Full-Width CTA */}
                      <div
                        className={
                          "receipt-paper-edge rounded-2xl border p-4 sm:p-5 space-y-4 transition-colors " +
                          (darkMode
                            ? "bg-[#14171F] border-slate-800"
                            : "bg-[#F7F9FC] border-[#E3E8EF]")
                        }
                      >
                        <div className="flex items-center justify-between border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Itemized Instant Estimate
                          </span>
                          <span className="text-xs font-mono-num font-semibold text-slate-700 dark:text-slate-300">
                            {currentConfig.businessName}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className={"flex justify-between gap-2 text-slate-800 dark:text-slate-200 " + flashLineClass("baseFee")}>
                            <span className="flex items-center gap-1.5">
                              Base dispatch & setup fee
                              {isFlashed("baseFee") && (
                                <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-300 text-amber-900">updated</span>
                              )}
                            </span>
                            <span className="font-mono-num font-semibold shrink-0">
                              ${currentConfig.baseFee.toFixed(2)}
                            </span>
                          </div>

                          <div className={"flex justify-between gap-2 text-slate-800 dark:text-slate-200 " + flashLineClass("sizeCharge")}>
                            <span className="flex items-center gap-1.5">
                              {currentConfig.sizeLabel} ({customerSize.toLocaleString()}{" "}
                              {currentConfig.unitLabel} × ${currentConfig.multiplier})
                              {isFlashed("sizeCharge") && (
                                <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-300 text-amber-900">updated</span>
                              )}
                            </span>
                            <span className="font-mono-num font-semibold shrink-0">
                              ${sizeCharge.toFixed(2)}
                            </span>
                          </div>

                          {activeCustomerAddOns.map((addon) => (
                            <div
                              key={addon.id}
                              className={"flex justify-between gap-2 text-slate-800 dark:text-slate-200 " + flashLineClass(addon.id)}
                            >
                              <span className="flex items-center gap-1.5">
                                {addon.name}
                                {isFlashed(addon.id) && (
                                  <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-300 text-amber-900">updated</span>
                                )}
                              </span>
                              <span className="font-mono-num font-semibold shrink-0">
                                +${addon.price.toFixed(2)}
                              </span>
                            </div>
                          ))}

                          {urgency === "rush" && (
                            <div className="flex justify-between gap-2 text-amber-700 dark:text-amber-400 font-medium">
                              <span>Next-Day Rush Priority (+20%)</span>
                              <span className="font-mono-num font-semibold shrink-0">
                                +${rushFee.toFixed(2)}
                              </span>
                            </div>
                          )}

                          {discountAmount > 0 && (
                            <div className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                              <span>
                                {freqObj.label} Plan Discount ({freqObj.badge})
                              </span>
                              <span className="font-mono-num font-semibold shrink-0">
                                −${discountAmount.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-4 space-y-3.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Total Guaranteed Price
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                No hidden fees • Cancel anytime
                              </div>
                            </div>
                            <span
                              className={
                                "text-3xl sm:text-4xl font-mono-num font-extrabold tracking-tight transition-transform duration-200 " +
                                (pricePulse ? "scale-105" : "scale-100")
                              }
                              style={{ color: currentConfig.accentHex }}
                            >
                              ${Math.round(animatedTotal).toLocaleString()}.00
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={handleOpenBooking}
                            className="w-full py-3.5 px-6 rounded-full text-sm font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                            style={{ backgroundColor: currentConfig.accentHex }}
                          >
                            <span>Book This Price — ${finalTotal.toFixed(2)}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Price-lock guarantee
                          </span>
                          <span>Instant e-sign dispatch</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
        {/* TAB 2: LEAD CRM PIPELINE */}
        {view === "leads" && activeTab === "crm" && (
          <div className="space-y-6">
            <div
              className={
                "rounded-2xl border p-6 flex flex-wrap items-center justify-between gap-4 " +
                (darkMode
                  ? "bg-[#181B24] border-slate-800"
                  : "bg-white border-[#E3E8EF]")
              }
            >
              <div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: currentConfig.accentHex }}
                >
                  Live Quote Pipeline
                </span>
                <h2 className="text-2xl font-black tracking-tight mt-0.5">
                  Customer Quotes & Bookings CRM
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Every quote locked in the calculator automatically lands here with 1-click SMS/Email follow-up.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="px-4 py-2.5 rounded-xl bg-[#F7F9FC] dark:bg-slate-900 border border-[#E3E8EF] dark:border-slate-800">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">Total Pipeline Value</div>
                  <div className="text-lg font-mono-num font-bold text-slate-900 dark:text-white">
                    $
                    {crmLeads
                      .reduce((s, l) => s + l.totalPrice, 0)
                      .toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setView("owner");
                    setActiveTab("builder");
                  }}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: currentConfig.accentHex }}
                >
                  + Create New Quote
                </button>
              </div>
            </div>

            <div className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 md:mx-0 md:px-0 md:overflow-visible">
              {(
                [
                  { id: "new", title: "New Instant Estimates", badgeBg: "bg-amber-500" },
                  { id: "sent", title: "Follow-Up Sent", badgeBg: "bg-blue-500" },
                  { id: "booked", title: "Confirmed Bookings", badgeBg: "bg-emerald-600" },
                ] as const
              ).map((col) => {
                const colLeads = crmLeads.filter((l) => l.status === col.id);
                return (
                  <div
                    key={col.id}
                    className={
                      "rounded-2xl border p-4 space-y-3 snap-center shrink-0 w-[78vw] max-w-[320px] md:w-auto md:max-w-none md:shrink " +
                      (darkMode
                        ? "bg-[#181B24] border-slate-800"
                        : "bg-[#EEF3F9]/70 border-[#E3E8EF]")
                    }
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={"w-2 h-2 rounded-full " + col.badgeBg} />
                        <h3 className="text-sm font-black">{col.title}</h3>
                      </div>
                      <span className="text-xs font-mono-num font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-[#E3E8EF] dark:border-slate-700">
                        {colLeads.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className={
                            "p-4 rounded-xl border shadow-sm space-y-3 transition-all duration-700 " +
                            (darkMode
                              ? "bg-slate-900 border-slate-800"
                              : "bg-white border-[#E3E8EF]") +
                            (lead.isNew
                              ? " ring-2 ring-amber-400 ring-offset-1"
                              : "")
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono-num font-bold text-slate-400">
                                  #{lead.quoteId}
                                </span>
                                {lead.isHotLead && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                    <Flame className="w-3 h-3" /> Hot
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-bold mt-0.5">
                                {lead.customerName}
                              </div>
                              <div className="text-xs text-slate-400">
                                {lead.customerEmail}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className="text-base font-mono-num font-bold"
                                style={{ color: currentConfig.accentHex }}
                              >
                                ${lead.totalPrice.toLocaleString()}
                              </div>
                              {lead.deposit && (
                                <div className="text-[10px] font-semibold text-emerald-600 leading-tight whitespace-nowrap">
                                  <div>Paid ${lead.deposit.amount.toFixed(2)}</div>
                                  <div>{lead.deposit.provider === "paypal" ? "via PayPal" : "demo"}</div>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400">
                                {lead.createdAt}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-300 bg-[#F7F9FC] dark:bg-slate-800/70 p-2.5 rounded-lg border border-[#E3E8EF] dark:border-slate-800">
                            <div className="font-semibold text-[11px] text-slate-400 mb-0.5">
                              {lead.industryLabel} • {lead.frequencyLabel}
                            </div>
                            <div>{lead.scopeSummary}</div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleCopyFollowUp(lead)}
                              className="flex-1 py-1.5 px-2.5 rounded-lg border border-[#E3E8EF] dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              {copiedLeadId === lead.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Copied SMS!</span>
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Copy Follow-Up</span>
                                </>
                              )}
                            </button>

                            {col.id !== "booked" && (
                              <button
                                type="button"
                                onClick={() =>
                                  moveLeadStatus(
                                    lead.id,
                                    col.id === "new" ? "sent" : "booked"
                                  )
                                }
                                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-white"
                                style={{ backgroundColor: currentConfig.accentHex }}
                              >
                                {col.id === "new" ? "Mark Sent →" : "Mark Booked ✓"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ROI CALCULATOR MODAL */}
      {roiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={
              "w-full max-w-3xl rounded-2xl border shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto " +
              (darkMode
                ? "bg-[#181B24] border-slate-800 text-white"
                : "bg-white border-[#E3E8EF] text-[#001435]")
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: currentConfig.accentHex }}
                >
                  Revenue Impact Simulator
                </span>
                <h2 className="text-2xl font-black tracking-tight mt-0.5">
                  How Much Revenue Does Instant Quoting Unlock?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRoiOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Illustrative example using assumed conversion rates (2.1% for callback forms, 6.8% with instant pricing). Not measured data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                  <span>Projected Monthly Revenue Lift</span>
                </div>
                <div className="text-3xl font-mono-num font-extrabold text-emerald-700 dark:text-emerald-300 mt-2">
                  +${monthlyRevenueLift.toLocaleString()}/mo
                </div>
                <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                  +${(monthlyRevenueLift * 12).toLocaleString()} additional annual revenue
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-[#E3E8EF] dark:border-slate-800 bg-[#F7F9FC] dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Percent className="w-4 h-4" />
                  <span>Booked Jobs per Month</span>
                </div>
                <div className="text-3xl font-mono-num font-extrabold mt-2">
                  {newMonthlyBookings} jobs
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  vs. {oldMonthlyLeads} jobs with a callback form (assumed
                  rates)
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-[#E3E8EF] dark:border-slate-800 bg-[#F7F9FC] dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Phone & Admin Time Saved</span>
                </div>
                <div className="text-3xl font-mono-num font-extrabold mt-2">
                  {hoursSavedPerMonth} hrs/mo
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Eliminates manual back-and-forth price estimating calls
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E3E8EF] dark:border-slate-800">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Monthly Website Visitors</span>
                  <span className="font-mono-num font-bold">
                    {monthlyVisitors.toLocaleString()} visitors/mo
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={10000}
                  step={100}
                  value={monthlyVisitors}
                  onChange={(e) => {
                    soundFX.playTick(550);
                    setMonthlyVisitors(Number(e.target.value));
                  }}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Average Service Job Value ($)</span>
                  <span className="font-mono-num font-bold">
                    ${avgTicketSize.toLocaleString()} / booking
                  </span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={2500}
                  step={15}
                  value={avgTicketSize}
                  onChange={(e) => {
                    soundFX.playTick(650);
                    setAvgTicketSize(Number(e.target.value));
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH & EMBED MODAL */}
      {isEmbedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={
              "w-full max-w-lg rounded-2xl border shadow-xl p-6 space-y-4 " +
              (darkMode
                ? "bg-[#181B24] border-slate-800 text-white"
                : "bg-white border-[#E3E8EF] text-[#001435]")
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: currentConfig.accentHex }}
                >
                  1-Click Website Integration
                </span>
                <h3 className="text-lg font-black">
                  Embed {currentConfig.businessName} Calculator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmbedOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste this snippet onto your WordPress, Webflow, Squarespace, or Shopify site to start capturing instant bookings 24/7.
            </p>

            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono-num overflow-x-auto border border-slate-800">
              {embedSnippet}
            </pre>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="px-4 py-2.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5"
                style={{ backgroundColor: currentConfig.accentHex }}
              >
                {embedCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied Snippet!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Embed Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW LEAD TOAST (bottom-left) */}
      {toastLead && (
        <div
          key={toastLead.id}
          className={
            "fixed bottom-4 left-4 z-50 max-w-[320px] rounded-2xl border shadow-xl p-3.5 flex items-start gap-3 " +
            (darkMode
              ? "bg-[#181B24] border-slate-700 text-white"
              : "bg-white border-[#E3E8EF] text-[#001435]") +
            (prefersReducedMotion.current
              ? " animate-fade-in-static"
              : " animate-toast-slide-in")
          }
          role="status"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: currentConfig.accentHex + "1A" }}
          >
            <Flame className="w-4 h-4" style={{ color: currentConfig.accentHex }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New lead{" "}
              <span className="font-mono-num font-bold">#{toastLead.quoteId}</span>{" "}
              just landed in your inbox
            </p>
            <button
              type="button"
              onClick={() => {
                setToastLead(null);
                setView("leads");
                setActiveTab("crm");
              }}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold"
              style={{ color: currentConfig.accentHex }}
            >
              View lead
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToastLead(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;