// QuoteFlow server: serves the built app (dist/) and the /api routes.
// Local dev: `npm run server` next to `npm run dev` (Vite proxies /api here).
// Production (Render): `npm run build && npm start`.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AiQuoteRequest, aiConfigured, suggestQuote, AI_MODEL } from "./aiQuote.mjs";
import { createAuth } from "./auth.mjs";
import { createDb } from "./db.mjs";
import { BookingInput, BusinessConfig, DEMO_SLUG, NewBusinessInput, SignUpInput, Slug } from "./schemas.mjs";
import { publishableKey, supabaseUrl } from "./supabase.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");
const PORT = Number(process.env.PORT) || 8787;
const db = createDb();
const auth = createAuth(); // null: no sign-in, owner routes open (local fallback)

// Cost and abuse guards. In-memory is enough for a single small instance.
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) || 300;
let day = new Date().toISOString().slice(0, 10);
let usedToday = 0;
const aiHits = new Map();
const writeHits = new Map();

/** Sliding one-minute window per IP. Returns true when the caller is over the limit. */
function overLimit(hits, ip, perMinute) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function aiLimit(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    usedToday = 0;
  }
  if (usedToday >= DAILY_LIMIT) return "daily";
  if (overLimit(aiHits, ip, 8)) return "ip";
  usedToday += 1;
  return null;
}

function limitWrites(req, res, next) {
  if (overLimit(writeHits, req.ip || "unknown", 30)) {
    return res.status(429).json({ error: "rate_limited", message: "Too many requests. Please wait a minute." });
  }
  next();
}

// Live updates: the dashboard keeps an EventSource open per business and refetches on "bookings".
const streams = new Map(); // slug -> Set<res>
const MAX_STREAMS_PER_SLUG = 100;

function notify(slug, event) {
  for (const res of streams.get(slug) || []) res.write(`event: ${event}\ndata: {}\n\n`);
}

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for req.ip
app.use(express.json({ limit: "256kb" })); // a booking carries the signature image

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiConfigured(), model: AI_MODEL, storage: db.kind, auth: Boolean(auth) });
});

// What the browser needs to sign in. The publishable key is public by design.
app.get("/api/public-config", (_req, res) => {
  res.json(
    auth
      ? { auth: true, supabaseUrl, supabasePublishableKey: publishableKey, demo: auth.demoEnabled }
      : { auth: false, demo: false }
  );
});

app.post("/api/ai-quote", async (req, res) => {
  const input = AiQuoteRequest.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "bad_request", message: "Describe the job in 3 to 600 characters." });
  }
  if (!aiConfigured()) {
    return res.status(503).json({ error: "ai_unavailable", message: "The AI assistant is offline right now." });
  }
  const limited = aiLimit(req.ip || "unknown");
  if (limited) {
    return res.status(429).json({
      error: "rate_limited",
      message:
        limited === "daily"
          ? "The AI assistant has hit today's limit. Please set the options by hand."
          : "Too many requests. Please wait a minute.",
    });
  }
  try {
    const result = await suggestQuote(input.data);
    console.log(`[ai-quote] ok ${result.usage.inputTokens}+${result.usage.outputTokens} tokens (${usedToday}/${DAILY_LIMIT} today)`);
    res.json(result);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
    console.error("[ai-quote] failed:", code || err);
    const message =
      code === "ai_refused" || code === "ai_bad_output"
        ? err.message
        : "The AI assistant is unavailable. Please set the options by hand.";
    res.status(502).json({ error: code || "ai_error", message });
  }
});

// ---- Owners ----

function publicBusiness(b) {
  return { slug: b.slug, name: b.name, industry: b.industry, config: b.config };
}

function slugify(name) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/, "");
  return base.length >= 2 ? base : "my-business";
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function requireUser(req, res, next) {
  if (!auth) return res.status(404).json({ error: "auth_off", message: "Sign-in is not configured on this server." });
  req.user = await auth.userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: "signed_out", message: "Please sign in again." });
  next();
}

/** Owner routes: the signed-in user must own :slug. Open when sign-in is off. */
async function requireOwner(req, res, next) {
  if (!auth) return next();
  const user = await auth.userFromRequest(req);
  if (!user) return res.status(401).json({ error: "signed_out", message: "Please sign in again." });
  const business = await db.getBusiness(req.slug);
  if (!business || business.owner_id !== user.id) {
    return res.status(403).json({ error: "forbidden", message: "This business belongs to another account." });
  }
  next();
}

/** New business for a signed-in owner, at the first free slug made from its name. */
async function createBusinessFor(user, config) {
  if (auth.isDemo(user)) {
    // The demo owner always gets the demo business, existing or new.
    const existing = await db.getBusiness(DEMO_SLUG);
    if (existing) {
      await db.setOwner(DEMO_SLUG, user.id);
      return { ...existing, owner_id: user.id };
    }
  }
  const base = auth.isDemo(user) ? DEMO_SLUG : slugify(config.businessName);
  for (let i = 1; i <= 20; i++) {
    const slug = i === 1 ? base : base + "-" + i;
    try {
      return await db.createBusiness({ slug, name: config.businessName, industry: config.id, config, owner_id: user.id });
    } catch (err) {
      if (err.message === "owner_taken") throw httpError(409, "This account already has a business.");
      if (err.message !== "slug_taken") throw err;
    }
  }
  throw httpError(409, "Pick a more specific business name.");
}

app.post("/api/auth/signup", limitWrites, async (req, res) => {
  if (!auth) return res.status(404).json({ error: "auth_off", message: "Sign-in is not configured on this server." });
  const input = SignUpInput.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({
      error: "bad_request",
      message: "Enter a business name, a valid email and a password of at least 8 characters.",
    });
  }
  const user = await auth.createOwner(input.data.email, input.data.password);
  try {
    const business = await createBusinessFor(user, input.data.config);
    res.status(201).json({ slug: business.slug });
  } catch (err) {
    await auth.deleteOwner(user.id).catch(() => {});
    throw err;
  }
});

app.post("/api/auth/demo", limitWrites, async (_req, res) => {
  if (!auth?.demoEnabled) return res.status(404).json({ error: "demo_off", message: "The demo account is not set up." });
  res.json({ session: await auth.demoSession() });
});

app.get("/api/me", requireUser, async (req, res) => {
  const business = await db.getBusinessByOwner(req.user.id);
  res.json({ email: req.user.email, demo: auth.isDemo(req.user), business: business && publicBusiness(business) });
});

// For an owner whose account exists without a business (or the demo owner on a fresh database).
app.post("/api/me/business", requireUser, limitWrites, async (req, res) => {
  const input = NewBusinessInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: "bad_request", message: "Enter a business name." });
  const business = await createBusinessFor(req.user, input.data.config);
  res.status(201).json({ business: publicBusiness(business) });
});

// ---- Businesses and bookings ----

const api = express.Router();

api.param("slug", (req, res, next, value) => {
  const slug = Slug.safeParse(value);
  if (!slug.success) return res.status(404).json({ error: "not_found", message: "No such business." });
  req.slug = slug.data;
  next();
});

api.get("/:slug", async (req, res) => {
  const business = await db.getBusiness(req.slug);
  if (!business) return res.status(404).json({ error: "not_found", message: "No such business." });
  res.json({ business: publicBusiness(business) });
});

api.put("/:slug", limitWrites, requireOwner, async (req, res) => {
  const config = BusinessConfig.safeParse(req.body?.config);
  if (!config.success) {
    return res.status(400).json({ error: "bad_request", message: "Check the prices: every amount must be a number." });
  }
  await db.saveBusiness({ slug: req.slug, name: config.data.businessName, industry: config.data.id, config: config.data });
  res.json({ ok: true });
});

// Owner only: the list includes customer emails.
api.get("/:slug/bookings", requireOwner, async (req, res) => {
  res.json({ bookings: await db.listBookings(req.slug) });
});

api.post("/:slug/bookings", limitWrites, async (req, res) => {
  const input = BookingInput.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "bad_request", message: "Some booking details are missing or invalid." });
  }
  if (req.slug !== DEMO_SLUG && !(await db.getBusiness(req.slug))) {
    return res.status(404).json({ error: "not_found", message: "No such business." });
  }
  const { booking, created } = await db.insertBooking(req.slug, input.data);
  if (created) notify(req.slug, "bookings");
  res.status(created ? 201 : 200).json({ booking });
});

// Carries no data, only "something changed", so it stays public (EventSource cannot send a token).
api.get("/:slug/events", (req, res) => {
  const set = streams.get(req.slug) || new Set();
  if (set.size >= MAX_STREAMS_PER_SLUG) return res.status(503).end();
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  set.add(res);
  streams.set(req.slug, set);
  const ping = setInterval(() => res.write(": ping\n\n"), 25_000); // keeps proxies from closing it
  req.on("close", () => {
    clearInterval(ping);
    set.delete(res);
    if (set.size === 0) streams.delete(req.slug);
  });
});

app.use("/api/businesses", api);

app.use("/api", (_req, res) => res.status(404).json({ error: "not_found", message: "Unknown API route." }));

// Errors from the routes above (Express 5 forwards rejected promises here).
app.use((err, _req, res, _next) => {
  console.error("[api] failed:", err?.code || "", err?.message || err);
  const status = err?.status || (err?.type === "entity.too.large" ? 413 : 500);
  res
    .status(status)
    .json({ error: "server_error", message: status === 500 ? "Something went wrong. Please try again." : err.message });
});

// Static app + SPA fallback (only when a build exists).
app.use(express.static(distDir));
app.get(/^(?!\/api\/).*/, (_req, res, next) => {
  res.sendFile(path.join(distDir, "index.html"), (err) => err && next());
});

app.listen(PORT, async () => {
  console.log(`QuoteFlow server on http://localhost:${PORT} (AI ${aiConfigured() ? "on" : "off"}, model ${AI_MODEL})`);
  try {
    await db.check();
    console.log(
      `[storage] ${db.kind}` +
        (db.kind === "memory" ? " (resets on restart; set SUPABASE_URL and SUPABASE_SECRET_KEY to keep data)" : " connected")
    );
  } catch (err) {
    console.error(`[storage] ${db.kind} check failed:`, err?.code || "", err?.message || err);
  }
  if (!auth) {
    console.log("[auth] off (set SUPABASE_PUBLISHABLE_KEY with Supabase to require owner sign-in)");
    return;
  }
  try {
    if (auth.demoEnabled) {
      const id = await auth.ensureDemoOwner();
      if (await db.getBusiness(DEMO_SLUG)) await db.setOwner(DEMO_SLUG, id);
    }
    console.log("[auth] on, demo account " + (auth.demoEnabled ? "ready" : "off (set DEMO_OWNER_PASSWORD)"));
  } catch (err) {
    console.error("[auth] demo account setup failed:", err?.code || "", err?.message || err);
  }
});
