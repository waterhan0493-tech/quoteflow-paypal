import assert from "node:assert/strict";
import { test } from "node:test";
import { runAgent, runTool } from "./agent.mjs";
import { INITIAL_PRESETS, depositCustomId, quoteFor } from "./pricing.mjs";

const config = INITIAL_PRESETS.cleaning;
const today = "2026-11-10";
const ctx = { config, today, createOrder: null };
const job = { size: 1800, addOnIds: [], frequency: "once", date: "2026-11-15" };
const person = { arrivalWindow: "1:00 – 3:00 PM", customerName: "Ann Lee", customerEmail: "ann@example.com" };

test("the price comes from the server rules", async () => {
  const { result } = await runTool("quote_job", job, ctx);
  assert.equal(result.total, quoteFor(config, { ...job, urgency: "standard" }).total);
  assert.equal(result.urgency, "standard");
});

test("a job can be priced before a date is chosen", async () => {
  const { date: _date, ...noDate } = job;
  const { result } = await runTool("quote_job", noDate, ctx);
  assert.equal(result.urgency, "standard");
  await assert.rejects(runTool("prepare_booking", { ...noDate, ...person }, ctx));
});

test("tomorrow is a rush visit, whatever the model asks for", async () => {
  const { result } = await runTool("quote_job", { ...job, date: "2026-11-11", urgency: "standard" }, ctx);
  assert.equal(result.urgency, "rush");
});

test("dates outside the bookable range are rejected", async () => {
  await assert.rejects(runTool("quote_job", { ...job, date: "2026-11-10" }, ctx));
  await assert.rejects(runTool("quote_job", { ...job, date: "2026-11-25" }, ctx));
});

test("an off-grid size lands on a size the booking route accepts", async () => {
  const { ui } = await runTool("prepare_booking", { ...job, ...person, size: 999999 }, ctx);
  assert.equal(ui.booking.selection.size, config.maxSize);
  quoteFor(config, ui.booking.selection);
});

test("unknown add-ons are not charged", async () => {
  const { result } = await runTool("quote_job", { ...job, addOnIds: ["free-money"] }, ctx);
  assert.equal(result.total, (await runTool("quote_job", job, ctx)).result.total);
});

test("the order matches what the booking route checks", async () => {
  let opened;
  const { ui } = await runTool("prepare_booking", { ...job, ...person }, {
    ...ctx,
    createOrder: async (q) => ((opened = q), { id: "ORDER1" }),
  });
  assert.equal(ui.booking.orderId, "ORDER1");
  const again = quoteFor(config, ui.booking.selection);
  assert.equal(depositCustomId("s", again), depositCustomId("s", opened));
});

test("bad details do not open an order", async () => {
  let calls = 0;
  await assert.rejects(
    runTool("prepare_booking", { ...job, ...person, customerEmail: "nope" }, { ...ctx, createOrder: async () => (calls++, {}) })
  );
  assert.equal(calls, 0);
});

test("the loop feeds tool errors back and stops at the cap", async () => {
  let calls = 0;
  const client = {
    messages: {
      create: async () => {
        calls++;
        return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t" + calls, name: "quote_job", input: {} }] };
      },
    },
  };
  const out = await runAgent({ messages: [{ role: "user", content: "hi" }], today, config, businessName: "B", createOrder: null, client });
  assert.equal(calls, 5);
  assert.match(out.reply, /booking form/);
});
