import GlobalApi from "./global.api";

export interface CryptoAnalysis {
  id: number;
  analyzed_at: string;
  coin: string;
  timeframe: string;

  trend: string | null;
  trend_reason: string | null;

  recommendation: string | null;
  recommendation_reason: string | null;
  entry_price: string | null;
  stop_loss: string | null;
  stop_loss_note: string | null;
  target_1: string | null;
  target_2: string | null;

  resistance_1: string | null;
  resistance_1_note: string | null;
  resistance_2: string | null;
  resistance_2_note: string | null;
  support_1: string | null;
  support_1_note: string | null;
  support_2: string | null;
  support_2_note: string | null;

  rsi: string | null;
  atr: string | null;

  ema_note: string | null;
  macd_note: string | null;
  bollinger_note: string | null;
  volume_note: string | null;
  risk_note: string | null;

  raw_text: string;
}

export interface CryptoAnalysisInput {
  analyzed_at: string;
  coin: string;
  timeframe: string;

  trend?: string;
  trend_reason?: string;

  recommendation?: string;
  recommendation_reason?: string;
  entry_price?: string;
  stop_loss?: string;
  stop_loss_note?: string;
  target_1?: string;
  target_2?: string;

  resistance_1?: string;
  resistance_1_note?: string;
  resistance_2?: string;
  resistance_2_note?: string;
  support_1?: string;
  support_1_note?: string;
  support_2?: string;
  support_2_note?: string;

  rsi?: string;
  atr?: string;

  ema_note?: string;
  macd_note?: string;
  bollinger_note?: string;
  volume_note?: string;
  risk_note?: string;

  raw_text: string;
}

export default class CryptoAnalysisService {
  globalApi = new GlobalApi();

  async save(payload: CryptoAnalysisInput): Promise<CryptoAnalysis> {
    const res = await this.globalApi.authPostJson(
      "crypto-analysis/save",
      payload,
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "บันทึกไม่สำเร็จ");
    }
    const json = await res.json();
    return json.data;
  }

  async list(params?: {
    timeframe?: string;
    coin?: string;
  }): Promise<CryptoAnalysis[]> {
    const qs = new URLSearchParams();
    if (params?.timeframe) qs.set("timeframe", params.timeframe);
    if (params?.coin) qs.set("coin", params.coin);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const res = await this.globalApi.authGet(`crypto-analysis/list${suffix}`);
    if (!res.ok) throw new Error("ดึงข้อมูลไม่สำเร็จ");
    return res.json();
  }

  async getFilters(): Promise<{ timeframes: string[]; coins: string[] }> {
    const res = await this.globalApi.authGet("crypto-analysis/filters");
    if (!res.ok) throw new Error("ดึงตัวกรองไม่สำเร็จ");
    return res.json();
  }

  async remove(id: number): Promise<void> {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${(this.globalApi as any).baseUrl ?? "http://localhost:3000"}/crypto-analysis/${id}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!res.ok) throw new Error("ลบไม่สำเร็จ");
  }
}

// ---------- Parser ----------

function toIsoFromThaiDate(s: string): string | null {
  // "19/5/2569 21:02:35"  → ISO
  const m = s.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return null;
  let [, dd, mm, yyyy, hh, mi, ss] = m;
  let year = Number(yyyy);
  if (year > 2400) year -= 543;
  const d = new Date(
    year,
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(mi),
    Number(ss ?? "0"),
  );
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function pickNumber(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  return m ? m[0].replace(",", "") : null;
}

export interface ParseResult {
  ok: boolean;
  errors: string[];
  data: CryptoAnalysisInput | null;
}

export function parseAnalysisText(text: string): ParseResult {
  const errors: string[] = [];
  const t = text.replace(/\r\n/g, "\n");

  const dateRaw = firstMatch(t, /วิเคราะห์ที่เวลา\s*[:：]\s*([^\n]+)/);
  const analyzed_at = dateRaw ? toIsoFromThaiDate(dateRaw) : null;
  if (!analyzed_at) errors.push("ไม่พบวันที่วิเคราะห์ (วิเคราะห์ที่เวลา)");

  const coin = firstMatch(t, /เหรียญ\s*[:：]\s*([^\n]+)/);
  if (!coin) errors.push("ไม่พบเหรียญ");

  const timeframe = firstMatch(t, /timeframe\s*[:：]\s*([^\n]+)/i);
  if (!timeframe) errors.push("ไม่พบ timeframe");

  // Trend block: "BEARISH - เหตุผล: ..."
  const trendLine =
    firstMatch(t, /สรุปแนวโน้ม\s*\n+\s*([^\n]+)/) ||
    firstMatch(t, /แนวโน้ม\s*[:：]?\s*([A-Z]+\s*-\s*เหตุผล[^\n]+)/);
  let trend: string | undefined;
  let trend_reason: string | undefined;
  if (trendLine) {
    const m = trendLine.match(/^([A-Z]+)\s*-\s*เหตุผล\s*[:：]\s*(.+)$/);
    if (m) {
      trend = m[1];
      trend_reason = m[2].trim();
    } else {
      trend = trendLine.split(/\s+/)[0];
    }
  }

  // Indicators
  const ema_note = firstMatch(t, /EMA[^:：]*[:：]\s*([^\n]+)/);
  const macd_note = firstMatch(t, /MACD\s*[:：]\s*([^\n]+)/);
  const bollinger_note = firstMatch(t, /Bollinger\s*Bands\s*[:：]\s*([^\n]+)/i);
  const volume_note = firstMatch(t, /Volume\s*[:：]\s*([^\n]+)/i);

  const rsiLine = firstMatch(t, /RSI[^:：\n]*[:：]\s*([^\n]+)/);
  const rsi = rsiLine ? pickNumber(rsiLine) : null;

  // Support / Resistance
  const r1Line = firstMatch(t, /แนวต้านที่\s*1\s*[:：]\s*([^\n]+)/);
  const r2Line = firstMatch(t, /แนวต้านที่\s*2\s*[:：]\s*([^\n]+)/);
  const s1Line = firstMatch(t, /แนวรับที่\s*1\s*[:：]\s*([^\n]+)/);
  const s2Line = firstMatch(t, /แนวรับที่\s*2\s*[:：]\s*([^\n]+)/);

  // Recommendation
  const recLine = firstMatch(t, /แนวทาง\s*[:：]\s*([^\n]+)/);
  let recommendation: string | undefined;
  let recommendation_reason: string | undefined;
  if (recLine) {
    const m = recLine.match(/^([A-Za-zก-๙]+)\s*-\s*เหตุผล\s*[:：]\s*(.+)$/);
    if (m) {
      recommendation = m[1];
      recommendation_reason = m[2].trim();
    } else {
      recommendation = recLine.split(/\s+/)[0];
    }
  }

  const entryLine = firstMatch(t, /จุด\s*Entry[^:：]*[:：]\s*([^\n]+)/i);
  const slLine = firstMatch(t, /Stop\s*Loss[^:：]*[:：]\s*([^\n]+)/i);
  const t1Line = firstMatch(t, /Target\s*ที่\s*1\s*[:：]\s*([^\n]+)/i);
  const t2Line = firstMatch(t, /Target\s*ที่\s*2\s*[:：]\s*([^\n]+)/i);

  // ATR (from risk section)
  const atrLine = firstMatch(t, /ATR\s*([0-9.,]+)/i);

  // Risk: take entire ⚠️ section
  const riskSection = t.match(/⚠️[^\n]*\n([\s\S]+)$/);
  const risk_note = riskSection ? riskSection[1].trim() : undefined;

  const data: CryptoAnalysisInput | null =
    analyzed_at && coin && timeframe
      ? {
          analyzed_at,
          coin: coin.trim(),
          timeframe: timeframe.trim(),
          trend,
          trend_reason,
          recommendation,
          recommendation_reason,
          entry_price: pickNumber(entryLine) ?? undefined,
          stop_loss: pickNumber(slLine) ?? undefined,
          stop_loss_note: slLine?.trim(),
          target_1: pickNumber(t1Line) ?? undefined,
          target_2: pickNumber(t2Line) ?? undefined,
          resistance_1: pickNumber(r1Line) ?? undefined,
          resistance_1_note: r1Line?.trim(),
          resistance_2: pickNumber(r2Line) ?? undefined,
          resistance_2_note: r2Line?.trim(),
          support_1: pickNumber(s1Line) ?? undefined,
          support_1_note: s1Line?.trim(),
          support_2: pickNumber(s2Line) ?? undefined,
          support_2_note: s2Line?.trim(),
          rsi: rsi ?? undefined,
          atr: atrLine ? atrLine.replace(",", "") : undefined,
          ema_note: ema_note ?? undefined,
          macd_note: macd_note ?? undefined,
          bollinger_note: bollinger_note ?? undefined,
          volume_note: volume_note ?? undefined,
          risk_note,
          raw_text: text,
        }
      : null;

  return { ok: errors.length === 0 && data !== null, errors, data };
}
