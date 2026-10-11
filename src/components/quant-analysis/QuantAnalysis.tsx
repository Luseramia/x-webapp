import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Chart } from "primereact/chart";
import type { ChartData, ChartOptions } from "chart.js";
import { fetchDailyPrices, normalizeSymbol, listStoredPrices, getStoredPrices, listQuantRuns, getQuantRun, saveQuantRun } from "../../services/market-data.service";
import type { StoredPriceSeries, StoredPriceSummary, SavedQuantRun, SavedQuantRunSummary } from "../../services/market-data.service";
import { analyzePair, DEFAULT_QUANT_SETTINGS } from "../../services/quant-analysis";
import type { QuantSettings } from "../../services/quant-analysis";
import "./QuantAnalysis.css";

const number = (value: number | null | undefined, digits = 2) => value == null || !Number.isFinite(value)
  ? "—" : value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number | null | undefined) => value == null ? "—" : `${number(value * 100)}%`;
const money = (value: number) => `$${number(value)}`;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "ไม่สามารถวิเคราะห์ข้อมูลได้";

const chartOptions: ChartOptions<"line"> = {
  responsive: true, maintainAspectRatio: false, animation: false,
  interaction: { mode: "index", intersect: false },
  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true, font: { size: 11 } } } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0, font: { size: 10 } } },
    y: { grid: { color: "#e9efed" }, ticks: { font: { size: 10 } } },
  },
  elements: { point: { radius: 0, hitRadius: 12 }, line: { borderWidth: 1.8, tension: 0 } },
};

function line(label: string, data: (number | null)[], color: string, dashed = false) {
  return { label, data, borderColor: color, backgroundColor: color, borderDash: dashed ? [4, 4] : [], spanGaps: false };
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="qa-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Plot({ title, subtitle, data }: { title: string; subtitle: string; data: ChartData<"line"> }) {
  return <section className="qa-panel qa-plot"><div className="qa-panel-heading"><h2>{title}</h2><p>{subtitle}</p></div>
    <Chart type="line" data={data} options={chartOptions} style={{ height: "280px" }} aria-label={title} />
  </section>;
}

const settingFields: { key: Exclude<keyof QuantSettings, "requireCointegration">; label: string; min: number; max: number; step?: number }[] = [
  { key: "lookback", label: "Rolling window (วัน)", min: 5, max: 252 },
  { key: "trainingPercent", label: "สร้างโมเดล (% ข้อมูลแรก)", min: 40, max: 80 },
  { key: "entryZ", label: "Entry |Z|", min: 0.1, max: 19, step: 0.1 },
  { key: "exitZ", label: "Exit |Z|", min: 0, max: 19, step: 0.1 },
  { key: "stopZ", label: "Stop |Z|", min: 0.2, max: 20, step: 0.1 },
  { key: "maxHoldingDays", label: "ถือสูงสุด (วันซื้อขาย)", min: 1, max: 252 },
  { key: "capital", label: "เงินเริ่มต้น (USD)", min: 100, max: 1e9, step: 100 },
  { key: "feeBps", label: "ค่าธรรมเนียม / ขา (bps)", min: 0, max: 100, step: 0.5 },
  { key: "slippageBps", label: "Slippage / ขา (bps)", min: 0, max: 100, step: 0.5 },
  { key: "borrowPercent", label: "ค่ายืมหุ้น (% ต่อปี)", min: 0, max: 100, step: 0.1 },
];

export default function QuantAnalysis() {
  const [newSymbol, setNewSymbol] = useState("");
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");
  const [library, setLibrary] = useState<StoredPriceSummary[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceNotice, setPriceNotice] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [count, setCount] = useState(504);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ a: StoredPriceSeries; b: StoredPriceSeries } | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [runs, setRuns] = useState<SavedQuantRunSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [savedRun, setSavedRun] = useState<SavedQuantRun | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<QuantSettings>({ ...DEFAULT_QUANT_SETTINGS });
  const [tab, setTab] = useState<"pair" | "single" | "backtest">("pair");
  const [asset, setAsset] = useState<"a" | "b">("a");
  const controller = useRef<AbortController | null>(null);
  const historyController = useRef<AbortController | null>(null);
  const libraryController = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const request = new AbortController();
    historyController.current = request;
    listQuantRuns(request.signal).then((items) => { if (!request.signal.aborted) setRuns(items); })
      .catch((cause) => { if (!request.signal.aborted) setHistoryError(errorMessage(cause)); })
      .finally(() => { if (!request.signal.aborted) setHistoryLoading(false); });
    return () => { request.abort(); historyController.current?.abort(); };
  }, []);
  useEffect(() => {
    const request = new AbortController();
    libraryController.current = request;
    listStoredPrices(request.signal).then((items) => { if (!request.signal.aborted) setLibrary(items); })
      .catch((cause) => { if (!request.signal.aborted) setLibraryError(errorMessage(cause)); })
      .finally(() => { if (!request.signal.aborted) setLibraryLoading(false); });
    return () => { request.abort(); libraryController.current?.abort(); };
  }, []);
  const busy = loading || saving || priceLoading;
  const savedMatches = Boolean(savedRun && data && savedRun.a.snapshotId === data.a.snapshotId &&
    savedRun.b.snapshotId === data.b.snapshotId && JSON.stringify(savedRun.settings) === JSON.stringify(settings));

  const analysis = useMemo(() => {
    if (!data) return { result: null, error: "" };
    if (savedMatches && savedRun) return { result: savedRun.result, error: "" };
    try { return { result: analyzePair(data.a, data.b, settings), error: "" }; }
    catch (cause) { return { result: null, error: errorMessage(cause) }; }
  }, [data, settings, savedMatches, savedRun]);
  const result = analysis.result;

  function rememberRun(run: SavedQuantRun) {
    historyController.current?.abort();
    setHistoryLoading(false);
    setSavedRun(run);
    setSaveName(run.name);
    const { id, name, symbolA, symbolB, createdAt, engineVersion, netReturn, tradeCount } = run;
    setRuns((previous) => [{ id, name, symbolA, symbolB, createdAt, engineVersion, netReturn, tradeCount }, ...previous.filter((item) => item.id !== run.id)].slice(0, 50));
    setHistoryError("");
  }

  function rememberPrice(series: StoredPriceSeries) {
    libraryController.current?.abort();
    setLibraryLoading(false);
    setLibraryError("");
    const summary: StoredPriceSummary = {
      snapshotId: series.snapshotId, symbol: series.symbol, exchange: series.exchange,
      currency: series.currency, requestedCount: series.requestedCount,
      rowCount: series.bars.length, cutoff: series.cutoff, fetchedAt: series.fetchedAt,
    };
    setLibrary((previous) => [...previous.filter((item) => item.symbol !== series.symbol), summary]
      .sort((a, b) => a.symbol.localeCompare(b.symbol)));
    setSelectedA((previous) => !previous || library.find((item) => item.snapshotId === previous)?.symbol === series.symbol ? series.snapshotId : previous);
    setSelectedB((previous) => library.find((item) => item.snapshotId === previous)?.symbol === series.symbol ||
      (!previous && Boolean(selectedA) && library.find((item) => item.snapshotId === selectedA)?.symbol !== series.symbol) ? series.snapshotId : previous);
  }

  async function refreshLibrary() {
    libraryController.current?.abort();
    const request = new AbortController(); libraryController.current = request;
    setLibraryLoading(true); setLibraryError("");
    try {
      const items = await listStoredPrices(request.signal);
      if (!request.signal.aborted) {
        const latestSelection = (id: string) => id && (items.find((item) => item.snapshotId === id)?.snapshotId ||
          items.find((item) => item.symbol === library.find((old) => old.snapshotId === id)?.symbol)?.snapshotId) || "";
        setSelectedA((previous) => latestSelection(previous));
        setSelectedB((previous) => latestSelection(previous));
        setLibrary(items);
      }
    }
    catch (cause) { if (!request.signal.aborted) setLibraryError(errorMessage(cause)); }
    finally { if (!request.signal.aborted) setLibraryLoading(false); }
  }

  async function refreshHistory() {
    historyController.current?.abort();
    const request = new AbortController();
    historyController.current = request;
    setHistoryLoading(true); setHistoryError("");
    try { const items = await listQuantRuns(request.signal); if (!request.signal.aborted) setRuns(items); }
    catch (cause) { if (!request.signal.aborted) setHistoryError(errorMessage(cause)); }
    finally { if (!request.signal.aborted) setHistoryLoading(false); }
  }

  async function openRun(id: string) {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError("");
    try {
      const run = await getQuantRun(id, request.signal);
      if (request.signal.aborted) return;
      setData({ a: run.a, b: run.b }); setSettings(run.settings); setSavedRun(run); setSaveName(run.name);
      setTab("backtest");
    } catch (cause) { if (!request.signal.aborted) setError(errorMessage(cause)); }
    finally { if (controller.current === request) { setLoading(false); controller.current = null; } }
  }

  async function saveCurrent() {
    if (!data || !result) return;
    const request = new AbortController(); controller.current = request;
    setSaving(true); setError("");
    try {
      const run = await saveQuantRun(data.a, data.b, settings, saveName, request.signal);
      if (!request.signal.aborted) rememberRun(run);
    } catch (cause) { if (!request.signal.aborted) setError(errorMessage(cause)); }
    finally { if (controller.current === request) { setSaving(false); controller.current = null; } }
  }

  async function addPrice(event: FormEvent) {
    event.preventDefault();
    setError(""); setPriceNotice("");
    try {
      const symbol = normalizeSymbol(newSymbol);
      controller.current?.abort();
      const request = new AbortController(); controller.current = request;
      setPriceLoading(true);
      try {
        const series = await fetchDailyPrices(symbol, apiKey, count, request.signal, refresh);
        if (request.signal.aborted) return;
        rememberPrice(series);
        setPriceNotice(`${symbol}: ${series.source === "provider" ? "ดึงและบันทึกราคาแล้ว" : "มีข้อมูลในฐานข้อมูลแล้ว ไม่ได้เรียก API ราคา"}`);
        setNewSymbol(""); setRefresh(false);
      } catch (cause) {
        if (!request.signal.aborted) setError(errorMessage(cause));
      } finally {
        if (controller.current === request) { setPriceLoading(false); controller.current = null; }
      }
    } catch (cause) { setError(errorMessage(cause)); }
  }

  async function loadPrices(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!selectedA || !selectedB || selectedA === selectedB) { setError("เลือกหุ้น A และ B คนละตัวจากคลังราคา"); return; }
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setData(null); setSavedRun(null);
    try {
      const [a, b] = await Promise.all([getStoredPrices(selectedA, request.signal), getStoredPrices(selectedB, request.signal)]);
      if (request.signal.aborted) return;
      setData({ a, b }); setSaveName(`${a.symbol} / ${b.symbol}`);
      analyzePair(a, b, settings);
      const run = await saveQuantRun(a, b, settings, `${a.symbol} / ${b.symbol}`, request.signal);
      if (!request.signal.aborted) rememberRun(run);
    } catch (cause) { if (!request.signal.aborted) setError(errorMessage(cause)); }
    finally { if (controller.current === request) { setLoading(false); controller.current = null; } }
  }

  const labels = result?.rows.map((row) => row.date) ?? [];
  const latest = result?.rolling.at(-1);
  const filtered = result && settings.requireCointegration && !result.passes;
  const signal = !result || latest?.z == null ? "ข้อมูลไม่พอสำหรับ Z-score" : result.beta <= 0 ? "Hedge ratio ไม่เป็นบวก" : filtered ? "ไม่ผ่านเงื่อนไขสถิติ" :
    Math.abs(latest.z) >= settings.stopZ ? "นอกกรอบ Stop Z" : Math.abs(latest.z) < settings.entryZ ? "รอ spread เบี่ยงเบน" :
    latest.z > 0 ? `Short ${data?.a.symbol} / Long ${data?.b.symbol}` : `Long ${data?.a.symbol} / Short ${data?.b.symbol}`;
  const single = result?.[asset];
  const singleRolling = single?.rolling.at(-1);

  return <main className="quant-page">
    <div className="qa-shell">
      <header className="qa-hero"><div><span className="qa-eyebrow">RESEARCH / US EQUITIES</span>
        <h1>Quant Lab<span>.</span></h1><p>สำรวจความผันผวน การกลับสู่ค่าเฉลี่ย และความสัมพันธ์ระหว่างหุ้น / ETF</p></div>
        <span className="qa-badge"><i className="pi pi-chart-line" aria-hidden="true" /> Daily · USD · Twelve Data</span>
      </header>

      <form className="qa-panel qa-data-form" onSubmit={addPrice}>
        <div className="qa-section-label"><span>01 / เก็บราคาหุ้นทีละตัว</span><a href="https://twelvedata.com/account/api-keys" target="_blank" rel="noreferrer">รับ API key <i className="pi pi-arrow-up-right" aria-hidden="true" /></a></div>
        <div className="qa-data-fields">
          <label>หุ้น / ETF<input value={newSymbol} onChange={(event) => setNewSymbol(event.target.value)} placeholder="CWEN" maxLength={15} required disabled={busy} autoCapitalize="characters" /></label>
          <label>ประวัติราคา<select value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={busy}><option value={252}>252 วันซื้อขาย (~1 ปี)</option><option value={504}>504 วันซื้อขาย (~2 ปี)</option><option value={1000}>1,000 วันซื้อขาย (~4 ปี)</option></select></label>
          <label className="qa-key">Twelve Data API key (ใช้เมื่อดึงจาก API)<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="เว้นว่างได้เมื่อมีข้อมูลเก็บไว้" autoComplete="off" disabled={busy} /></label>
          <button className="qa-button primary" type="submit" disabled={busy}><i className={`pi ${priceLoading ? "pi-spin pi-spinner" : "pi-download"}`} aria-hidden="true" />{priceLoading ? "กำลังบันทึก" : "เก็บราคาตัวนี้"}</button>
        </div>
        <div className="qa-form-note"><span>ราคาย้อนหลังจริงรายวัน ปรับ split / ปันผล · ไม่รวมวันปัจจุบันของนิวยอร์ก · สิทธิ์ข้อมูลตามแพ็กเกจ API</span>
          {priceLoading ? <button type="button" onClick={() => controller.current?.abort()}>ยกเลิก</button> : apiKey && <button type="button" onClick={() => setApiKey("")}>ล้าง key</button>}
        </div>
        <div className="qa-suggestions">ตัวอย่างที่สนใจ: {["CWEN", "PFE", "VOO", "VTI", "QQQM"].map((symbol) => <button type="button" key={symbol} disabled={busy} onClick={() => setNewSymbol(symbol)}>{symbol}</button>)}</div>
        <label className="qa-check qa-refresh"><input type="checkbox" checked={refresh} disabled={busy} onChange={(event) => setRefresh(event.target.checked)} />อัปเดตราคาตัวนี้จาก API (ใช้โควตา)</label>
        <p className="qa-fine">ถ้าเคยเก็บ ticker นี้และจำนวนวันเพียงพอ ระบบจะใช้ฐานข้อมูล แม้ข้อมูลเก่ากว่า 1 วัน · กดอัปเดตเมื่อต้องการราคาล่าสุด · API key ไม่บันทึกลงฐานข้อมูล</p>
      </form>

      <section className="qa-panel qa-library">
        <div className="qa-library-heading"><div><span className="qa-section-label">02 / คลังราคาของฉัน</span><p className="qa-fine">ข้อมูลรายตัวใช้ซ้ำกับทุกคู่ได้ เลือก A และ B จากรายการด้านล่าง</p></div><button type="button" className="qa-text-button" disabled={libraryLoading} onClick={refreshLibrary}>รีเฟรชรายการ</button></div>
        {priceNotice && <p className="qa-success" role="status">{priceNotice}</p>}
        {libraryLoading && <p className="qa-fine" role="status">กำลังโหลดคลังราคา…</p>}
        {libraryError && <p className="qa-negative" role="alert">{libraryError}</p>}
        {!libraryLoading && !libraryError && library.length === 0 && <p className="qa-fine">ยังไม่มีข้อมูลราคา เริ่มเก็บ CWEN, PFE หรือ ETF ที่สนใจได้ทีละตัว</p>}
        {library.length > 0 && <div className="qa-library-list">{library.map((item) => <div className="qa-library-item" key={item.snapshotId}><div><strong>{item.symbol}</strong><small>{item.rowCount} วัน · เก็บ {new Date(item.fetchedAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}</small></div><div className="qa-library-actions"><button type="button" className={selectedA === item.snapshotId ? "active" : ""} disabled={busy} onClick={() => setSelectedA(item.snapshotId)} aria-label={`เลือก ${item.symbol} เป็น A`}>เลือก A</button><button type="button" className={selectedB === item.snapshotId ? "active" : ""} disabled={busy} onClick={() => setSelectedB(item.snapshotId)} aria-label={`เลือก ${item.symbol} เป็น B`}>เลือก B</button></div></div>)}</div>}
      </section>

      <form className="qa-panel qa-pair-form" onSubmit={loadPrices}>
        <div className="qa-section-label"><span>03 / จับคู่จากข้อมูลที่เก็บไว้</span></div>
        <div className="qa-pair-fields"><label>สินทรัพย์ A<select value={selectedA} onChange={(event) => setSelectedA(event.target.value)} disabled={busy} required><option value="">เลือกจากคลังราคา</option>{library.map((item) => <option key={item.snapshotId} value={item.snapshotId}>{item.symbol} · {item.rowCount} วัน</option>)}</select></label><label>สินทรัพย์ B<select value={selectedB} onChange={(event) => setSelectedB(event.target.value)} disabled={busy} required><option value="">เลือกจากคลังราคา</option>{library.map((item) => <option key={item.snapshotId} value={item.snapshotId}>{item.symbol} · {item.rowCount} วัน</option>)}</select></label><button className="qa-button primary" type="submit" disabled={busy || library.length < 2}><i className={`pi ${loading ? "pi-spin pi-spinner" : "pi-chart-line"}`} aria-hidden="true" />{loading ? "กำลังวิเคราะห์" : "วิเคราะห์คู่จาก DB"}</button></div>
        <p className="qa-fine">ขั้นตอนนี้อ่านราคาที่บันทึกไว้เท่านั้น ไม่มีการเรียก Twelve Data · บันทึกผลวิเคราะห์ไว้เปิดดูย้อนหลังได้</p>
      </form>

      {(error || analysis.error) && <div className="qa-alert" role="alert"><i className="pi pi-exclamation-circle" aria-hidden="true" />{error || analysis.error}</div>}

      <details className="qa-panel qa-settings" open>
        <summary>04 / พารามิเตอร์การวิเคราะห์ <span>แก้ค่าแล้วคำนวณใหม่จากข้อมูลเดิม</span></summary>
        <div className="qa-settings-grid">{settingFields.map((field) => <label key={field.key}>{field.label}
          <input type="number" disabled={busy} min={field.min} max={field.max} step={field.step ?? 1} value={Number.isNaN(settings[field.key]) ? "" : settings[field.key]}
            onChange={(event) => setSettings((previous) => ({ ...previous, [field.key]: event.target.value === "" ? NaN : Number(event.target.value) }))} />
        </label>)}</div>
        <div className="qa-settings-footer"><label className="qa-check"><input type="checkbox" disabled={busy} checked={settings.requireCointegration} onChange={(event) => setSettings((previous) => ({ ...previous, requireCointegration: event.target.checked }))} />จำลองเทรดเฉพาะคู่ที่ผ่าน cointegration และการตรวจ I(1)</label>
          <button className="qa-text-button" type="button" disabled={busy} onClick={() => setSettings({ ...DEFAULT_QUANT_SETTINGS })}>คืนค่าเริ่มต้น</button></div>
        <p className="qa-fine">1 bps = 0.01% ของมูลค่าซื้อขายแต่ละขา · ค่าเริ่มต้นเป็นสมมติฐานสำหรับทดลอง ปรับให้ตรงกับ broker ของคุณ</p>
      </details>

      <details className="qa-panel qa-history" open={!data}>
        <summary>ประวัติผลวิเคราะห์ของฉัน <span>{runs.length} รายการล่าสุด</span></summary>
        <div className="qa-history-heading"><p className="qa-fine">เปิดชุดราคา พารามิเตอร์ และผลเดิมจากฐานข้อมูลได้โดยไม่ใช้ API key</p><button type="button" className="qa-text-button" disabled={historyLoading} onClick={refreshHistory}>รีเฟรชประวัติ</button></div>
        {historyLoading && <p className="qa-fine" role="status">กำลังโหลดประวัติ…</p>}
        {historyError && <p className="qa-negative" role="alert">{historyError}</p>}
        {!historyLoading && !historyError && !runs.length && <p className="qa-fine">ยังไม่มีผลวิเคราะห์ที่บันทึกไว้</p>}
        {runs.length > 0 && <div className="qa-table-wrap"><table><thead><tr><th>ชื่อ / คู่สินทรัพย์</th><th>บันทึกเมื่อ (กรุงเทพฯ)</th><th>ผลตอบแทน</th><th>รอบเทรด</th><th></th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td><strong>{run.name}</strong><small className="qa-history-symbols">{run.symbolA} / {run.symbolB}</small></td><td>{new Date(run.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</td><td>{percent(run.netReturn)}</td><td>{run.tradeCount}</td><td><button type="button" className="qa-text-button" disabled={busy} onClick={() => openRun(run.id)}>เปิดผล</button></td></tr>)}</tbody></table></div>}
      </details>

      {!result || !data ? <section className="qa-empty" aria-live="polite"><div className="qa-empty-icon"><i className="pi pi-sliders-h" aria-hidden="true" /></div>
        <span className="qa-eyebrow">FROM DATA TO EVIDENCE</span><h2>{loading ? "กำลังวิเคราะห์ข้อมูลที่บันทึกไว้…" : "เริ่มจากคลังราคาหุ้น"}</h2>
        <p>{analysis.error ? "ปรับพารามิเตอร์ด้านบนเพื่อคำนวณต่อ" : "เก็บหุ้นทีละตัว แล้วเลือกสองตัวจากคลังเพื่อวิเคราะห์ หรือเปิดผลเดิมจากประวัติ"}</p>
        <div className="qa-empty-steps"><span><b>01</b> วัดการกระจาย</span><span><b>02</b> ตรวจความสัมพันธ์</span><span><b>03</b> ทดสอบหลังหักต้นทุน</span></div>
      </section> : <>
        <div className="qa-loaded"><div><strong>{data.a.symbol} <span>/</span> {data.b.symbol}</strong><p>{data.a.exchange} / {data.b.exchange} · {labels[0]} ถึง {labels.at(-1)} · {result.rows.length} วันตรงกัน</p></div>
          <small>ดึงข้อมูล {new Date(data.a.fetchedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} (กรุงเทพฯ)</small></div>
        <section className="qa-panel qa-save-panel"><div><strong>{savedMatches ? "บันทึกผลในฐานข้อมูลแล้ว" : "ผลปัจจุบันยังไม่ได้บันทึก"}</strong><p className="qa-fine">ราคา {data.a.symbol}: {data.a.source === "provider" ? "ดึงใหม่และเก็บแล้ว" : "จากฐานข้อมูล"} · {data.b.symbol}: {data.b.source === "provider" ? "ดึงใหม่และเก็บแล้ว" : "จากฐานข้อมูล"}{savedMatches && savedRun ? ` · สูตร v${savedRun.engineVersion}` : " · กดบันทึกหลังปรับพารามิเตอร์"}</p></div><label>ชื่อผลวิเคราะห์<input value={saveName} maxLength={120} disabled={busy} onChange={(event) => setSaveName(event.target.value)} /></label><button type="button" className="qa-button primary" disabled={busy || Boolean(savedMatches && savedRun?.name === saveName)} onClick={saveCurrent}>{saving ? "กำลังบันทึก…" : "บันทึกผลวิเคราะห์"}</button></section>
        {(result.droppedA > 0 || result.droppedB > 0) && <p className="qa-notice">ตัดวันที่ไม่ตรงกันออก: {data.a.symbol} {result.droppedA} วัน / {data.b.symbol} {result.droppedB} วัน ไม่มีการเติมราคาที่หายไป</p>}
        <nav className="qa-tabs" aria-label="มุมมองการวิเคราะห์">{([
          ["pair", "Pair trading"], ["single", "SD & Mean reversion"], ["backtest", "Backtest"],
        ] as const).map(([id, label]) => <button key={id} type="button" className={tab === id ? "active" : ""} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>

        {tab === "pair" && <>
          <div className="qa-metrics"><Metric label="Spread Z-score" value={number(latest?.z)} detail={`เทียบ ${settings.lookback} วันก่อนหน้า`} /><Metric label="Hedge ratio β" value={number(result.beta, 4)} detail={`หน่วย ${data.b.symbol} ต่อ 1 หน่วย ${data.a.symbol}`} /><Metric label="Return correlation" value={number(result.returnCorrelation, 3)} detail="Log returns · ช่วงสร้างโมเดล" /><Metric label="Spread half-life" value={result.halfLife === null ? "ประเมินไม่ได้" : `${number(result.halfLife, 1)} วัน`} detail="AR(1) · ประมาณจากช่วงสร้างโมเดล" /></div>
          <div className="qa-pair-layout"><Plot title="Spread & rolling mean" subtitle={`Spread = ${data.a.symbol} − (${number(result.alpha, 4)}) − ${number(result.beta, 4)} × ${data.b.symbol} · เส้นย้อนหลังช่วงสร้างโมเดลใช้เพื่อวินิจฉัยเท่านั้น`} data={{ labels, datasets: [
            line("Spread", result.spreads, "#19786e"), line("Mean", result.rolling.map((p) => p.mean), "#cc874a", true),
            line("Mean + 2 SD", result.rolling.map((p) => p.mean !== null && p.sd !== null ? p.mean + 2 * p.sd : null), "#a1b9b3", true),
            line("Mean − 2 SD", result.rolling.map((p) => p.mean !== null && p.sd !== null ? p.mean - 2 * p.sd : null), "#a1b9b3", true),
          ] }} />
            <aside className="qa-panel qa-diagnostics"><span className="qa-eyebrow">FORMATION DIAGNOSTICS</span><h2>คู่นี้กลับเข้าหากันไหม?</h2>
              <span className={`qa-status ${result.passes ? "pass" : "review"}`}>{result.passes ? "พบหลักฐานตามเกณฑ์ 5%" : "ยังไม่ผ่านเกณฑ์ครบ"}</span>
              <dl><div><dt>Engle–Granger statistic</dt><dd>{number(result.testStatistic, 3)}</dd></div><div><dt>Critical value (5%)</dt><dd>{number(result.critical, 3)}</dd></div><div><dt>I(1) screening · {data.a.symbol}</dt><dd>{result.integrationA.compatible ? "สอดคล้อง" : "ไม่สรุป"}</dd></div><div><dt>I(1) screening · {data.b.symbol}</dt><dd>{result.integrationB.compatible ? "สอดคล้อง" : "ไม่สรุป"}</dd></div><div><dt>ช่วงสร้างโมเดล</dt><dd>{result.trainingCount} วันแรก</dd></div></dl>
              <p className="qa-fine">ใช้ ADF lag = 1 คงที่ ค่า statistic ต้องต่ำกว่า critical value; I(1) ตรวจระดับราคาและผลต่างครั้งแรก ผลทดสอบขึ้นกับช่วงข้อมูลและไม่ยืนยันความสัมพันธ์ในอนาคต</p>
            </aside></div>
          <Plot title="Spread Z-score · ช่วงทดสอบ" subtitle="สถานะเบี่ยงเบนล่าสุดเป็นเงื่อนไขสำหรับศึกษา ไม่ใช่คำสั่งซื้อขาย" data={{ labels: labels.slice(result.trainingCount), datasets: [
            line("Z-score", result.rolling.slice(result.trainingCount).map((p) => p.z), "#19786e"),
            ...[settings.entryZ, -settings.entryZ].map((v) => line(`Entry ${v}`, labels.slice(result.trainingCount).map(() => v), "#cc874a", true)),
            line("Mean", labels.slice(result.trainingCount).map(() => 0), "#a1b9b3", true),
          ] }} />
          <div className="qa-signal"><span>เงื่อนไขล่าสุด</span><strong>{signal}</strong><small>β คือสัดส่วนจำนวนหุ้น ไม่ใช่สัดส่วนเงินเท่ากัน · ตรวจสถานะที่ถืออยู่ในผล backtest</small></div>
        </>}

        {tab === "single" && single && <>
          <div className="qa-asset-select"><label>สินทรัพย์ที่วิเคราะห์ <select value={asset} onChange={(event) => setAsset(event.target.value as "a" | "b")}><option value="a">{data.a.symbol}</option><option value="b">{data.b.symbol}</option></select></label><span>ใช้เฉพาะวันที่ตรงกันของทั้งสองสินทรัพย์</span></div>
          <div className="qa-metrics"><Metric label="Rolling mean" value={money(singleRolling?.mean ?? 0)} detail={`${settings.lookback} วันก่อนหน้า (ไม่รวมวันล่าสุด)`} /><Metric label="Sample SD ของราคา" value={money(singleRolling?.sd ?? 0)} detail="หน่วย USD · หารด้วย n − 1" /><Metric label="Price Z-score" value={number(singleRolling?.z)} detail="ระยะห่างจากค่าเฉลี่ย หน่วย SD" /><Metric label="Annualized volatility" value={percent(single.annualVolatility)} detail="SD ของ log returns × √252" /></div>
          <Plot title={`${data[asset].symbol} · ราคาและกรอบ ±2 SD`} subtitle="SD ของราคาแสดงการกระจาย ส่วน SD ของผลตอบแทนใช้วัดความผันผวน · ราคาหลุดกรอบไม่ได้ยืนยันว่าจะกลับสู่ค่าเฉลี่ย" data={{ labels, datasets: [
            line(data[asset].symbol, result.rows.map((row) => row[asset].close), "#19786e"),
            line("Mean", single.rolling.map((p) => p.mean), "#cc874a", true),
            line("+2 SD", single.rolling.map((p) => p.mean !== null && p.sd !== null ? p.mean + 2 * p.sd : null), "#a1b9b3", true),
            line("−2 SD", single.rolling.map((p) => p.mean !== null && p.sd !== null ? p.mean - 2 * p.sd : null), "#a1b9b3", true),
          ] }} />
          <section className="qa-panel qa-explainer"><h2>อ่านค่าร่วมกัน</h2><p><b>Z = (ราคา − ค่าเฉลี่ย) / SD</b> · ค่า +2 หมายถึงอยู่เหนือค่าเฉลี่ย 2 SD ส่วน −2 หมายถึงต่ำกว่า 2 SD ข้อมูลราคาหุ้นอาจมีแนวโน้ม จึงใช้ Z-score เป็นตัววัดการเบี่ยงเบน และใช้ผลทดสอบ spread ประกอบเมื่อศึกษาคู่สินทรัพย์</p><p>ถ้า SD เป็นศูนย์ ระบบจะไม่แสดง Z-score และไม่เปิดสถานะจากค่านั้น</p></section>
        </>}

        {tab === "backtest" && <>
          <p className="qa-notice">สร้างโมเดล {labels[0]}–{labels[result.trainingCount - 1]} · ทดสอบ {labels[result.trainingCount]}–{labels.at(-1)} · β คงที่ตลอดช่วงทดสอบ</p>
          {(filtered || result.beta <= 0) && <p className="qa-notice">ไม่เปิดสถานะ: {result.beta <= 0 ? "β ต้องเป็นบวกสำหรับโมเดล long/short นี้" : "คู่นี้ไม่ผ่านตัวกรองสถิติครบทุกข้อ"} ผลเส้นทุนจึงคงที่</p>}
          <div className="qa-metrics"><Metric label="ผลตอบแทนสุทธิ" value={percent(result.backtest.netReturn)} detail={`ต้นทุนรวม ${money(result.backtest.totalCosts)}`} /><Metric label="Maximum drawdown" value={percent(result.backtest.drawdown)} detail="วัดจากมูลค่าพอร์ตหลังปิดตลาด" /><Metric label="Sharpe ratio" value={number(result.backtest.sharpe)} detail="รายวัน × √252 · สมมติ risk-free = 0" /><Metric label="Win rate" value={percent(result.backtest.winRate)} detail={`${result.backtest.trades.length} รอบที่ปิดสถานะแล้ว`} /></div>
          <Plot title="Equity curve · หลังหักต้นทุน" subtitle="สัญญาณจากราคาปิดวันก่อน → จำลองที่ราคาเปิดวันถัดไป · เงินต้นรวม long + short เท่ากับทุนเมื่อเปิดสถานะ" data={{ labels: result.backtest.equity.map((p) => p.date), datasets: [
            line("Equity (USD)", result.backtest.equity.map((p) => p.value), "#19786e"),
            line("เงินเริ่มต้น", result.backtest.equity.map(() => settings.capital), "#a1b9b3", true),
          ] }} />
          <section className="qa-panel"><div className="qa-panel-heading"><h2>รายการจำลองซื้อขาย</h2><p>แสดงกำไรสุทธิของทั้งสองขารวมกัน</p></div>
            <div className="qa-table-wrap"><table><thead><tr><th>เข้า</th><th>ออก</th><th>ฝั่ง spread</th><th>วันถือ</th><th>เหตุผลออก</th><th>ต้นทุน</th><th>P&amp;L สุทธิ</th></tr></thead><tbody>
              {result.backtest.trades.map((trade, i) => <tr key={`${trade.entryDate}-${i}`}><td>{trade.entryDate}</td><td>{trade.exitDate}</td><td>{trade.direction}</td><td>{trade.holdingDays}</td><td>{trade.reason}</td><td>{money(trade.costs)}</td><td className={trade.pnl >= 0 ? "qa-positive" : "qa-negative"}>{money(trade.pnl)}</td></tr>)}
              {!result.backtest.trades.length && <tr><td colSpan={7} className="qa-no-trades">ไม่มีรอบซื้อขายตามเงื่อนไขและช่วงข้อมูลนี้</td></tr>}
            </tbody></table></div>
          </section>
        </>}

        <details className="qa-panel qa-method"><summary>วิธีคำนวณและขอบเขตของผลทดสอบ</summary><ul>
          <li>ใช้ sample SD (n − 1), rolling mean/SD จากข้อมูลก่อนหน้าเท่านั้น และ annualization 252 วันซื้อขาย</li>
          <li>OLS: A = α + βB จากช่วงสร้างโมเดลเท่านั้น; Engle–Granger แบบ constant, ADF lag = 1, critical value ของ MacKinnon สำหรับ 2 series ไม่ใช้ค่า ADF ปกติแทน</li>
          <li>Half-life คำนวณจาก AR(1): ln(0.5) / ln(φ) เมื่อ 0 &lt; φ &lt; 1; เป็นค่าประมาณ ไม่ใช่เวลาที่รับประกันว่าจะกลับมา</li>
          <li>Backtest ใช้หุ้นเศษส่วน จำนวนหุ้นคงที่ต่อรอบ มูลค่า long + short เท่ากับทุน ณ เวลาเข้า; หัก fee/slippage ตามมูลค่าแต่ละขาทั้งเข้าและออก และค่ายืมหุ้นตามวันปฏิทิน</li>
          <li>Stop Z และการกลับค่าเฉลี่ยตรวจหลังปิดตลาดแล้วออกวันถัดไป จึงไม่จำกัดขาดทุนระหว่างวัน; ปิดรอบค้างที่ราคาปิดวันสุดท้าย</li>
          <li>ข้อมูลปรับ split/ปันผลใช้เป็นราคาอ้างอิงในการจำลอง ไม่ใช่ราคาซื้อขายย้อนหลังจริง; ยังไม่จำลองเงินปันผลแยก, margin call, ภาษี, ข้อจำกัดการยืมหุ้น หรือดอกเบี้ยเงินสด</li>
          <li>เป็นการแบ่งช่วงสร้างโมเดล/ทดสอบครั้งเดียว การปรับพารามิเตอร์ซ้ำจากผลทดสอบอาจเกิด overfitting; ขั้นต่อไปควรเพิ่ม walk-forward และทดสอบช่วงข้อมูลใหม่</li>
        </ul><p><a href="https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.coint.html" target="_blank" rel="noreferrer">Engle–Granger reference</a> · <a href="https://twelvedata.com/docs#time-series" target="_blank" rel="noreferrer">Twelve Data API</a></p></details>
      </>}
    </div>
  </main>;
}
