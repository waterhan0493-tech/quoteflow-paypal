// Supabase settings from the environment. Every value is optional; missing ones turn features off.
import { createClient } from "@supabase/supabase-js";

function projectUrl() {
  const raw = (process.env.SUPABASE_URL || "").trim();
  // Accept the project URL with or without the "/rest/v1/" the dashboard sometimes shows.
  return raw ? new URL(raw).origin : "";
}

export const supabaseUrl = projectUrl();
const secretKey = (process.env.SUPABASE_SECRET_KEY || "").trim();
/** Safe to send to browsers: with row level security on and no policies it can only sign in. */
export const publishableKey = (process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();

const serverOptions = { auth: { persistSession: false, autoRefreshToken: false } };

/** Full access, server only. Null when Supabase is not configured. */
export function adminClient() {
  return supabaseUrl && secretKey ? createClient(supabaseUrl, secretKey, serverOptions) : null;
}

/** A fresh client with the publishable key, for signing in on the server's behalf (demo account). */
export function publicClient() {
  return supabaseUrl && publishableKey ? createClient(supabaseUrl, publishableKey, serverOptions) : null;
}
