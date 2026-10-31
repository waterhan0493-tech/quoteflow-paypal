// Owner sign-in with Supabase Auth. The browser signs in with the publishable key and sends
// its access token; the server checks the token and that the user owns the business.
// Off (every owner route open) when Supabase or its publishable key is not configured.
import { adminClient, publicClient, publishableKey } from "./supabase.mjs";

/** The shared account behind "Use the demo account". Its password lives only in the server env. */
export const DEMO_OWNER_EMAIL = (process.env.DEMO_OWNER_EMAIL || "demo-owner@example.com").trim().toLowerCase();
const DEMO_OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD || "";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function createAuth() {
  const admin = adminClient();
  if (!admin || !publishableKey) return null;

  // Checking a token is a network call; remember good ones for a minute.
  const seen = new Map();

  async function userFromToken(token) {
    const hit = seen.get(token);
    if (hit && hit.until > Date.now()) return hit.user;
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    if (seen.size > 500) seen.clear();
    seen.set(token, { user: data.user, until: Date.now() + 60_000 });
    return data.user;
  }

  async function findUserId(email) {
    for (let page = 1; page < 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const match = data.users.find((u) => u.email?.toLowerCase() === email);
      if (match) return match.id;
      if (data.users.length < 200) return null;
    }
    return null;
  }

  /** Makes sure the demo account exists with the configured password. Returns its user ID. */
  async function ensureDemoOwner() {
    const created = await admin.auth.admin.createUser({
      email: DEMO_OWNER_EMAIL,
      password: DEMO_OWNER_PASSWORD,
      email_confirm: true,
    });
    if (!created.error) return created.data.user.id;
    const id = await findUserId(DEMO_OWNER_EMAIL);
    if (!id) throw created.error;
    // Someone signed in as the demo owner may have changed the password; put it back.
    const reset = await admin.auth.admin.updateUserById(id, { password: DEMO_OWNER_PASSWORD, email_confirm: true });
    if (reset.error) throw reset.error;
    return id;
  }

  return {
    demoEnabled: DEMO_OWNER_PASSWORD.length >= 8,

    /** The signed-in user for a request, or null. */
    async userFromRequest(req) {
      const m = /^Bearer (.+)$/.exec(req.get("authorization") || "");
      return m ? userFromToken(m[1]) : null;
    },

    /** Creates a confirmed account (no confirmation email). */
    async createOwner(email, password) {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (!error) return data.user;
      if (error.status === 422 || /already/i.test(error.message)) {
        throw httpError(409, "An account with this email already exists. Sign in instead.");
      }
      if (/password/i.test(error.message)) throw httpError(400, error.message);
      throw error;
    },

    async deleteOwner(id) {
      await admin.auth.admin.deleteUser(id);
    },

    ensureDemoOwner,

    /** A session for the demo account, repairing the account first if sign-in fails. */
    async demoSession() {
      const signIn = () =>
        publicClient().auth.signInWithPassword({ email: DEMO_OWNER_EMAIL, password: DEMO_OWNER_PASSWORD });
      let result = await signIn();
      if (result.error) {
        await ensureDemoOwner();
        result = await signIn();
      }
      if (result.error) throw result.error;
      const { access_token, refresh_token } = result.data.session;
      return { access_token, refresh_token };
    },

    isDemo(user) {
      return user?.email?.toLowerCase() === DEMO_OWNER_EMAIL;
    },
  };
}
