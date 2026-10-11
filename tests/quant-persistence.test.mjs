import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchDailyPrices, getStoredPrices, listStoredPrices, getQuantRun, listQuantRuns, saveQuantRun } from "../src/services/market-data.service.ts";

function login(context, token = "test-session") {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => token } });
  context.after(() => { if (original) Object.defineProperty(globalThis, "localStorage", original); else delete globalThis.localStorage; });
}

test("market data goes through authenticated backend and can use DB without an API key", async (context) => {
  login(context);
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).pathname, "/quant/market-data");
    assert.equal(options.headers.Authorization, "Bearer test-session");
    assert.deepEqual(JSON.parse(options.body), { symbol: "SPY", count: 504, refresh: false });
    assert.equal(options.method, "POST");
    return Response.json({ data: { snapshotId: "snapshot-a", source: "cache" } });
  });
  assert.equal((await fetchDailyPrices("SPY", "", 504)).source, "cache");
});

test("API key is sent only in the backend request body, never the URL", async (context) => {
  login(context);
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(!url.includes("test-provider-key"));
    assert.equal(JSON.parse(options.body).apiKey, "test-provider-key");
    assert.equal(JSON.parse(options.body).refresh, true);
    return Response.json({ data: { snapshotId: "snapshot-a" } });
  });
  await fetchDailyPrices("SPY", "test-provider-key", 504, undefined, true);
});

test("a pair can reopen two saved ticker series without provider requests", async (context) => {
  login(context);
  const paths = [];
  context.mock.method(globalThis, "fetch", async (url, options) => {
    paths.push(new URL(url).pathname);
    assert.equal(options.method, "GET");
    assert.equal(options.body, undefined);
    return Response.json({ data: paths.length === 1 ? [{ snapshotId: "a", symbol: "CWEN" }] : { snapshotId: paths.at(-1).split("/").at(-1), source: "saved" } });
  });
  assert.equal((await listStoredPrices())[0].symbol, "CWEN");
  assert.equal((await getStoredPrices("a")).source, "saved");
  assert.equal((await getStoredPrices("b")).source, "saved");
  assert.deepEqual(paths, ["/quant/market-data", "/quant/market-data/a", "/quant/market-data/b"]);
});

test("save sends snapshot references and settings, not client-calculated profit", async (context) => {
  login(context);
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).pathname, "/quant/runs");
    assert.deepEqual(JSON.parse(options.body), { snapshotA: "a", snapshotB: "b", settings: { entryZ: 2 }, name: "Study" });
    return Response.json({ data: { id: "run", engineVersion: "1.0.0" } }, { status: 201 });
  });
  assert.equal((await saveQuantRun({ snapshotId: "a" }, { snapshotId: "b" }, { entryZ: 2 }, "Study")).id, "run");
});

test("history and saved report reopen through authenticated GET without a provider key", async (context) => {
  login(context);
  const paths = [];
  context.mock.method(globalThis, "fetch", async (url, options) => {
    paths.push(new URL(url).pathname);
    assert.equal(options.method, "GET"); assert.equal(options.body, undefined);
    return Response.json({ data: paths.length === 1 ? [{ id: "saved" }] : { id: "saved", result: { saved: true } } });
  });
  assert.equal((await listQuantRuns())[0].id, "saved");
  assert.equal((await getQuantRun("saved")).result.saved, true);
  assert.deepEqual(paths, ["/quant/runs", "/quant/runs/saved"]);
});

test("storage failures are visible and do not fall back to an unpersisted provider response", async (context) => {
  login(context);
  let requests = 0;
  context.mock.method(globalThis, "fetch", async () => { requests++; return Response.json({ error: "Database unavailable" }, { status: 500 }); });
  await assert.rejects(fetchDailyPrices("SPY", "key", 504), /Database unavailable/);
  assert.equal(requests, 1);
});

test("no session stops before network access", async (context) => {
  login(context, null);
  const fetchMock = context.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected network call"); });
  await assert.rejects(listQuantRuns(), /เข้าสู่ระบบ/);
  assert.equal(fetchMock.mock.callCount(), 0);
});
