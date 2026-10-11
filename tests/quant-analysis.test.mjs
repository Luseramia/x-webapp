import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moments, fitLine, correlation, rollingStats, analyzePair, backtestPair, alignSeries, adfLagOne, criticalValue5, DEFAULT_QUANT_SETTINGS } from "../src/services/quant-analysis.ts";
import { latestCompletedDate, normalizeSymbol, parseTimeSeries, fetchDailyPrices } from "../src/services/twelve-data.ts";

const closeTo = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
const series = (symbol, bars) => ({ symbol, currency: "USD", exchange: "NASDAQ", bars, fetchedAt: "2026-01-01T00:00:00Z" });
const bar = (date, close, open = close) => ({ date, open, close });

export function syntheticPair() {
  let seed = 42, b = 100, residual = 0;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 2 ** 32 - 0.5; };
  const aBars = [], bBars = [];
  for (let i = 0; i < 300; i += 1) {
    b += 0.03 + random() * 3;
    residual = 0.72 * residual + random() * 4;
    const a = 12 + 1.4 * b + residual;
    const date = new Date(Date.UTC(2024, 0, i + 1)).toISOString().slice(0, 10);
    aBars.push(bar(date, a, i ? aBars[i - 1].close : a));
    bBars.push(bar(date, b, i ? bBars[i - 1].close : b));
  }
  return [series("AAA", aBars), series("BBB", bBars)];
}

test("sample SD, regression and undefined correlation use known values", () => {
  assert.deepEqual(moments([2, 4, 4, 4, 5, 5, 7, 9]), { mean: 5, sd: Math.sqrt(32 / 7) });
  assert.deepEqual(fitLine([1, 2, 3], [5, 7, 9]), { alpha: 3, beta: 2 });
  closeTo(correlation([1, 2, 3], [9, 7, 5]), -1);
  assert.equal(correlation([1, 1, 1], [1, 2, 3]), null);
  assert.throws(() => moments([1, NaN]));
  assert.throws(() => fitLine([2, 2, 2], [1, 2, 3]));
});

test("rolling baseline excludes today's spike and handles zero SD", () => {
  const points = rollingStats([1, 2, 3, 100], 3);
  assert.deepEqual(points[0], { mean: null, sd: null, z: null });
  assert.deepEqual(points[3], { mean: 2, sd: 1, z: 98 });
  assert.equal(rollingStats([5, 5, 5, 9], 3)[3].z, null);
  assert.equal(adfLagOne(Array(80).fill(5), false), null);
});

test("align by date, never position or forward-filled prices", () => {
  const a = series("A", [bar("2025-01-01", 10), bar("2025-01-02", 20)]);
  const b = series("B", [bar("2025-01-02", 30), bar("2025-01-03", 40)]);
  const aligned = alignSeries(a, b);
  assert.equal(aligned.rows.length, 1);
  assert.equal(aligned.rows[0].date, "2025-01-02");
  assert.equal(aligned.rows[0].b.close, 30);
  assert.equal(aligned.droppedA, 1); assert.equal(aligned.droppedB, 1);
  assert.throws(() => alignSeries(a, a));
  assert.throws(() => alignSeries(a, { ...b, currency: "EUR" }));
});

test("next-open execution, both legs, round-trip fees, borrow over a weekend", () => {
  const rows = ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-06", "2025-01-07"].map((date, i) => ({
    date, a: bar(date, i >= 3 ? 110 : 100), b: bar(date, 50),
  }));
  const settings = { ...DEFAULT_QUANT_SETTINGS, capital: 1000, feeBps: 50, slippageBps: 50, borrowPercent: 36.5 };
  const result = backtestPair(rows, [0, -2.5, 0, 0, 0], 2, 1, settings, true);
  assert.equal(result.trades.length, 1);
  const trade = result.trades[0];
  assert.equal(trade.entryDate, "2025-01-03");
  assert.equal(trade.exitDate, "2025-01-06");
  assert.equal(trade.direction, "Long spread");
  // 5 long A and 10 short B: gross profit 50; fees 10 + 10.5; borrow 500 * .365 * 3/365 = 1.5.
  closeTo(trade.pnl, 28); closeTo(trade.costs, 22);
  closeTo(result.netReturn, 0.028); closeTo(result.equity.at(-1).value, 1028);
  closeTo(result.drawdown, 0.01);
});

test("short spread profits when A falls; positions liquidate at end of data", () => {
  const rows = Array.from({ length: 5 }, (_, i) => {
    const date = `2025-01-0${i + 1}`;
    return { date, a: bar(date, i === 4 ? 90 : 100, 100), b: bar(date, 50) };
  });
  const settings = { ...DEFAULT_QUANT_SETTINGS, capital: 1000, feeBps: 0, slippageBps: 0, borrowPercent: 0 };
  const result = backtestPair(rows, [0, 2.5, 2.5, 2.5, 2.5], 2, 1, settings, true);
  assert.equal(result.trades[0].direction, "Short spread");
  assert.equal(result.trades[0].reason, "สิ้นสุดข้อมูล");
  closeTo(result.trades[0].pnl, 50);
  closeTo(result.equity.at(-1).value, 1050);
});

test("a disabled pair produces no trades and undefined Sharpe/win rate", () => {
  const [a, b] = syntheticPair();
  const { rows } = alignSeries(a, b);
  const result = backtestPair(rows, rows.map(() => 2.5), 1, 180, DEFAULT_QUANT_SETTINGS, false);
  assert.equal(result.trades.length, 0); assert.equal(result.sharpe, null); assert.equal(result.winRate, null);
  assert.equal(result.netReturn, 0); assert.equal(result.drawdown, 0);
});

test("future prices cannot change formation estimates or earlier signals/equity", () => {
  const [a, b] = syntheticPair();
  const settings = { ...DEFAULT_QUANT_SETTINGS, requireCointegration: false };
  const original = analyzePair(a, b, settings);
  const changed = { ...a, bars: a.bars.map((row, i) => i < 260 ? row : { ...row, close: row.close * 2, open: row.open * 2 }) };
  const rerun = analyzePair(changed, b, settings);
  assert.equal(original.beta, rerun.beta); assert.equal(original.alpha, rerun.alpha);
  assert.equal(original.testStatistic, rerun.testStatistic);
  assert.deepEqual(original.rolling.slice(0, 260), rerun.rolling.slice(0, 260));
  assert.deepEqual(original.backtest.equity.slice(0, 80), rerun.backtest.equity.slice(0, 80));
});

test("invalid thresholds and insufficient history cannot generate reports", () => {
  const [a, b] = syntheticPair();
  assert.throws(() => analyzePair(a, b, { ...DEFAULT_QUANT_SETTINGS, exitZ: 2 }));
  assert.throws(() => analyzePair(a, b, { ...DEFAULT_QUANT_SETTINGS, capital: NaN }));
  assert.throws(() => analyzePair(a, b, { ...DEFAULT_QUANT_SETTINGS, lookback: 252 }));
  assert.throws(() => analyzePair({ ...a, bars: a.bars.slice(0, 60) }, b, DEFAULT_QUANT_SETTINGS));
});

test("New York session cutoff handles UTC midnight and daylight saving time", () => {
  assert.equal(latestCompletedDate(new Date("2026-01-06T01:00:00Z")), "2026-01-04");
  assert.equal(latestCompletedDate(new Date("2026-07-06T05:00:00Z")), "2026-07-05");
  assert.equal(normalizeSymbol(" brk.b "), "BRK.B");
  assert.throws(() => normalizeSymbol("AAPL&apikey=bad"));
});

const apiPayload = () => ({ status: "ok", meta: { symbol: "AAPL", currency: "USD", exchange: "NASDAQ", exchange_timezone: "America/New_York" },
  values: Array.from({ length: 65 }, (_, i) => ({ datetime: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), open: "100", close: String(101 + i) })).reverse() });

test("provider parser sorts, excludes unclosed sessions, rejects duplicates and invalid values", () => {
  const payload = apiPayload();
  const parsed = parseTimeSeries(payload, "AAPL", "2025-03-03");
  assert.equal(parsed.bars.length, 62); assert.equal(parsed.bars[0].date, "2025-01-01");
  assert.equal(parsed.bars.at(-1).date, "2025-03-03");
  assert.throws(() => parseTimeSeries({ ...payload, values: [...payload.values, payload.values[0]] }, "AAPL", "2026-01-01"));
  assert.throws(() => parseTimeSeries({ ...payload, values: [{ datetime: "2025-02-31", open: 100, close: 100 }, ...payload.values] }, "AAPL", "2026-01-01"));
  assert.throws(() => parseTimeSeries({ ...payload, meta: { ...payload.meta, currency: "EUR" } }, "AAPL", "2026-01-01"));
  assert.throws(() => parseTimeSeries({ ...payload, values: [{ ...payload.values[0], close: "NaN" }] }, "AAPL", "2026-01-01"));
  assert.throws(() => parseTimeSeries({ code: 429, status: "error" }, "AAPL", "2026-01-01"), /โควตา/);
});

test("HTTP adapter requests adjusted daily US prices and protects against rate-limit responses", async (context) => {
  context.mock.method(globalThis, "fetch", async (url, options) => {
    const params = new URL(url).searchParams;
    assert.equal(params.get("symbol"), "AAPL"); assert.equal(params.get("adjust"), "all");
    assert.equal(params.get("interval"), "1day"); assert.equal(params.get("country"), "United States");
    assert.equal(options.credentials, "omit");
    return new Response(JSON.stringify(apiPayload()), { status: 200 });
  });
  assert.equal((await fetchDailyPrices("aapl", "test-only-key", 252)).bars.length, 65);
  context.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 429 }));
  await assert.rejects(fetchDailyPrices("AAPL", "test-only-key", 252), /โควตา/);
  await assert.rejects(fetchDailyPrices("AAPL", "", 252), /API key/);
});

test("statistics match independent statsmodels reference values", () => {
  const expected = JSON.parse(readFileSync(new URL("./fixtures/quant-statsmodels.json", import.meta.url), "utf8"));
  const [a, b] = syntheticPair();
  const result = analyzePair(a, b, DEFAULT_QUANT_SETTINGS);
  closeTo(result.alpha, expected.alpha, 1e-8); closeTo(result.beta, expected.beta, 1e-10);
  closeTo(result.testStatistic, expected.cointStatistic, 1e-8);
  closeTo(result.critical, expected.cointCritical5, 1e-10);
  closeTo(result.integrationA.level, expected.adfLevelA, 1e-8);
  closeTo(result.integrationB.difference, expected.adfDifferenceB, 1e-8);
  closeTo(result.halfLife, expected.halfLife, 1e-8);
  closeTo(criticalValue5(178, false), expected.adfCritical5, 1e-10);
});
