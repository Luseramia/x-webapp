import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import InvestmentService, {
  type InvestmentAssetType,
  type InvestmentCurrency,
  type InvestmentHoldingInput,
  type InvestmentHoldingRecord,
} from "../../services/investment.service";
import { getStoredPrices, listStoredPrices, type StoredPriceSummary, type StoredPriceSeries } from "../../services/market-data.service";
import { fetchUsdToThbRate, type ExchangeRateSnapshot } from "../../services/exchange-rate.service";
import "./InvestmentPortfolio.css";

interface Holding {
  id: number;
  symbol: string;
  name: string;
  type: InvestmentAssetType;
  market: string;
  quantity: number;
  totalCost: number;
  currentPrice: number;
  currency: InvestmentCurrency;
  purchaseDate: string;
  notes: string;
}

type HoldingDraft = Omit<Holding, "id" | "totalCost"> & { averageCost: string };
type QuantQuote = { price: number; date: string };
type InvestmentLike = Pick<Holding, "symbol" | "type" | "currency">;

const service = new InvestmentService();
const CURRENCIES: InvestmentCurrency[] = ["THB", "USD"];
const CURRENCY_STORAGE_KEY = "investment-portfolio-currencies";
const ASSET_TYPES: InvestmentAssetType[] = [
  "หุ้นไทย",
  "หุ้นต่างประเทศ",
  "กองทุน",
  "คริปโท",
  "ทองคำ",
  "อื่น ๆ",
];

const TYPE_COLORS: Record<InvestmentAssetType, string> = {
  หุ้นไทย: "#2a9d8f",
  หุ้นต่างประเทศ: "#3957d7",
  กองทุน: "#ee9b4f",
  คริปโท: "#8d5bd7",
  ทองคำ: "#d3a629",
  "อื่น ๆ": "#708090",
};

const emptyDraft = (): HoldingDraft => ({
  symbol: "",
  name: "",
  type: "หุ้นไทย",
  market: "SET",
  quantity: 0,
  averageCost: "",
  currentPrice: 0,
  currency: "THB",
  purchaseDate: new Date().toISOString().slice(0, 10),
  notes: "",
});

const readStoredCurrencies = (): Record<string, InvestmentCurrency> => {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, currency]) => currency === "THB" || currency === "USD"),
    ) as Record<string, InvestmentCurrency>;
  } catch {
    return {};
  }
};

const getCurrency = (record: InvestmentHoldingRecord): InvestmentCurrency =>
  record.currency === "USD" || record.currency === "THB"
    ? record.currency
    : readStoredCurrencies()[String(record.id)] ?? "THB";

const saveStoredCurrency = (id: number, currency: InvestmentCurrency) => {
  try {
    const currencies = readStoredCurrencies();
    currencies[String(id)] = currency;
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(currencies));
  } catch {
    // The API still receives the currency if browser storage is unavailable.
  }
};

const removeStoredCurrency = (id: number) => {
  try {
    const currencies = readStoredCurrencies();
    delete currencies[String(id)];
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(currencies));
  } catch {
    // There is no local fallback to remove if browser storage is unavailable.
  }
};

const mapRecord = (record: InvestmentHoldingRecord): Holding => ({
  id: record.id,
  symbol: record.symbol,
  name: record.asset_name,
  type: record.asset_type,
  market: record.market,
  quantity: Number(record.quantity),
  totalCost: Number(record.total_cost),
  currentPrice: Number(record.current_price),
  currency: getCurrency(record),
  purchaseDate: record.purchase_date,
  notes: record.notes ?? "",
});

const toPayload = (draft: HoldingDraft): InvestmentHoldingInput => ({
  symbol: draft.symbol.trim().toUpperCase(),
  asset_name: draft.name.trim(),
  asset_type: draft.type,
  market: draft.market.trim() || "ไม่ระบุ",
  quantity: draft.quantity,
  total_cost: Number(draft.averageCost) * draft.quantity,
  current_price: draft.currentPrice,
  currency: draft.currency,
  purchase_date: draft.purchaseDate,
  notes: draft.notes.trim(),
});

const formatCurrency = (value: number, currency: InvestmentCurrency, fractionDigits = 2) =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

const formatNumber = (value: number, maximumFractionDigits = 4) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits }).format(value);

const isQuantEligible = (holding: InvestmentLike) =>
  holding.currency === "USD" && (holding.type === "หุ้นต่างประเทศ" || holding.type === "กองทุน");

const quoteFor = (holding: InvestmentLike, quotes: Record<string, QuantQuote>) =>
  isQuantEligible(holding) ? quotes[holding.symbol.trim().toUpperCase()] : undefined;

const currentPriceFor = (holding: Pick<Holding, "symbol" | "type" | "currency" | "currentPrice">, quotes: Record<string, QuantQuote>) =>
  quoteFor(holding, quotes)?.price ?? holding.currentPrice;

const toThaiBaht = (amount: number, currency: InvestmentCurrency, usdToThbRate: number | null) =>
  currency === "THB" ? amount : amount * (usdToThbRate ?? 0);

const quantQuoteFromSeries = (series: StoredPriceSeries, summary: StoredPriceSummary): QuantQuote | null => {
  if (series.symbol !== summary.symbol || series.currency !== "USD" || series.snapshotId !== summary.snapshotId || !Array.isArray(series.bars)) return null;
  const latest = series.bars.reduce<(typeof series.bars)[number] | null>(
    (current, bar) => !current || bar.date > current.date ? bar : current, null,
  );
  if (!latest || !/^\d{4}-\d{2}-\d{2}$/.test(latest.date) || !Number.isFinite(latest.close) || latest.close <= 0) return null;
  return { price: latest.close, date: latest.date };
};

function InvestmentIcon({ symbol }: { symbol: string }) {
  return <span className="investment-symbol-icon">{symbol.slice(0, 2).toUpperCase()}</span>;
}

export default function InvestmentPortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<InvestmentAssetType | "ทั้งหมด">("ทั้งหมด");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<HoldingDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [quantLibrary, setQuantLibrary] = useState<StoredPriceSummary[] | null>(null);
  const [quantQuotes, setQuantQuotes] = useState<Record<string, QuantQuote>>({});
  const [quantLoading, setQuantLoading] = useState(false);
  const [quantError, setQuantError] = useState("");
  const [quantRefresh, setQuantRefresh] = useState(0);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateSnapshot | null>(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState("");
  const [exchangeRateRefresh, setExchangeRateRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    service
      .list()
      .then((records) => {
        if (!active) return;
        const nextHoldings = records.map(mapRecord);
        setHoldings(nextHoldings);
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const hasUsdHoldings = holdings.some((item) => item.currency === "USD");

  useEffect(() => {
    if (!hasUsdHoldings) {
      setExchangeRateLoading(false);
      setExchangeRateError("");
      return;
    }
    const request = new AbortController();
    setExchangeRateLoading(true);
    setExchangeRateError("");
    fetchUsdToThbRate(request.signal)
      .then((rate) => {
        if (!request.signal.aborted) setExchangeRate(rate);
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted) {
          setExchangeRateError(error instanceof Error ? error.message : "โหลดอัตราแลกเปลี่ยนไม่สำเร็จ");
        }
      })
      .finally(() => {
        if (!request.signal.aborted) setExchangeRateLoading(false);
      });
    return () => request.abort();
  }, [hasUsdHoldings, exchangeRateRefresh]);

  useEffect(() => {
    const request = new AbortController();
    setQuantLoading(true);
    setQuantError("");
    listStoredPrices(request.signal)
      .then((summaries) => {
        if (!request.signal.aborted) setQuantLibrary(summaries);
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted) {
          setQuantLibrary([]);
          setQuantQuotes({});
          setQuantError(error instanceof Error ? error.message : "โหลดคลังราคา Quant Lab ไม่สำเร็จ");
        }
      })
      .finally(() => {
        if (!request.signal.aborted) setQuantLoading(false);
      });
    return () => request.abort();
  }, [quantRefresh]);

  const quantSymbols = (() => {
    const symbols = holdings.filter(isQuantEligible).map((item) => item.symbol.trim().toUpperCase());
    if (isModalOpen && isQuantEligible(draft)) symbols.push(draft.symbol.trim().toUpperCase());
    return [...new Set(symbols.filter(Boolean))].sort().join("|");
  })();

  useEffect(() => {
    if (quantLibrary === null) return;
    const request = new AbortController();
    const symbols = new Set(quantSymbols.split("|").filter(Boolean));
    const matches = quantLibrary.filter((item) => item.currency === "USD" && symbols.has(item.symbol));
    if (!matches.length) {
      setQuantQuotes({});
      return () => request.abort();
    }
    setQuantLoading(true);
    setQuantError("");
    Promise.allSettled(matches.map((item) => getStoredPrices(item.snapshotId, request.signal)))
      .then((results) => {
        if (request.signal.aborted) return;
        const quotes: Record<string, QuantQuote> = {};
        let failed = false;
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            failed = true;
            return;
          }
          const quote = quantQuoteFromSeries(result.value, matches[index]);
          if (quote) quotes[matches[index].symbol] = quote;
          else failed = true;
        });
        setQuantQuotes(quotes);
        if (failed) setQuantError("บางรายการใน Quant Lab ไม่มีราคาที่ใช้ได้ จึงแสดงราคาที่กรอกเองแทน");
      })
      .finally(() => {
        if (!request.signal.aborted) setQuantLoading(false);
      });
    return () => request.abort();
  }, [quantLibrary, quantSymbols]);

  const draftQuote = quoteFor(draft, quantQuotes);

  const summaryReady = !hasUsdHoldings || exchangeRate !== null;
  const totals = useMemo(() => {
    const totalCost = holdings.reduce((sum, item) => sum + toThaiBaht(item.totalCost, item.currency, exchangeRate?.rate ?? null), 0);
    const marketValue = holdings.reduce((sum, item) => sum + toThaiBaht(
      item.quantity * currentPriceFor(item, quantQuotes), item.currency, exchangeRate?.rate ?? null,
    ), 0);
    const gain = marketValue - totalCost;
    return {
      totalCost,
      marketValue,
      gain,
      gainPercent: totalCost ? (gain / totalCost) * 100 : 0,
      holdingCount: holdings.length,
    };
  }, [holdings, quantQuotes, exchangeRate]);
  const summaryAmount = (amount: number) => summaryReady
    ? formatCurrency(amount, "THB")
    : exchangeRateLoading ? "กำลังโหลดอัตราแลกเปลี่ยน…" : "—";

  const filteredHoldings = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return holdings.filter((item) => {
      const matchesType = typeFilter === "ทั้งหมด" || item.type === typeFilter;
      const matchesKeyword =
        !keyword ||
        item.symbol.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.market.toLowerCase().includes(keyword);
      return matchesType && matchesKeyword;
    });
  }, [holdings, search, typeFilter]);

  const allocations = useMemo(() => {
    if (!summaryReady) return [];
    return ASSET_TYPES.map((type) => ({
      type,
      value: holdings
        .filter((item) => item.type === type)
        .reduce((sum, item) => sum + toThaiBaht(
          item.quantity * currentPriceFor(item, quantQuotes), item.currency, exchangeRate?.rate ?? null,
        ), 0),
    }))
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percentage: totals.marketValue ? (item.value / totals.marketValue) * 100 : 0,
      }));
  }, [holdings, summaryReady, exchangeRate, totals.marketValue, quantQuotes]);

  const donutBackground = useMemo(() => {
    if (!allocations.length) return "#e8ece9";
    let cursor = 0;
    const stops = allocations.map((item) => {
      const start = cursor;
      cursor += item.percentage;
      return `${TYPE_COLORS[item.type]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [allocations]);

  const chartEndY = 64 - Math.max(-1, Math.min(1, (summaryReady ? totals.gainPercent : 0) / 25)) * 42;
  const chartPath = `M20,64 C180,64 340,${chartEndY.toFixed(1)} 500,${chartEndY.toFixed(1)}`;

  const openAddModal = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setIsModalOpen(true);
  };

  const openEditModal = (holding: Holding) => {
    const { id, totalCost, ...holdingDraft } = holding;
    setEditingId(id);
    setDraft({
      ...holdingDraft,
      averageCost: holding.quantity > 0 ? String(totalCost / holding.quantity) : "",
    });
    setIsModalOpen(true);
  };

  const updateDraft = <K extends keyof HoldingDraft>(key: K, value: HoldingDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.symbol.trim() || !draft.name.trim()) {
      toast.error("กรุณากรอกชื่อสินทรัพย์และตัวย่อ");
      return;
    }
    if (draft.quantity <= 0 || Number(draft.averageCost) <= 0 || draft.currentPrice < 0 || (!draftQuote && draft.currentPrice <= 0)) {
      toast.error("จำนวน ต้นทุน และราคาที่กรอกเองต้องมากกว่า 0");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload({ ...draft, currentPrice: draft.currentPrice || draftQuote?.price || 0 });
      if (editingId !== null) {
        const updated = mapRecord(await service.update(editingId, payload));
        saveStoredCurrency(updated.id, draft.currency);
        updated.currency = draft.currency;
        setHoldings((items) => items.map((item) => (item.id === editingId ? updated : item)));
        toast.success("อัปเดตข้อมูลการลงทุนแล้ว");
      } else {
        const created = mapRecord(await service.create(payload));
        saveStoredCurrency(created.id, draft.currency);
        created.currency = draft.currency;
        setHoldings((items) => [created, ...items]);
        toast.success("เพิ่มสินทรัพย์เข้าพอร์ตแล้ว");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const removeHolding = async (holding: Holding) => {
    if (!window.confirm(`ลบ ${holding.symbol} ออกจากพอร์ตใช่หรือไม่?`)) return;
    try {
      await service.remove(holding.id);
      removeStoredCurrency(holding.id);
      setHoldings((items) => items.filter((item) => item.id !== holding.id));
      toast.success(`ลบ ${holding.symbol} แล้ว`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบข้อมูลไม่สำเร็จ");
    }
  };

  const exportCsv = () => {
    if (!holdings.length) {
      toast.error("ยังไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const header = ["ตัวย่อ", "ชื่อสินทรัพย์", "ประเภท", "ตลาด", "สกุลเงิน", "จำนวน", "ต้นทุนรวม", "ต้นทุนเฉลี่ย", "ราคาปัจจุบัน", "ที่มาของราคา", "วันที่ราคา", "มูลค่าปัจจุบัน", "กำไร/ขาดทุน", "วันที่ลงทุน", "หมายเหตุ"];
    const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = holdings.map((item) => {
      const quote = quoteFor(item, quantQuotes);
      const currentPrice = currentPriceFor(item, quantQuotes);
      const marketValue = item.quantity * currentPrice;
      return [item.symbol, item.name, item.type, item.market, item.currency, item.quantity, item.totalCost, item.totalCost / item.quantity, currentPrice, quote ? "Quant Lab" : "Manual", quote?.date ?? "", marketValue, marketValue - item.totalCost, item.purchaseDate, item.notes].map(escapeCell);
    });
    const csv = `\uFEFF${[header.map(escapeCell), ...rows].map((row) => row.join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `investment-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("ส่งออกไฟล์ CSV แล้ว");
  };

  return (
    <div className="investment-page">
      <div className="investment-shell">
        <section className="investment-hero">
          <div>
            <div className="investment-eyebrow"><span className="investment-live-dot" /> PORTFOLIO OVERVIEW</div>
            <h1>พอร์ตการลงทุนของฉัน</h1>
            <p>รวมทุกสินทรัพย์ไว้ในที่เดียว เห็นต้นทุน ผลตอบแทน และสัดส่วนพอร์ตได้ชัดเจน</p>
          </div>
          <div className="investment-hero-actions">
            <button className="investment-button secondary" type="button" onClick={exportCsv}><i className="pi pi-download" /> ส่งออก CSV</button>
            <button className="investment-button primary" type="button" onClick={openAddModal}><i className="pi pi-plus" /> เพิ่มการลงทุน</button>
          </div>
        </section>

        <section className="investment-summary-grid" aria-label="สรุปพอร์ต">
          <article className="investment-summary-card featured">
            <div className="summary-card-label">มูลค่าพอร์ตทั้งหมด (THB) <span className="summary-icon"><i className="pi pi-wallet" /></span></div>
            <strong>{summaryAmount(totals.marketValue)}</strong>
            <div className={`summary-change ${!summaryReady ? "" : totals.gain >= 0 ? "positive" : "negative"}`}>
              {summaryReady && <i className={`pi ${totals.gain >= 0 ? "pi-arrow-up-right" : "pi-arrow-down-right"}`} />}
              {summaryReady ? `${Math.abs(totals.gainPercent).toFixed(2)}% จากเงินลงทุน` : exchangeRateError || "รออัตราแลกเปลี่ยน"}
            </div>
          </article>
          <article className="investment-summary-card">
            <div className="summary-card-label">เงินลงทุนทั้งหมด (THB) <span className="summary-icon soft-blue"><i className="pi pi-credit-card" /></span></div>
            <strong>{summaryAmount(totals.totalCost)}</strong>
            <p>{totals.holdingCount} สินทรัพย์ในพอร์ต</p>
          </article>
          <article className="investment-summary-card">
            <div className="summary-card-label">กำไร / ขาดทุน (THB) <span className="summary-icon soft-green"><i className="pi pi-chart-line" /></span></div>
            <strong className={!summaryReady ? "" : totals.gain >= 0 ? "money-positive" : "money-negative"}>{summaryReady ? `${totals.gain >= 0 ? "+" : "−"}${formatCurrency(Math.abs(totals.gain), "THB")}` : "—"}</strong>
            <p>ผลตอบแทนที่ยังไม่ขาย</p>
          </article>
        </section>

        {hasUsdHoldings && <div className={`investment-fx-note ${exchangeRateError && !exchangeRate ? "error" : ""}`} role="status">
          <span>{exchangeRate
            ? `แปลงยอด USD เป็น THB ด้วยอัตรา 1 USD = ${formatNumber(exchangeRate.rate, 4)} THB ณ ${exchangeRate.date}${exchangeRateError ? " · อัปเดตไม่สำเร็จ ใช้อัตราที่โหลดไว้ล่าสุด" : ""}`
            : exchangeRateLoading ? "กำลังโหลดอัตราแลกเปลี่ยน USD/THB…" : exchangeRateError || "ยังไม่สามารถแสดงยอดรวมได้ เพราะไม่มีอัตราแลกเปลี่ยน"}</span>
          <button type="button" disabled={exchangeRateLoading} onClick={() => setExchangeRateRefresh((value) => value + 1)}>{exchangeRateLoading ? "กำลังโหลด…" : "อัปเดตอัตราแลกเปลี่ยน"}</button>
        </div>}

        <section className="investment-insights-grid">
          <article className="investment-panel portfolio-trend">
            <div className="panel-heading">
              <div><span className="section-kicker">PERFORMANCE</span><h2>ภาพรวมผลตอบแทน</h2></div>
              <span className="manual-price-note"><i className="pi pi-info-circle" /> ราคา Quant Lab เป็นราคาปิดล่าสุดที่บันทึกไว้</span>
            </div>
            <div className="trend-content">
              <div className="trend-metric">
                <span>ผลต่างจากต้นทุน</span>
                <strong className={!summaryReady ? "" : totals.gain >= 0 ? "money-positive" : "money-negative"}>{summaryReady ? `${totals.gain >= 0 ? "+" : "−"}${formatCurrency(Math.abs(totals.gain), "THB")}` : "—"}</strong>
                <em className={!summaryReady ? "" : totals.gain >= 0 ? "positive-chip" : "negative-chip"}>{summaryReady ? `${totals.gain >= 0 ? "+" : "−"}${Math.abs(totals.gainPercent).toFixed(2)}%` : "รออัตราแลกเปลี่ยน"}</em>
              </div>
              <div className={`trend-chart ${totals.gain < 0 || !summaryReady ? "negative" : ""}`} aria-label="เปรียบเทียบต้นทุนกับมูลค่าปัจจุบัน">
                <svg viewBox="0 0 520 128" role="img">
                  <defs><linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={totals.gain < 0 || !summaryReady ? "#c85050" : "#2a9d8f"} stopOpacity="0.3" /><stop offset="100%" stopColor={totals.gain < 0 || !summaryReady ? "#c85050" : "#2a9d8f"} stopOpacity="0" /></linearGradient></defs>
                  <path className="trend-area" d={`${chartPath} L500,128 L20,128 Z`} />
                  <path className="trend-line" d={chartPath} />
                  <circle cx="500" cy={chartEndY} r="5" />
                </svg>
                <div className="chart-axis"><span>ต้นทุน</span><span>มูลค่าปัจจุบัน</span></div>
              </div>
            </div>
          </article>

          <article className="investment-panel allocation-panel">
            <div className="panel-heading"><div><span className="section-kicker">ALLOCATION</span><h2>สัดส่วนพอร์ต (THB)</h2></div></div>
            {allocations.length ? (
              <div className="allocation-content">
                <div className="allocation-donut" style={{ background: donutBackground }}><div><strong>{allocations.length}</strong><span>ประเภท</span></div></div>
                <div className="allocation-list">
                  {allocations.map((item) => <div className="allocation-row" key={item.type}><span className="allocation-dot" style={{ background: TYPE_COLORS[item.type] }} /><span>{item.type}</span><strong>{item.percentage.toFixed(1)}%</strong></div>)}
                </div>
              </div>
            ) : <div className="allocation-empty">{!summaryReady ? "รออัตราแลกเปลี่ยนเพื่อคำนวณสัดส่วนพอร์ต" : "เพิ่มสินทรัพย์เพื่อดูสัดส่วนพอร์ต"}</div>}
          </article>
        </section>

        <section className="investment-panel holdings-panel">
          <div className="holdings-toolbar">
            <div><span className="section-kicker">MY ASSETS</span><h2>รายการลงทุน</h2></div>
            <div className="holdings-tools">
              <button className="investment-button secondary investment-price-refresh" type="button" disabled={quantLoading} onClick={() => setQuantRefresh((value) => value + 1)}><i className={`pi ${quantLoading ? "pi-spin pi-spinner" : "pi-refresh"}`} /> {quantLoading ? "กำลังตรวจราคา" : "โหลดราคา Quant Lab"}</button>
              <label className="investment-search"><i className="pi pi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือตัวย่อ..." aria-label="ค้นหาสินทรัพย์" /></label>
              <select className="investment-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as InvestmentAssetType | "ทั้งหมด")} aria-label="กรองตามประเภท">
                <option value="ทั้งหมด">ทุกประเภท</option>
                {ASSET_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
              </select>
            </div>
          </div>
          <div className="investment-price-status" role="status">
            {quantError ? <span className="investment-price-error">{quantError} · ใช้ราคาที่กรอกเองได้</span> : <span>หุ้น/ETF สหรัฐฯ สกุล USD ใช้ราคาปิดจากคลัง Quant Lab เมื่อมีข้อมูล ส่วนรายการอื่นใช้ราคาที่กรอกเอง</span>}
            <Link to="/quant-analysis">เปิด Quant Lab เพื่ออัปเดตราคา</Link>
          </div>

          <div className="holdings-table-wrap">
            <table className="holdings-table">
              <thead><tr><th>สินทรัพย์</th><th>จำนวน</th><th>ราคาทุนเฉลี่ย</th><th>ราคาปัจจุบัน</th><th>มูลค่าปัจจุบัน</th><th>กำไร / ขาดทุน</th><th aria-label="การทำงาน" /></tr></thead>
              <tbody>
                {filteredHoldings.map((item) => {
                  const averageCost = item.totalCost / item.quantity;
                  const quote = quoteFor(item, quantQuotes);
                  const currentPrice = currentPriceFor(item, quantQuotes);
                  const marketValue = item.quantity * currentPrice;
                  const gain = marketValue - item.totalCost;
                  const gainPercent = item.totalCost ? (gain / item.totalCost) * 100 : 0;
                  return (
                    <tr key={item.id}>
                      <td><div className="asset-name-cell"><InvestmentIcon symbol={item.symbol} /><div><strong>{item.symbol}</strong><span>{item.name}</span><small>{item.market} · {item.type} · {item.currency}</small></div></div></td>
                      <td><strong>{formatNumber(item.quantity)}</strong><span className="cell-subtext">หน่วย</span></td>
                      <td><strong>{formatCurrency(averageCost, item.currency, 2)}</strong><span className="cell-subtext">ทุนรวม {formatCurrency(item.totalCost, item.currency)}</span></td>
                      <td><strong>{formatCurrency(currentPrice, item.currency, 2)}</strong><span className="cell-subtext">{quote ? `Quant Lab · ปิด ${quote.date}` : "กรอกเอง · ต่อหน่วย"}</span></td>
                      <td><strong>{formatCurrency(marketValue, item.currency)}</strong><span className="cell-subtext">ณ ราคาปัจจุบัน</span></td>
                      <td><strong className={gain >= 0 ? "money-positive" : "money-negative"}>{gain >= 0 ? "+" : "−"}{formatCurrency(Math.abs(gain), item.currency)}</strong><span className={`cell-subtext ${gain >= 0 ? "money-positive" : "money-negative"}`}>{gain >= 0 ? "+" : "−"}{Math.abs(gainPercent).toFixed(2)}%</span></td>
                      <td><div className="row-actions"><button type="button" onClick={() => openEditModal(item)} aria-label={`แก้ไข ${item.symbol}`} title="แก้ไข"><i className="pi pi-pencil" /></button><button className="delete-action" type="button" onClick={() => removeHolding(item)} aria-label={`ลบ ${item.symbol}`} title="ลบ"><i className="pi pi-trash" /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && <div className="holdings-loading"><i className="pi pi-spin pi-spinner" /> กำลังโหลดข้อมูลพอร์ต...</div>}
            {!loading && !filteredHoldings.length && (
              <div className="holdings-empty">
                <span><i className="pi pi-chart-bar" /></span>
                <h3>{holdings.length ? "ไม่พบสินทรัพย์ที่ค้นหา" : "พอร์ตนี้ยังว่างอยู่"}</h3>
                <p>{holdings.length ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เพิ่มการลงทุนรายการแรกเพื่อเริ่มติดตามพอร์ต"}</p>
                {!holdings.length && <button type="button" onClick={openAddModal}>เพิ่มการลงทุน</button>}
              </div>
            )}
          </div>
          {!loading && !!filteredHoldings.length && <footer className="holdings-footer">แสดง {filteredHoldings.length} จาก {holdings.length} รายการ <span>ข้อมูลจัดเก็บอย่างปลอดภัยในบัญชีของคุณ</span></footer>}
        </section>
      </div>

      {isModalOpen && (
        <div className="investment-modal-backdrop" role="presentation" onMouseDown={() => !saving && setIsModalOpen(false)}>
          <section className="investment-modal" role="dialog" aria-modal="true" aria-labelledby="investment-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="section-kicker">{editingId !== null ? "EDIT ASSET" : "NEW ASSET"}</span><h2 id="investment-modal-title">{editingId !== null ? "แก้ไขข้อมูลการลงทุน" : "เพิ่มการลงทุนใหม่"}</h2><p>หุ้น/ETF สหรัฐฯ ที่มีราคาใน Quant Lab จะใช้ราคาปิดล่าสุดที่บันทึกไว้ รายการอื่นกรอกราคาเอง</p></div>
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} aria-label="ปิดหน้าต่าง"><i className="pi pi-times" /></button>
            </div>
            <form onSubmit={handleSubmit} className="investment-form">
              <p className="investment-cost-help">กรอกราคาซื้อต่อหุ้น ระบบจะคูณจำนวนเพื่อหาต้นทุนรวม · รายการเดิมโปรดตรวจสอบต้นทุนเฉลี่ยก่อนบันทึก</p>
              <div className="form-grid two-columns">
                <label><span>ตัวย่อสินทรัพย์ *</span><input required value={draft.symbol} onChange={(event) => updateDraft("symbol", event.target.value)} placeholder="เช่น PTT, AAPL, BTC" /></label>
                <label><span>ชื่อสินทรัพย์ *</span><input required value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="ชื่อหุ้นหรือสินทรัพย์" /></label>
                <label><span>ประเภทสินทรัพย์</span><select value={draft.type} onChange={(event) => updateDraft("type", event.target.value as InvestmentAssetType)}>{ASSET_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
                <label><span>ตลาด / โบรกเกอร์</span><input value={draft.market} onChange={(event) => updateDraft("market", event.target.value)} placeholder="เช่น SET, NASDAQ" /></label>
                <label><span>สกุลเงิน</span><select value={draft.currency} onChange={(event) => updateDraft("currency", event.target.value as InvestmentCurrency)}>{CURRENCIES.map((currency) => <option value={currency} key={currency}>{currency}</option>)}</select></label>
                <label><span>จำนวนหน่วย *</span><input required min="0" step="any" type="number" value={draft.quantity || ""} onChange={(event) => updateDraft("quantity", Number(event.target.value))} placeholder="0" /></label>
                <label><span>ต้นทุนเฉลี่ย / หุ้น ({draft.currency}) *</span><input required min="0" step="any" type="number" value={draft.averageCost} onChange={(event) => updateDraft("averageCost", event.target.value)} placeholder="ราคาซื้อต่อหุ้น เช่น 31.36" /></label>
                <label><span>{draftQuote ? "ราคาสำรอง" : "ราคาปัจจุบัน"} / หน่วย ({draft.currency}) {draftQuote ? "" : "*"}</span><input required={!draftQuote} min="0" step="any" type="number" value={draft.currentPrice || ""} onChange={(event) => updateDraft("currentPrice", Number(event.target.value))} placeholder={draftQuote ? "ไม่บังคับเมื่อมีราคา Quant Lab" : "0.00"} /></label>
                <label><span>วันที่เริ่มลงทุน</span><input required type="date" value={draft.purchaseDate} onChange={(event) => updateDraft("purchaseDate", event.target.value)} /></label>
              </div>
              {draftQuote && <p className="investment-quant-form-note">ใช้ราคา Quant Lab {formatCurrency(draftQuote.price, draft.currency, 2)} (ปิด {draftQuote.date}) ในการแสดงผล ราคาที่กรอกในช่องจะเป็นราคาสำรอง</p>}
              <div className="form-calculation">
                <div><span>ต้นทุนรวม ({draft.currency})</span><strong>{draft.quantity > 0 && Number(draft.averageCost) > 0 ? formatCurrency(draft.quantity * Number(draft.averageCost), draft.currency, 2) : "—"}</strong></div>
                <div><span>มูลค่าปัจจุบัน ({draft.currency})</span><strong>{draft.quantity > 0 ? formatCurrency(draft.quantity * currentPriceFor(draft, quantQuotes), draft.currency) : "—"}</strong></div>
              </div>
              <label className="full-width-field"><span>บันทึกเพิ่มเติม</span><textarea rows={3} value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} placeholder="เช่น เป้าหมายการลงทุน เหตุผลที่ซื้อ หรือแผนขาย" /></label>
              <div className="modal-actions">
                <button type="button" className="investment-button secondary" disabled={saving} onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                <button type="submit" className="investment-button primary" disabled={saving}>{saving ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-check" />} {editingId !== null ? "บันทึกการแก้ไข" : "เพิ่มเข้าพอร์ต"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
