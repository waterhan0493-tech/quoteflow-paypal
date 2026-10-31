# QuoteFlow + PayPal

Instant quotes, AI-assisted estimates, and PayPal deposits for local service businesses (cleaning, landscaping, wedding photography).

> Work in progress for the PayPal AI Hackathon 2026.

## Problem

_TODO_

## Features

- _TODO: PayPal sandbox deposit at booking_
- _TODO: AI quote assistant_

## Run locally

Requires Node.js 22.9 or newer.

```sh
npm install
cp .env.example .env    # optional: fill in keys (see below)
npm run server          # API on http://localhost:8787
npm run dev             # app on http://localhost:5173 (proxies /api to the server)
```

Every key is optional. Without one, that part runs in a local fallback:

| Variable | Without it |
|---|---|
| `VITE_PAYPAL_CLIENT_ID` | A demo deposit button instead of PayPal |
| `ANTHROPIC_API_KEY` | The AI quote box says it is offline |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Bookings live in server memory and reset on restart |
| `SUPABASE_PUBLISHABLE_KEY` | The dashboard opens without sign-in |
| `DEMO_OWNER_PASSWORD` | No "Use the demo account" button |

To keep data in Supabase, create a project and run [`supabase/schema.sql`](supabase/schema.sql) once in its SQL Editor (run it again after pulling schema changes; it is safe to repeat).

With sign-in on, `/dashboard` asks owners to sign in or create an account. A new account gets its own booking page at `/b/<business-name>`.

Pages: `/` overview, `/b/sparkle-co` customer booking page, `/dashboard` owner dashboard.

## Testing with the PayPal sandbox

_TODO: sandbox buyer account and steps_

## What changed since October 1, 2026

_TODO_

## License

[MIT](LICENSE)
