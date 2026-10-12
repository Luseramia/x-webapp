import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import InvestmentService, {
  type InvestmentAssetType,
  type InvestmentHoldingInput,
  type InvestmentHoldingRecord,
} from "../../services/investment.service";
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
  purchaseDate: string;
  notes: string;
}

type HoldingDraft = Omit<Holding, "id">;

const service = new InvestmentService();
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
  totalCost: 0,
  currentPrice: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
  notes: "",
});

const mapRecord = (record: InvestmentHoldingRecord): Holding => ({
  id: record.id,
  symbol: record.symbol,
  name: record.asset_name,
  type: record.asset_type,
  market: record.market,
  quantity: Number(record.quantity),
  totalCost: Number(record.total_cost),
  currentPrice: Number(record.current_price),
  purchaseDate: record.purchase_date,
  notes: record.notes ?? "",
});

const toPayload = (draft: HoldingDraft): InvestmentHoldingInput => ({
  symbol: draft.symbol.trim().toUpperCase(),
  asset_name: draft.name.trim(),
  asset_type: draft.type,
  market: draft.market.trim() || "ไม่ระบุ",
  quantity: draft.quantity,
  total_cost: draft.totalCost,
  current_price: draft.currentPrice,
  purchase_date: draft.purchaseDate,
  notes: draft.notes.trim(),
});

const formatBaht = (value: number, fractionDigits = 0) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

const formatNumber = (value: number, maximumFractionDigits = 4) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits }).format(value);

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

  useEffect(() => {
    let active = true;
    service
      .list()
      .then((records) => active && setHoldings(records.map(mapRecord)))
      .catch((error: Error) => toast.error(error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalCost = holdings.reduce((sum, item) => sum + item.totalCost, 0);
    const marketValue = holdings.reduce((sum, item) => sum + item.quantity * item.currentPrice, 0);
    const gain = marketValue - totalCost;
    return {
      totalCost,
      marketValue,
      gain,
      gainPercent: totalCost ? (gain / totalCost) * 100 : 0,
    };
  }, [holdings]);

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
    return ASSET_TYPES.map((type) => ({
      type,
      value: holdings
        .filter((item) => item.type === type)
        .reduce((sum, item) => sum + item.quantity * item.currentPrice, 0),
    }))
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percentage: totals.marketValue ? (item.value / totals.marketValue) * 100 : 0,
      }));
  }, [holdings, totals.marketValue]);

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

  const chartEndY = 64 - Math.max(-1, Math.min(1, totals.gainPercent / 25)) * 42;
  const chartPath = `M20,64 C180,64 340,${chartEndY.toFixed(1)} 500,${chartEndY.toFixed(1)}`;

  const openAddModal = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setIsModalOpen(true);
  };

  const openEditModal = (holding: Holding) => {
    const { id, ...holdingDraft } = holding;
    setEditingId(id);
    setDraft(holdingDraft);
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
    if (draft.quantity <= 0 || draft.totalCost <= 0 || draft.currentPrice < 0) {
      toast.error("จำนวนและต้นทุนต้องมากกว่า 0");
      return;
    }

    setSaving(true);
    try {
      if (editingId !== null) {
        const updated = mapRecord(await service.update(editingId, toPayload(draft)));
        setHoldings((items) => items.map((item) => (item.id === editingId ? updated : item)));
        toast.success("อัปเดตข้อมูลการลงทุนแล้ว");
      } else {
        const created = mapRecord(await service.create(toPayload(draft)));
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
    const header = ["ตัวย่อ", "ชื่อสินทรัพย์", "ประเภท", "ตลาด", "จำนวน", "ต้นทุนรวม", "ต้นทุนเฉลี่ย", "ราคาปัจจุบัน", "มูลค่าปัจจุบัน", "กำไร/ขาดทุน", "วันที่ลงทุน", "หมายเหตุ"];
    const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = holdings.map((item) => {
      const marketValue = item.quantity * item.currentPrice;
      return [item.symbol, item.name, item.type, item.market, item.quantity, item.totalCost, item.totalCost / item.quantity, item.currentPrice, marketValue, marketValue - item.totalCost, item.purchaseDate, item.notes].map(escapeCell);
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
            <div className="summary-card-label">มูลค่าพอร์ตทั้งหมด <span className="summary-icon"><i className="pi pi-wallet" /></span></div>
            <strong>{formatBaht(totals.marketValue)}</strong>
            <div className={`summary-change ${totals.gain >= 0 ? "positive" : "negative"}`}>
              <i className={`pi ${totals.gain >= 0 ? "pi-arrow-up-right" : "pi-arrow-down-right"}`} />
              {Math.abs(totals.gainPercent).toFixed(2)}% จากเงินลงทุน
            </div>
          </article>
          <article className="investment-summary-card">
            <div className="summary-card-label">เงินลงทุนทั้งหมด <span className="summary-icon soft-blue"><i className="pi pi-credit-card" /></span></div>
            <strong>{formatBaht(totals.totalCost)}</strong>
            <p>{holdings.length} สินทรัพย์ในพอร์ต</p>
          </article>
          <article className="investment-summary-card">
            <div className="summary-card-label">กำไร / ขาดทุน <span className="summary-icon soft-green"><i className="pi pi-chart-line" /></span></div>
            <strong className={totals.gain >= 0 ? "money-positive" : "money-negative"}>{totals.gain >= 0 ? "+" : "−"}{formatBaht(Math.abs(totals.gain))}</strong>
            <p>ผลตอบแทนที่ยังไม่ขาย</p>
          </article>
        </section>

        <section className="investment-insights-grid">
          <article className="investment-panel portfolio-trend">
            <div className="panel-heading">
              <div><span className="section-kicker">PERFORMANCE</span><h2>ภาพรวมผลตอบแทน</h2></div>
              <span className="manual-price-note"><i className="pi pi-info-circle" /> ราคาปัจจุบันอัปเดตเอง</span>
            </div>
            <div className="trend-content">
              <div className="trend-metric">
                <span>ผลต่างจากต้นทุน</span>
                <strong className={totals.gain >= 0 ? "money-positive" : "money-negative"}>{totals.gain >= 0 ? "+" : "−"}{formatBaht(Math.abs(totals.gain))}</strong>
                <em className={totals.gain >= 0 ? "positive-chip" : "negative-chip"}>{totals.gain >= 0 ? "+" : "−"}{Math.abs(totals.gainPercent).toFixed(2)}%</em>
              </div>
              <div className={`trend-chart ${totals.gain < 0 ? "negative" : ""}`} aria-label="เปรียบเทียบต้นทุนกับมูลค่าปัจจุบัน">
                <svg viewBox="0 0 520 128" role="img">
                  <defs><linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={totals.gain < 0 ? "#c85050" : "#2a9d8f"} stopOpacity="0.3" /><stop offset="100%" stopColor={totals.gain < 0 ? "#c85050" : "#2a9d8f"} stopOpacity="0" /></linearGradient></defs>
                  <path className="trend-area" d={`${chartPath} L500,128 L20,128 Z`} />
                  <path className="trend-line" d={chartPath} />
                  <circle cx="500" cy={chartEndY} r="5" />
                </svg>
                <div className="chart-axis"><span>ต้นทุน</span><span>มูลค่าปัจจุบัน</span></div>
              </div>
            </div>
          </article>

          <article className="investment-panel allocation-panel">
            <div className="panel-heading"><div><span className="section-kicker">ALLOCATION</span><h2>สัดส่วนพอร์ต</h2></div></div>
            {allocations.length ? (
              <div className="allocation-content">
                <div className="allocation-donut" style={{ background: donutBackground }}><div><strong>{allocations.length}</strong><span>ประเภท</span></div></div>
                <div className="allocation-list">
                  {allocations.map((item) => <div className="allocation-row" key={item.type}><span className="allocation-dot" style={{ background: TYPE_COLORS[item.type] }} /><span>{item.type}</span><strong>{item.percentage.toFixed(1)}%</strong></div>)}
                </div>
              </div>
            ) : <div className="allocation-empty">เพิ่มสินทรัพย์เพื่อดูสัดส่วนพอร์ต</div>}
          </article>
        </section>

        <section className="investment-panel holdings-panel">
          <div className="holdings-toolbar">
            <div><span className="section-kicker">MY ASSETS</span><h2>รายการลงทุน</h2></div>
            <div className="holdings-tools">
              <label className="investment-search"><i className="pi pi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือตัวย่อ..." aria-label="ค้นหาสินทรัพย์" /></label>
              <select className="investment-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as InvestmentAssetType | "ทั้งหมด")} aria-label="กรองตามประเภท">
                <option value="ทั้งหมด">ทุกประเภท</option>
                {ASSET_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
              </select>
            </div>
          </div>

          <div className="holdings-table-wrap">
            <table className="holdings-table">
              <thead><tr><th>สินทรัพย์</th><th>จำนวน</th><th>ราคาทุนเฉลี่ย</th><th>ราคาปัจจุบัน</th><th>มูลค่าปัจจุบัน</th><th>กำไร / ขาดทุน</th><th aria-label="การทำงาน" /></tr></thead>
              <tbody>
                {filteredHoldings.map((item) => {
                  const averageCost = item.totalCost / item.quantity;
                  const marketValue = item.quantity * item.currentPrice;
                  const gain = marketValue - item.totalCost;
                  const gainPercent = item.totalCost ? (gain / item.totalCost) * 100 : 0;
                  return (
                    <tr key={item.id}>
                      <td><div className="asset-name-cell"><InvestmentIcon symbol={item.symbol} /><div><strong>{item.symbol}</strong><span>{item.name}</span><small>{item.market} · {item.type}</small></div></div></td>
                      <td><strong>{formatNumber(item.quantity)}</strong><span className="cell-subtext">หน่วย</span></td>
                      <td><strong>{formatBaht(averageCost, 2)}</strong><span className="cell-subtext">ทุนรวม {formatBaht(item.totalCost)}</span></td>
                      <td><strong>{formatBaht(item.currentPrice, 2)}</strong><span className="cell-subtext">ต่อหน่วย</span></td>
                      <td><strong>{formatBaht(marketValue)}</strong><span className="cell-subtext">ณ ราคาปัจจุบัน</span></td>
                      <td><strong className={gain >= 0 ? "money-positive" : "money-negative"}>{gain >= 0 ? "+" : "−"}{formatBaht(Math.abs(gain))}</strong><span className={`cell-subtext ${gain >= 0 ? "money-positive" : "money-negative"}`}>{gain >= 0 ? "+" : "−"}{Math.abs(gainPercent).toFixed(2)}%</span></td>
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
              <div><span className="section-kicker">{editingId !== null ? "EDIT ASSET" : "NEW ASSET"}</span><h2 id="investment-modal-title">{editingId !== null ? "แก้ไขข้อมูลการลงทุน" : "เพิ่มการลงทุนใหม่"}</h2><p>กรอกข้อมูลเป็นเงินบาท ระบบจะคำนวณผลตอบแทนให้อัตโนมัติ</p></div>
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} aria-label="ปิดหน้าต่าง"><i className="pi pi-times" /></button>
            </div>
            <form onSubmit={handleSubmit} className="investment-form">
              <div className="form-grid two-columns">
                <label><span>ตัวย่อสินทรัพย์ *</span><input required value={draft.symbol} onChange={(event) => updateDraft("symbol", event.target.value)} placeholder="เช่น PTT, AAPL, BTC" /></label>
                <label><span>ชื่อสินทรัพย์ *</span><input required value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="ชื่อหุ้นหรือสินทรัพย์" /></label>
                <label><span>ประเภทสินทรัพย์</span><select value={draft.type} onChange={(event) => updateDraft("type", event.target.value as InvestmentAssetType)}>{ASSET_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
                <label><span>ตลาด / โบรกเกอร์</span><input value={draft.market} onChange={(event) => updateDraft("market", event.target.value)} placeholder="เช่น SET, NASDAQ" /></label>
                <label><span>จำนวนหน่วย *</span><input required min="0" step="any" type="number" value={draft.quantity || ""} onChange={(event) => updateDraft("quantity", Number(event.target.value))} placeholder="0" /></label>
                <label><span>ต้นทุนรวม (บาท) *</span><input required min="0" step="any" type="number" value={draft.totalCost || ""} onChange={(event) => updateDraft("totalCost", Number(event.target.value))} placeholder="0.00" /></label>
                <label><span>ราคาปัจจุบัน / หน่วย (บาท) *</span><input required min="0" step="any" type="number" value={draft.currentPrice || ""} onChange={(event) => updateDraft("currentPrice", Number(event.target.value))} placeholder="0.00" /></label>
                <label><span>วันที่เริ่มลงทุน</span><input required type="date" value={draft.purchaseDate} onChange={(event) => updateDraft("purchaseDate", event.target.value)} /></label>
              </div>
              <div className="form-calculation">
                <div><span>ต้นทุนเฉลี่ย / หน่วย</span><strong>{draft.quantity > 0 ? formatBaht(draft.totalCost / draft.quantity, 2) : "—"}</strong></div>
                <div><span>มูลค่าปัจจุบัน</span><strong>{draft.quantity > 0 ? formatBaht(draft.quantity * draft.currentPrice) : "—"}</strong></div>
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
