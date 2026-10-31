// Owner sign-in (Supabase Auth). Loaded only by the dashboard, so the booking page stays light.
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { IndustryConfig } from "@/data/industries";
import { api } from "@/lib/api";
import type { BusinessRecord } from "@/lib/store";

interface PublicConfig {
  /** False when the server has no Supabase sign-in; the dashboard then opens without one. */
  auth: boolean;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  /** True when "Use the demo account" works. */
  demo: boolean;
}

export interface Me {
  email: string;
  demo: boolean;
  business: BusinessRecord | null;
}

let configPromise: Promise<PublicConfig> | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

export function publicConfig(): Promise<PublicConfig> {
  configPromise ??= api<PublicConfig>("/public-config").catch(() => ({ auth: false, demo: false }));
  return configPromise;
}

function authClient(): Promise<SupabaseClient | null> {
  clientPromise ??= publicConfig().then(async (c) => {
    if (!c.auth || !c.supabaseUrl || !c.supabasePublishableKey) return null;
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(c.supabaseUrl, c.supabasePublishableKey);
  });
  return clientPromise;
}

/** The signed-in owner's access token, refreshed when needed. Null when signed out or sign-in is off. */
export async function accessToken(): Promise<string | null> {
  const sb = await authClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Calls back with the current session now and on every sign-in or sign-out. */
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  let unsubscribe = () => {};
  let active = true;
  authClient().then((sb) => {
    if (!sb || !active) return;
    const { data } = sb.auth.onAuthStateChange((_event, session) => callback(session));
    unsubscribe = () => data.subscription.unsubscribe();
  });
  return () => {
    active = false;
    unsubscribe();
  };
}

async function requireClient(): Promise<SupabaseClient> {
  const sb = await authClient();
  if (!sb) throw new Error("Sign-in is not available on this server.");
  return sb;
}

export async function signIn(email: string, password: string): Promise<void> {
  const sb = await requireClient();
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    throw new Error(/invalid/i.test(error.message) ? "That email and password do not match." : error.message);
  }
}

/** Creates the account and its business on the server, then signs in. Returns the booking page slug. */
export async function signUp(email: string, password: string, config: IndustryConfig): Promise<string> {
  const { slug } = await api<{ slug: string }>("/auth/signup", {
    method: "POST",
    body: { email: email.trim(), password, config },
  });
  await signIn(email, password);
  return slug;
}

export async function signInDemo(): Promise<void> {
  const sb = await requireClient();
  const { session } = await api<{ session: { access_token: string; refresh_token: string } }>("/auth/demo", {
    method: "POST",
    body: {},
  });
  const { error } = await sb.auth.setSession(session);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const sb = await authClient();
  await sb?.auth.signOut();
}

export async function getMe(token?: string): Promise<Me> {
  return api<Me>("/me", { token: token ?? (await accessToken()) });
}

/** For an account that has no business yet. */
export async function createMyBusiness(config: IndustryConfig): Promise<BusinessRecord> {
  return (await api<{ business: BusinessRecord }>("/me/business", { method: "POST", body: { config }, token: await accessToken() }))
    .business;
}
