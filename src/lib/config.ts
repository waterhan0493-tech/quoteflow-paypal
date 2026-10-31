import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Settings the server shares with the browser (GET /api/public-config). Every key here is public. */
export interface PublicConfig {
  /** False when the server has no Supabase sign-in; the dashboard then opens without one. */
  auth: boolean;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  /** True when "Use the demo account" works. */
  demo: boolean;
  /** Null: the server has no PayPal keys, so payments are simulated. */
  paypalClientId: string | null;
  paypalEnv: "sandbox" | "live";
}

const OFFLINE: PublicConfig = { auth: false, demo: false, paypalClientId: null, paypalEnv: "sandbox" };

let configPromise: Promise<PublicConfig> | null = null;

export function publicConfig(): Promise<PublicConfig> {
  configPromise ??= api<PublicConfig>("/public-config").catch(() => OFFLINE);
  return configPromise;
}

/** The public config, or null while it loads. */
export function usePublicConfig(): PublicConfig | null {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  useEffect(() => {
    let alive = true;
    publicConfig().then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, []);
  return config;
}

/** The yellow notice above every payment, or null for live payments. */
export function paymentNotice(config: PublicConfig): string | null {
  if (!config.paypalClientId) return "Demo mode. No payment provider is connected.";
  return config.paypalEnv === "sandbox" ? "Sandbox test payment. No real money moves." : null;
}
