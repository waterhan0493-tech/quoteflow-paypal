export type PresetId = "cleaning" | "lawn" | "wedding";

export interface AddOnItem {
  id: string;
  name: string;
  description: string;
  price: number;
  enabledInBuilder: boolean;
}

export interface SamplePrompt {
  id: string;
  label: string;
  emoji: string;
  photoLabel: string;
  imageUrl: string;
  roomType: string;
  size: number;
  urgency: "standard" | "rush";
  frequency: "once" | "monthly" | "weekly";
  addOnIds: string[];
  detections: { text: string; conf: string; impact: string; x: number; y: number }[];
}

export interface BlueprintZone {
  id: string;
  label: string;
  sublabel: string;
  minSize: number;
  linkedAddOnId?: string;
  sizeBoost: number;
}

export interface IndustryConfig {
  id: PresetId;
  label: string;
  tagline: string;
  businessName: string;
  benchmarkSource: string;
  baseFee: number;
  unitLabel: string;
  unitSingular: string;
  sizeLabel: string;
  minSize: number;
  maxSize: number;
  stepSize: number;
  defaultSize: number;
  multiplier: number;
  minMultiplier: number;
  maxMultiplier: number;
  stepMultiplier: number;
  accentHex: string;
  accentBg: string;
  accentText: string;
  accentLightBg: string;
  accentBorder: string;
  addOns: AddOnItem[];
  samplePrompts: SamplePrompt[];
  zones: BlueprintZone[];
}

export const INITIAL_PRESETS: Record<PresetId, IndustryConfig> = {
  cleaning: {
    id: "cleaning",
    label: "Home Cleaning",
    tagline: "Residential & Move-Out Cleaning",
    businessName: "Sparkle & Co. Cleaning",
    benchmarkSource: "Angi & HomeGuide 2026 US Residential Avg ($0.10–$0.20/sq ft)",
    baseFee: 65,
    unitLabel: "sq ft",
    unitSingular: "sq ft",
    sizeLabel: "Home Size",
    minSize: 600,
    maxSize: 5000,
    stepSize: 100,
    defaultSize: 1800,
    multiplier: 0.12,
    minMultiplier: 0.06,
    maxMultiplier: 0.25,
    stepMultiplier: 0.01,
    accentHex: "#EA580C",
    accentBg: "bg-orange-600",
    accentText: "text-orange-600",
    accentLightBg: "bg-orange-50/80",
    accentBorder: "border-orange-200",
    addOns: [
      {
        id: "oven-fridge",
        name: "Interior Oven & Fridge Degrease",
        description: "Deep thermal degreasing of racks, drawers & stainless seals",
        price: 85,
        enabledInBuilder: true,
      },
      {
        id: "baseboard-grout",
        name: "Deep Baseboard & Grout Scrub",
        description: "Hand-detailed woodwork wipe-down & bathroom tile restoration",
        price: 95,
        enabledInBuilder: true,
      },
      {
        id: "pet-hepa",
        name: "HEPA Pet Hair & Enzyme Treatment",
        description: "Upholstery fur extraction & plant-based enzyme odor neutralizer",
        price: 45,
        enabledInBuilder: true,
      },
    ],
    samplePrompts: [
      {
        id: "clean-1",
        label: "3-bed move-out kitchen, oven & baseboard reset",
        emoji: "🏠",
        photoLabel: "Move-Out Kitchen & Oven",
        imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
        roomType: "kitchen",
        size: 2200,
        urgency: "rush",
        frequency: "once",
        addOnIds: ["oven-fridge", "baseboard-grout"],
        detections: [
          { text: "2,200 sq ft Kitchen & Cabinets", conf: "99% match", impact: "Base +$264", x: 24, y: 30 },
          { text: "Oven & Appliance Degrease", conf: "98% match", impact: "+$85.00", x: 83, y: 47 },
          { text: "Baseboard & Floor Deep Scrub", conf: "97% match", impact: "+$95.00", x: 34, y: 82 },
        ],
      },
      {
        id: "clean-2",
        label: "Weekly sunlit living area & baseboard detail",
        emoji: "🌿",
        photoLabel: "Sunlit 3-Bed Living Area",
        imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
        roomType: "living",
        size: 1800,
        urgency: "standard",
        frequency: "weekly",
        addOnIds: ["baseboard-grout"],
        detections: [
          { text: "1,800 sq ft Open Living Plan", conf: "99% match", impact: "Base +$216", x: 48, y: 38 },
          { text: "Hardwood & Baseboard Detail", conf: "98% match", impact: "+$95.00", x: 28, y: 82 },
          { text: "Eco-Safe Surface Sanitize", conf: "Optimal", impact: "Save 20%", x: 72, y: 60 },
        ],
      },
      {
        id: "clean-3",
        label: "Full 3,200 sq ft family loft deep reset + pet care",
        emoji: "✨",
        photoLabel: "Pet-Friendly Family Loft",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
        roomType: "loft",
        size: 3200,
        urgency: "rush",
        frequency: "monthly",
        addOnIds: ["oven-fridge", "baseboard-grout", "pet-hepa"],
        detections: [
          { text: "3,200 sq ft Full Loft Space", conf: "99% match", impact: "Base +$384", x: 72, y: 36 },
          { text: "HEPA Pet Hair Upholstery Extract", conf: "99% match", impact: "+$45.00", x: 36, y: 58 },
          { text: "Deep Carpet & Baseboard Scrub", conf: "97% match", impact: "+$95.00", x: 52, y: 84 },
        ],
      },
    ],
    zones: [
      { id: "z-living", label: "Living & Dining", sublabel: "Core floorplan", minSize: 600, sizeBoost: 1400 },
      { id: "z-kitchen", label: "Kitchen & Oven", sublabel: "+Oven & Fridge", minSize: 1200, linkedAddOnId: "oven-fridge", sizeBoost: 1800 },
      { id: "z-beds", label: "3 Bedrooms", sublabel: "+HEPA Pet Care", minSize: 1800, linkedAddOnId: "pet-hepa", sizeBoost: 2400 },
      { id: "z-baths", label: "2.5 Bathrooms", sublabel: "+Grout Scrub", minSize: 2400, linkedAddOnId: "baseboard-grout", sizeBoost: 3200 },
    ],
  },
  lawn: {
    id: "lawn",
    label: "Lawn & Landscape",
    tagline: "Turf Care & Outdoor Grounds",
    businessName: "Rootline Lawn & Landscape",
    benchmarkSource: "LawnStarter 2026 US Grounds Avg ($0.03–$0.06/sq ft)",
    baseFee: 55,
    unitLabel: "sq ft",
    unitSingular: "sq ft",
    sizeLabel: "Lot Size",
    minSize: 1000,
    maxSize: 10000,
    stepSize: 250,
    defaultSize: 4500,
    multiplier: 0.04,
    minMultiplier: 0.02,
    maxMultiplier: 0.08,
    stepMultiplier: 0.005,
    accentHex: "#15803D",
    accentBg: "bg-green-700",
    accentText: "text-green-700",
    accentLightBg: "bg-green-50/80",
    accentBorder: "border-green-200",
    addOns: [
      {
        id: "mulch-beds",
        name: "Cedar Mulch Bed Install (2 cu. yd.)",
        description: "Premium dark cedar bark installed across perimeter garden beds",
        price: 165,
        enabledInBuilder: true,
      },
      {
        id: "hedge-trim",
        name: "Hedge & Shrub Trimming (40 lin. ft.)",
        description: "Laser-level boxwood sculpting & ornamental shrub shaping",
        price: 110,
        enabledInBuilder: true,
      },
      {
        id: "seasonal-cleanup",
        name: "Seasonal Leaf Cleanup & Haul-Away",
        description: "Commercial power-blowing, branch clearing & green-waste dump fee",
        price: 145,
        enabledInBuilder: true,
      },
    ],
    samplePrompts: [
      {
        id: "lawn-1",
        label: "Quarter-acre backyard turf + cedar mulch & shrub trim",
        emoji: "🏡",
        photoLabel: "Quarter-Acre Backyard Turf",
        imageUrl: "https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=900&q=80",
        roomType: "backyard",
        size: 4500,
        urgency: "rush",
        frequency: "once",
        addOnIds: ["mulch-beds", "hedge-trim"],
        detections: [
          { text: "4,500 sq ft Turf Mowing Zone", conf: "99% match", impact: "Base +$180", x: 48, y: 72 },
          { text: "Cedar Mulch Bed Install", conf: "98% match", impact: "+$165.00", x: 24, y: 56 },
          { text: "Hedge & Shrub Trimming", conf: "97% match", impact: "+$110.00", x: 76, y: 38 },
        ],
      },
      {
        id: "lawn-2",
        label: "Weekly mowing & 40ft boxwood hedge sculpting",
        emoji: "🌱",
        photoLabel: "Front Curb & Boxwood Hedges",
        imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=900&q=80",
        roomType: "frontyard",
        size: 3200,
        urgency: "standard",
        frequency: "weekly",
        addOnIds: ["hedge-trim", "mulch-beds"],
        detections: [
          { text: "3,200 sq ft Curb & Turf Edge", conf: "99% match", impact: "Base +$128", x: 50, y: 74 },
          { text: "40 ft Boxwood Hedge Shaping", conf: "98% match", impact: "+$110.00", x: 32, y: 36 },
          { text: "Mulch & Weed Barrier Refresh", conf: "96% match", impact: "+$165.00", x: 74, y: 56 },
        ],
      },
      {
        id: "lawn-3",
        label: "Full 7,500 sq ft estate grounds restoration package",
        emoji: "🌳",
        photoLabel: "Estate Garden & Mulch Beds",
        imageUrl: "https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=900&q=80",
        roomType: "patio",
        size: 7500,
        urgency: "standard",
        frequency: "monthly",
        addOnIds: ["mulch-beds", "hedge-trim", "seasonal-cleanup"],
        detections: [
          { text: "7,500 sq ft Estate Turf", conf: "99% match", impact: "Base +$300", x: 46, y: 68 },
          { text: "2 cu. yd. Cedar Mulch Beds", conf: "98% match", impact: "+$165.00", x: 25, y: 52 },
          { text: "Seasonal Leaf & Branch Haul", conf: "97% match", impact: "+$145.00", x: 76, y: 30 },
        ],
      },
    ],
    zones: [
      { id: "z-front", label: "Front Curb Turf", sublabel: "Edging + Mowing", minSize: 1000, sizeBoost: 3000 },
      { id: "z-hedges", label: "40ft Boxwoods", sublabel: "+Hedge Trim", minSize: 2500, linkedAddOnId: "hedge-trim", sizeBoost: 4500 },
      { id: "z-beds", label: "Garden Beds", sublabel: "+Cedar Mulch", minSize: 4500, linkedAddOnId: "mulch-beds", sizeBoost: 6000 },
      { id: "z-back", label: "Backyard Acreage", sublabel: "+Leaf Haul-Away", minSize: 6500, linkedAddOnId: "seasonal-cleanup", sizeBoost: 8000 },
    ],
  },
  wedding: {
    id: "wedding",
    label: "Wedding Photo",
    tagline: "Editorial Documentary Coverage",
    businessName: "Lumina Editorial Weddings",
    benchmarkSource: "The Knot 2026 US National Wedding Study ($3,000–$4,500 avg)",
    baseFee: 1850,
    unitLabel: "guests",
    unitSingular: "guest",
    sizeLabel: "Guest Count",
    minSize: 30,
    maxSize: 300,
    stepSize: 10,
    defaultSize: 120,
    multiplier: 12,
    minMultiplier: 8,
    maxMultiplier: 25,
    stepMultiplier: 1,
    accentHex: "#B45309",
    accentBg: "bg-amber-700",
    accentText: "text-amber-700",
    accentLightBg: "bg-amber-50/80",
    accentBorder: "border-amber-200",
    addOns: [
      {
        id: "second-shooter",
        name: "Second Lead Photographer (8 hrs)",
        description: "Dual-angle candid coverage for ceremony, cocktail hour & reception",
        price: 550,
        enabledInBuilder: true,
      },
      {
        id: "engagement-session",
        name: "Pre-Wedding Engagement Session",
        description: "90-minute golden hour editorial portrait shoot + 60 high-res gallery",
        price: 450,
        enabledInBuilder: true,
      },
      {
        id: "drone-sneak",
        name: "4K Drone Aerials & 24hr Sneak Peeks",
        description: "FAA-licensed venue flyover + 35 edited highlights delivered next morning",
        price: 380,
        enabledInBuilder: true,
      },
    ],
    samplePrompts: [
      {
        id: "wed-1",
        label: "120-guest garden ceremony with 2nd shooter & 4K drone",
        emoji: "🥂",
        photoLabel: "120-Guest Garden Ceremony",
        imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
        roomType: "estate",
        size: 120,
        urgency: "standard",
        frequency: "once",
        addOnIds: ["second-shooter", "drone-sneak"],
        detections: [
          { text: "120-Guest Ceremony Seating", conf: "99% match", impact: "Base +$1,440", x: 48, y: 68 },
          { text: "2nd Photographer Aisle Angles", conf: "98% match", impact: "+$550.00", x: 50, y: 36 },
          { text: "4K Drone Aerial Venue Sweep", conf: "97% match", impact: "+$380.00", x: 24, y: 26 },
        ],
      },
      {
        id: "wed-2",
        label: "160-guest candlelit ballroom + engagement portrait session",
        emoji: "💍",
        photoLabel: "Candlelit Ballroom Reception",
        imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80",
        roomType: "chapel",
        size: 160,
        urgency: "standard",
        frequency: "once",
        addOnIds: ["second-shooter", "engagement-session"],
        detections: [
          { text: "160-Guest Reception Tables", conf: "99% match", impact: "Base +$1,920", x: 50, y: 66 },
          { text: "Dual-Photographer Candid Coverage", conf: "98% match", impact: "+$550.00", x: 28, y: 48 },
          { text: "Low-Light Editorial & Golden Hour", conf: "96% match", impact: "+$450.00", x: 74, y: 32 },
        ],
      },
      {
        id: "wed-3",
        label: "220-guest full-day luxury estate editorial with all upgrades",
        emoji: "✨",
        photoLabel: "Full-Day Estate Editorial",
        imageUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=900&q=80",
        roomType: "beach",
        size: 220,
        urgency: "rush",
        frequency: "once",
        addOnIds: ["second-shooter", "engagement-session", "drone-sneak"],
        detections: [
          { text: "Full-Day Lead + Editorial Portraits", conf: "99% match", impact: "Base +$2,640", x: 50, y: 52 },
          { text: "Pre-Wedding Engagement Session", conf: "99% match", impact: "+$450.00", x: 26, y: 72 },
          { text: "4K Drone Aerials & 24hr Sneak Peeks", conf: "98% match", impact: "+$380.00", x: 76, y: 28 },
        ],
      },
    ],
    zones: [
      { id: "z-ceremony", label: "Ceremony Altar", sublabel: "6hr Lead Coverage", minSize: 30, sizeBoost: 90 },
      { id: "z-cocktail", label: "Cocktail Lawn", sublabel: "+2nd Photographer", minSize: 90, linkedAddOnId: "second-shooter", sizeBoost: 130 },
      { id: "z-aerial", label: "Estate Grounds", sublabel: "+4K Drone Aerials", minSize: 130, linkedAddOnId: "drone-sneak", sizeBoost: 170 },
      { id: "z-reception", label: "Grand Reception", sublabel: "+Engagement Shoot", minSize: 170, linkedAddOnId: "engagement-session", sizeBoost: 220 },
    ],
  },
};
