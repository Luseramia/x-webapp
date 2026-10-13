export interface ExchangeRateSnapshot {
  base: "USD";
  quote: "THB";
  rate: number;
  date: string;
}

export async function fetchUsdToThbRate(signal?: AbortSignal): Promise<ExchangeRateSnapshot> {
  try {
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000);
    const response = await fetch("https://api.frankfurter.dev/v2/rate/usd/thb", {
      signal: requestSignal,
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`โหลดอัตรา USD/THB ไม่สำเร็จ (HTTP ${response.status})`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new Error("รูปแบบอัตราแลกเปลี่ยนไม่ถูกต้อง");
    const data = payload as Record<string, unknown>;
    const rate = Number(data.rate);
    const date = String(data.date ?? "");
    if (data.base !== "USD" || data.quote !== "THB" || !Number.isFinite(rate) || rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("ได้รับอัตรา USD/THB ที่ไม่ถูกต้อง");
    }
    return { base: "USD", quote: "THB", rate, date };
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("โหลดอัตราแลกเปลี่ยนใช้เวลานานเกินไป");
    }
    if (error instanceof TypeError) throw new Error("เชื่อมต่อบริการอัตราแลกเปลี่ยนไม่ได้");
    throw error;
  }
}
