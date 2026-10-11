import type { PriceSeries } from "./twelve-data.ts";
import type { QuantSettings, analyzePair } from "./quant-analysis.ts";
export { normalizeSymbol } from "./twelve-data.ts";
export type { PriceBar, PriceSeries } from "./twelve-data.ts";

export interface StoredPriceSeries extends PriceSeries {
  snapshotId: string;
  source: "cache" | "provider" | "saved";
  requestedCount: number;
  cutoff: string;
}

export interface StoredPriceSummary {
  snapshotId: string;
  symbol: string;
  exchange: string;
  currency: string;
  requestedCount: number;
  rowCount: number;
  cutoff: string;
  fetchedAt: string;
}

export interface SavedQuantRunSummary {
  id: string;
  name: string;
  symbolA: string;
  symbolB: string;
  createdAt: string;
  engineVersion: string;
  netReturn: number;
  tradeCount: number;
}

export interface SavedQuantRun extends SavedQuantRunSummary {
  a: StoredPriceSeries;
  b: StoredPriceSeries;
  settings: QuantSettings;
  result: ReturnType<typeof analyzePair>;
}

const baseUrl = (import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน Quant Lab");
  try {
    const response = await fetch(`${baseUrl}/quant${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(40_000)]) : AbortSignal.timeout(40_000),
      credentials: "omit", cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error("เซสชันหมดอายุหรือไม่มีสิทธิ์ กรุณาเข้าสู่ระบบใหม่");
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Quant API ตอบกลับ HTTP ${response.status}`);
    return payload.data as T;
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (error instanceof TypeError) throw new Error("เชื่อมต่อ Quant API ไม่สำเร็จ ตรวจสอบ backend และการเชื่อมต่อ");
    if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("Quant API ใช้เวลาตอบนานเกินไป กรุณาลองใหม่");
    throw error;
  }
}

export function fetchDailyPrices(symbol: string, apiKey: string, count: number, signal?: AbortSignal, refresh = false) {
  return request<StoredPriceSeries>("/market-data", { symbol, count, refresh, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }, signal);
}

export function listStoredPrices(signal?: AbortSignal) {
  return request<StoredPriceSummary[]>("/market-data", undefined, signal);
}

export function getStoredPrices(id: string, signal?: AbortSignal) {
  return request<StoredPriceSeries>(`/market-data/${encodeURIComponent(id)}`, undefined, signal);
}

export function listQuantRuns(signal?: AbortSignal) {
  return request<SavedQuantRunSummary[]>("/runs", undefined, signal);
}

export function getQuantRun(id: string, signal?: AbortSignal) {
  return request<SavedQuantRun>(`/runs/${encodeURIComponent(id)}`, undefined, signal);
}

export function saveQuantRun(a: StoredPriceSeries, b: StoredPriceSeries, settings: QuantSettings, name: string, signal?: AbortSignal) {
  return request<SavedQuantRun>("/runs", { snapshotA: a.snapshotId, snapshotB: b.snapshotId, settings, name }, signal);
}
