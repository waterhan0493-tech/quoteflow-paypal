// QuoteFlow server: serves the built app (dist/) and the /api routes.
// Local dev: `npm run server` next to `npm run dev` (Vite proxies /api here).
// Production (Render): `npm run build && npm start`.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AiQuoteRequest, aiConfigured, suggestQuote, AI_MODEL } from "./aiQuote.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");
const PORT = Number(process.env.PORT) || 8787;

// Cost guards. In-memory is enough for a single small instance.
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT) || 300;
const PER_IP_PER_MINUTE = 8;
let day = new Date().toISOString().slice(0, 10);
let usedToday = 0;
const ipHits = new Map();

function underLimits(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    usedToday = 0;
  }
  if (usedToday >= DAILY_LIMIT) return "daily";
  const now = Date.now();
  const recent = (ipHits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= PER_IP_PER_MINUTE) return "ip";
  recent.push(now);
  ipHits.set(ip, recent);
  usedToday += 1;
  return null;
}

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for req.ip
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiConfigured(), model: AI_MODEL });
});

app.post("/api/ai-quote", async (req, res) => {
  const input = AiQuoteRequest.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "bad_request", message: "Describe the job in 3 to 600 characters." });
  }
  if (!aiConfigured()) {
    return res.status(503).json({ error: "ai_unavailable", message: "The AI assistant is offline right now." });
  }
  const limited = underLimits(req.ip || "unknown");
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

// Static app + SPA fallback (only when a build exists).
app.use(express.static(distDir));
app.get(/^(?!\/api\/).*/, (_req, res, next) => {
  res.sendFile(path.join(distDir, "index.html"), (err) => err && next());
});

app.listen(PORT, () => {
  console.log(`QuoteFlow server on http://localhost:${PORT} (AI ${aiConfigured() ? "on" : "off"}, model ${AI_MODEL})`);
});
