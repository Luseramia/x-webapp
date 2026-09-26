import { useEffect, useMemo, useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import FinancialAnalysisService, {
  type CanonicalAccount,
  type FinancialCompany,
  type FinancialDashboard,
  type FinancialImportRow,
  type FinancialPeriod,
  type FinancialScope,
  type FinancialSource,
  type FinancialUnit,
  type PreviewResult,
  type WorkbookCell,
} from "../../services/financial-analysis.service";
import "./FinancialAnalysis.css";

const service = new FinancialAnalysisService();
const importantAccounts = [
  "ASSET.CASH",
  "ASSET.RECEIVABLE",
  "ASSET.INVENTORY",
  "ASSET.PPE",
  "ASSET.TOTAL",
  "LIABILITY.TOTAL",
  "EQUITY.TOTAL",
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";

function isoDate(year: number, month = 12, day = 31) {
  const normalizedYear = year > 2400 ? year - 543 : year;
  return `${normalizedYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parsePeriod(cell: unknown): string | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, "0")}-${String(cell.getDate()).padStart(2, "0")}`;
  }
  if (typeof cell === "number" && cell >= 1900 && cell <= 2600) return isoDate(cell);
  const value = String(cell ?? "").trim();
  const yearOnly = value.match(/^(\d{4})$/);
  if (yearOnly) return isoDate(Number(yearOnly[1]));
  const quarterFirst = value.match(/^Q([1-4])\s*[-/]?\s*(\d{4})$/i);
  const yearFirst = value.match(/^(\d{4})\s*[-/]?\s*Q([1-4])$/i);
  const quarter = quarterFirst ? Number(quarterFirst[1]) : yearFirst ? Number(yearFirst[2]) : null;
  const year = quarterFirst ? Number(quarterFirst[2]) : yearFirst ? Number(yearFirst[1]) : null;
  if (quarter && year) {
    const endings = [[3, 31], [6, 30], [9, 30], [12, 31]];
    return isoDate(year, endings[quarter - 1][0], endings[quarter - 1][1]);
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(value)) {
    const parts = value.split(/[/-]/).map(Number);
    return isoDate(parts[2], parts[1], parts[0]);
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed) && /\d{4}/.test(value)) {
    const date = new Date(parsed);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(cell: unknown): number | null {
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  const raw = String(cell ?? "").trim();
  if (!raw || raw === "-" || raw === "—" || raw.toLowerCase() === "n/a") return null;
  const negative = /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[(),\s]/g, "").replace(/[^0-9.+-]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? (negative ? -Math.abs(value) : value) : null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

function toWorkbookCell(cell: unknown): WorkbookCell {
  if (cell === null || typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") return cell;
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) return cell.toISOString();
  return String(cell ?? "");
}

function isBalanceSheetName(name: string) {
  return /(^|\W)bs(\W|$)|balance\s*sheet|statement\s+of\s+financial\s+position|งบแสดงฐานะการเงิน/i.test(name);
}

function hasBalanceSheetContent(rows: WorkbookCell[][]) {
  const sample = rows.slice(0, 15).flat().map((cell) => String(cell ?? "")).join(" ").toLowerCase();
  return /balance\s*sheet|statement\s+of\s+financial\s+position|งบแสดงฐานะการเงิน|สินทรัพย์|หนี้สิน/.test(sample);
}

function matrixToRows(matrix: unknown[][]): FinancialImportRow[] {
  const headerIndex = matrix.slice(0, 15).findIndex((row) => row.filter((cell) => parsePeriod(cell)).length > 0);
  if (headerIndex < 0) throw new Error("ไม่พบคอลัมน์งวดการเงิน เช่น 2025, 2026 หรือ Q1 2026");
  const header = matrix[headerIndex];
  const periods = header.map((cell, column) => ({ column, periodEnd: parsePeriod(cell) })).filter((item): item is { column: number; periodEnd: string } => Boolean(item.periodEnd));
  const firstPeriodColumn = periods[0].column;
  let labelColumn = 0;
  for (let column = firstPeriodColumn - 1; column >= 0; column -= 1) {
    if (String(header[column] ?? "").trim()) { labelColumn = column; break; }
  }
  const rows: FinancialImportRow[] = [];
  matrix.slice(headerIndex + 1).forEach((row, offset) => {
    const originalLabel = String(row[labelColumn] ?? "").trim();
    if (!originalLabel) return;
    const values = periods.flatMap(({ column, periodEnd }) => {
      const parsed = parseNumber(row[column]);
      if (parsed === null) return [];
      return [{ periodEnd, value: parsed, originalValue: String(row[column] ?? "") }];
    });
    if (values.length) rows.push({ originalLabel, sourceRow: headerIndex + offset + 2, values });
  });
  if (!rows.length) throw new Error("ไม่พบแถวบัญชีที่มีตัวเลขในไฟล์");
  return rows;
}

function detectUnit(matrix: unknown[][], fallback: FinancialUnit): FinancialUnit {
  const sample = matrix.slice(0, 12).flat().map((cell) => String(cell ?? "").toLowerCase()).join(" ");
  if (/พันล้าน|billion/.test(sample)) return "BILLION";
  if (/ล้าน|million/.test(sample)) return "MILLION";
  if (/พันบาท|thousand/.test(sample)) return "THOUSAND";
  if (/หน่วย\s*[:：]?\s*บาท|\bbaht\b/.test(sample)) return "ONES";
  return fallback;
}

function detectCurrency(matrix: unknown[][], fallback: string) {
  const sample = matrix.slice(0, 12).flat().map((cell) => String(cell ?? "").toUpperCase()).join(" ");
  if (/\bUSD\b/.test(sample)) return "USD";
  if (/\bEUR\b/.test(sample)) return "EUR";
  if (/\bJPY\b/.test(sample)) return "JPY";
  if (/\bTHB\b|บาท/.test(sample)) return "THB";
  return fallback;
}

function formatMoney(value: number, currency = "THB") {
  const absolute = Math.abs(value);
  const unit = absolute >= 1_000_000_000 ? "B" : absolute >= 1_000_000 ? "M" : absolute >= 1_000 ? "K" : "";
  const divisor = unit === "B" ? 1_000_000_000 : unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1;
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value / divisor)}${unit} ${currency}`;
}

const formatRatio = (value: number | null) => value === null ? "—" : `${value.toFixed(2)}x`;
const formatPercent = (value: number | null | undefined) => value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

function TrendChart({ periods }: { periods: FinancialPeriod[] }) {
  if (periods.length < 2) return <div className="fa-empty-chart">เพิ่มข้อมูลอย่างน้อย 2 งวดเพื่อดูแนวโน้ม</div>;
  const series = [
    { label: "สินทรัพย์", color: "#1e766f", values: periods.map((item) => item.metrics.totalAssets) },
    { label: "หนี้สิน", color: "#d27b46", values: periods.map((item) => item.metrics.totalLiabilities) },
    { label: "ส่วนผู้ถือหุ้น", color: "#526c9b", values: periods.map((item) => item.metrics.totalEquity) },
  ];
  const maximum = Math.max(...series.flatMap((item) => item.values), 1);
  const points = (values: number[]) => values.map((value, index) => `${36 + (index * 520) / (values.length - 1)},${190 - (value / maximum) * 150}`).join(" ");
  return (
    <div className="fa-chart-wrap">
      <div className="fa-chart-legend">{series.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div>
      <svg viewBox="0 0 600 230" role="img" aria-label="แนวโน้มสินทรัพย์ หนี้สิน และส่วนของผู้ถือหุ้น">
        {[40, 90, 140, 190].map((y) => <line key={y} x1="36" y1={y} x2="556" y2={y} className="fa-chart-grid" />)}
        {series.map((item) => <polyline key={item.label} points={points(item.values)} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
        {periods.map((period, index) => <text key={period.periodEnd} x={36 + (index * 520) / (periods.length - 1)} y="218" textAnchor="middle">{period.periodEnd.slice(0, 4)}</text>)}
      </svg>
    </div>
  );
}

export default function FinancialAnalysis() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [companies, setCompanies] = useState<FinancialCompany[]>([]);
  const [accounts, setAccounts] = useState<CanonicalAccount[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [tab, setTab] = useState<"overview" | "import">("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyDraft, setCompanyDraft] = useState({ name: "", ticker: "", market: "SET", industry: "", defaultCurrency: "THB" });
  const [file, setFile] = useState<File | null>(null);
  const [unit, setUnit] = useState<FinancialUnit>("MILLION");
  const [currency, setCurrency] = useState("THB");
  const [preferredScope, setPreferredScope] = useState<FinancialScope>("CONSOLIDATED");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selectedSource, setSelectedSource] = useState<{ label: string; period: string; source: FinancialSource } | null>(null);

  useEffect(() => {
    void Promise.all([service.listCompanies(), service.accounts()])
      .then(([companyList, accountList]) => {
        setCompanies(companyList);
        setAccounts(accountList);
        if (companyList[0]) setSelectedCompanyId(companyList[0].id);
      })
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) { setDashboard(null); return; }
    setLoading(true);
    void service.dashboard(selectedCompanyId)
      .then(setDashboard)
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  }, [selectedCompanyId]);

  const currentCompany = companies.find((item) => item.id === selectedCompanyId) ?? null;
  const latest = dashboard?.periods.at(-1) ?? null;
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.code, account])), [accounts]);

  const createCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const created = await service.createCompany(companyDraft);
      setCompanies((current) => [...current, created]);
      setSelectedCompanyId(created.id);
      setCurrency(created.default_currency);
      setShowCompanyForm(false);
      setCompanyDraft({ name: "", ticker: "", market: "SET", industry: "", defaultCurrency: "THB" });
    } catch (reason) { setError(getErrorMessage(reason)); }
    finally { setBusy(false); }
  };

  const processFile = async (selectedFile: File, scope = preferredScope) => {
    if (!selectedCompanyId) { setError("กรุณาสร้างหรือเลือกบริษัทก่อนนำเข้าไฟล์"); return; }
    setBusy(true); setError(""); setNotice(""); setPreview(null);
    try {
      const extension = selectedFile.name.split(".").pop()?.toLowerCase();
      let matrix: unknown[][];
      if (extension === "csv") matrix = parseCsv(await selectedFile.text());
      else if (extension === "xlsx") {
        const workbook = await readXlsxFile(selectedFile);
        const workbookSheets = workbook
          .map(({ sheet, data }) => ({
            name: sheet,
            rows: data.map((row) => row.map(toWorkbookCell)),
          }))
          .filter((sheet) => sheet.rows.some((row) => row.some((cell) => String(cell ?? "").trim())));
        if (!workbookSheets.length) throw new Error("ไม่พบข้อมูลในไฟล์ Excel");
        const namedCandidates = workbookSheets.filter((sheet) => isBalanceSheetName(sheet.name));
        const balanceSheetCandidates = namedCandidates.length
          ? namedCandidates
          : workbookSheets.filter((sheet) => hasBalanceSheetContent(sheet.rows));
        const sheets = balanceSheetCandidates.length ? balanceSheetCandidates : workbookSheets;
        const headingRows = sheets.flatMap((sheet) => sheet.rows.slice(0, 12));
        const detectedHintUnit = detectUnit(headingRows, unit);
        const detectedHintCurrency = detectCurrency(headingRows, currency);
        const result = await service.aiPreview({
          companyId: selectedCompanyId,
          fileName: selectedFile.name,
          preferredScope: scope,
          currencyHint: detectedHintCurrency,
          unitHint: detectedHintUnit,
          sheets,
        });
        setUnit(result.unit);
        setCurrency(result.currency);
        setFile(selectedFile);
        setPreview(result);
        setNotice(`AI จัดรูปแบบกลางจาก ${sheets.length} sheet แล้ว (${result.scope === "CONSOLIDATED" ? "งบรวม" : "งบเฉพาะกิจการ"})${result.normalizationWarnings.length ? ` · มีคำเตือน ${result.normalizationWarnings.length} รายการ` : ""}`);
        return;
      }
      else throw new Error("รองรับเฉพาะไฟล์ CSV และ XLSX");
      const rows = matrixToRows(matrix);
      const detectedUnit = detectUnit(matrix, unit);
      const detectedCurrency = detectCurrency(matrix, currency);
      setUnit(detectedUnit);
      setCurrency(detectedCurrency);
      const result = await service.preview({ companyId: selectedCompanyId, unit: detectedUnit, rows });
      setFile(selectedFile);
      setPreview(result);
    } catch (reason) { setFile(null); setError(getErrorMessage(reason)); }
    finally { setBusy(false); }
  };

  const changeMapping = (index: number, canonicalCode: string) => {
    setPreview((current) => current ? {
      ...current,
      rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, canonicalCode: canonicalCode || null, confidence: canonicalCode ? 1 : 0, mappingSource: "MANUAL" } : row),
    } : current);
  };

  const revalidate = async () => {
    if (!preview || !selectedCompanyId) return;
    setBusy(true); setError("");
    try { setPreview(await service.preview({ companyId: selectedCompanyId, unit, rows: preview.rows })); }
    catch (reason) { setError(getErrorMessage(reason)); }
    finally { setBusy(false); }
  };

  const saveImport = async () => {
    if (!preview || !file || !selectedCompanyId) return;
    const unresolved = preview.rows.filter((row) => !row.canonicalCode);
    if (unresolved.length) { setError(`กรุณา map บัญชีให้ครบอีก ${unresolved.length} รายการ`); return; }
    setBusy(true); setError("");
    try {
      await service.importStatement({ companyId: selectedCompanyId, fileName: file.name, fileType: file.name.split(".").pop()?.toUpperCase() || "UNKNOWN", currency, unit, rows: preview.rows });
      setDashboard(await service.dashboard(selectedCompanyId));
      setNotice(`นำเข้า ${file.name} สำเร็จ`);
      setFile(null); setPreview(null); setTab("overview");
    } catch (reason) { setError(getErrorMessage(reason)); }
    finally { setBusy(false); }
  };

  return (
    <div className="financial-analysis-page">
      <header className="fa-hero">
        <div><span className="fa-eyebrow">FINANCIAL INTELLIGENCE</span><h1>วิเคราะห์งบการเงิน</h1><p>เปลี่ยน Balance Sheet ให้เป็นตัวเลขมาตรฐาน แนวโน้ม และสัญญาณที่ตรวจสอบย้อนกลับได้</p></div>
        <div className="fa-company-tools">
          <label><span>บริษัท</span><select value={selectedCompanyId ?? ""} onChange={(event) => { setSelectedCompanyId(event.target.value ? Number(event.target.value) : null); setPreview(null); }}><option value="">เลือกบริษัท</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.ticker ? `${company.ticker} — ` : ""}{company.name}</option>)}</select></label>
          <button type="button" className="fa-button secondary" onClick={() => setShowCompanyForm(true)}><i className="pi pi-plus" /> เพิ่มบริษัท</button>
        </div>
      </header>

      <nav className="fa-tabs" aria-label="Financial analysis sections">
        <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><i className="pi pi-chart-line" /> ภาพรวมและแนวโน้ม</button>
        <button type="button" className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}><i className="pi pi-upload" /> นำเข้างบดุล</button>
      </nav>

      {error && <div className="fa-alert error"><i className="pi pi-exclamation-circle" /><span>{error}</span><button onClick={() => setError("")} aria-label="ปิด">×</button></div>}
      {notice && <div className="fa-alert success"><i className="pi pi-check-circle" /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="ปิด">×</button></div>}
      {loading && <div className="fa-loading"><i className="pi pi-spin pi-spinner" /> กำลังโหลดข้อมูล...</div>}

      {!loading && tab === "overview" && (!currentCompany || !latest) && (
        <section className="fa-empty-state"><div className="fa-empty-icon"><i className="pi pi-chart-bar" /></div><h2>{currentCompany ? "ยังไม่มีงบการเงิน" : "เริ่มจากเพิ่มบริษัท"}</h2><p>{currentCompany ? "นำเข้า CSV หรือ Excel Balance Sheet เพื่อเริ่มวิเคราะห์" : "สร้างข้อมูลบริษัทก่อน แล้วจึงนำเข้างบดุลย้อนหลังได้หลายปี"}</p><button className="fa-button primary" type="button" onClick={() => currentCompany ? setTab("import") : setShowCompanyForm(true)}>{currentCompany ? "นำเข้างบดุล" : "เพิ่มบริษัทแรก"}</button></section>
      )}

      {!loading && tab === "overview" && currentCompany && latest && dashboard && (
        <div className="fa-dashboard">
          <section className="fa-overview-heading"><div><span className="fa-eyebrow">{currentCompany.market || "COMPANY"} · {latest.periodEnd}</span><h2>{currentCompany.ticker || currentCompany.name}</h2><p>ฐานะการเงินล่าสุดและการเปลี่ยนแปลงเทียบงวดก่อน</p></div><span className={`fa-validation ${latest.validation.status.toLowerCase()}`}><i className="pi pi-verified" /> สมการบัญชี: {latest.validation.status}</span></section>
          <section className="fa-metric-grid">
            {[{ label: "สินทรัพย์รวม", value: latest.metrics.totalAssets, growth: dashboard.growth?.assets, icon: "pi-building-columns" }, { label: "หนี้รวม", value: latest.metrics.totalDebt, growth: dashboard.growth?.debt, icon: "pi-credit-card" }, { label: "เงินสด", value: latest.metrics.cash, growth: dashboard.growth?.cash, icon: "pi-wallet" }, { label: "หนี้สุทธิ", value: latest.metrics.netDebt, growth: null, icon: "pi-chart-line" }, { label: "ส่วนผู้ถือหุ้น", value: latest.metrics.totalEquity, growth: dashboard.growth?.equity, icon: "pi-shield" }].map((item) => <article className="fa-metric-card" key={item.label}><span><i className={`pi ${item.icon}`} />{item.label}</span><strong>{formatMoney(item.value, currentCompany.default_currency)}</strong><small className={(item.growth ?? 0) < 0 ? "negative" : "positive"}>{formatPercent(item.growth)} <em>YoY</em></small></article>)}
          </section>
          <section className="fa-direction-grid">{dashboard.directions.map((item) => <article key={item.dimension}><div><span>{item.dimension}</span><i className={`pi ${item.trend.includes("INCREASING") ? "pi-arrow-up-right" : item.trend.includes("DECREASING") ? "pi-arrow-down-right" : "pi-arrow-right"}`} /></div><strong>{item.trend.replaceAll("_", " ")}</strong><p>{item.evidence}</p></article>)}</section>
          <section className="fa-two-column">
            <article className="fa-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">TREND</span><h3>โครงสร้างฐานะการเงิน</h3></div><span>{dashboard.periods.length} งวด</span></div><TrendChart periods={dashboard.periods} /></article>
            <article className="fa-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">RATIOS</span><h3>อัตราส่วนสำคัญ</h3></div></div><div className="fa-ratio-list">{[{ label: "Current Ratio", value: formatRatio(latest.metrics.currentRatio) }, { label: "Quick Ratio", value: formatRatio(latest.metrics.quickRatio) }, { label: "Debt / Equity", value: formatRatio(latest.metrics.debtToEquity) }, { label: "Debt / Assets", value: formatPercent(latest.metrics.debtToAssets === null ? null : latest.metrics.debtToAssets * 100) }, { label: "Equity / Assets", value: formatPercent(latest.metrics.equityToAssets === null ? null : latest.metrics.equityToAssets * 100) }].map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></article>
          </section>
          <section className="fa-two-column">
            <article className="fa-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">ASSET MIX</span><h3>สัดส่วนสินทรัพย์</h3></div></div><div className="fa-composition">{[{ code: "ASSET.CASH", label: "เงินสด" }, { code: "ASSET.RECEIVABLE", label: "ลูกหนี้" }, { code: "ASSET.INVENTORY", label: "สินค้าคงเหลือ" }, { code: "ASSET.PPE", label: "ที่ดิน อาคาร อุปกรณ์" }, { code: "ASSET.INVESTMENT", label: "เงินลงทุน" }].map((item) => { const percent = latest.metrics.totalAssets ? ((latest.values[item.code] ?? 0) / latest.metrics.totalAssets) * 100 : 0; return <div key={item.code}><span>{item.label}</span><div><i style={{ width: `${Math.min(percent, 100)}%` }} /></div><strong>{percent.toFixed(1)}%</strong></div>; })}</div></article>
            <article className="fa-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">DETERMINISTIC SUMMARY</span><h3>สรุปภาพรวม</h3></div></div><p className="fa-summary">{dashboard.summary}</p><small className="fa-disclaimer"><i className="pi pi-info-circle" /> สรุปจาก metrics และ rule ที่คำนวณได้ ไม่ใช่คำแนะนำการลงทุน</small></article>
          </section>
          <section className="fa-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">SIGNAL FEED</span><h3>สัญญาณที่ควรติดตาม</h3></div></div><div className="fa-signals">{dashboard.signals.map((signal) => <article className={signal.severity} key={signal.id}><i className={`pi ${signal.severity === "info" ? "pi-info-circle" : "pi-exclamation-triangle"}`} /><div><h4>{signal.title}</h4><p>{signal.message}</p><ul>{signal.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></div></article>)}</div></section>
          <section className="fa-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">HISTORY & AUDIT</span><h3>งบดุลย้อนหลัง</h3></div><span>คลิกตัวเลขเพื่อดูต้นทาง</span></div><div className="fa-table-wrap"><table className="fa-history-table"><thead><tr><th>บัญชีมาตรฐาน</th>{dashboard.periods.map((period) => <th key={period.periodEnd}>{period.periodEnd}</th>)}</tr></thead><tbody>{importantAccounts.map((code) => <tr key={code}><th><span>{accountMap.get(code)?.name || code}</span><small>{code}</small></th>{dashboard.periods.map((period) => <td key={period.periodEnd}><button type="button" disabled={!period.sources[code]} onClick={() => period.sources[code] && setSelectedSource({ label: accountMap.get(code)?.name || code, period: period.periodEnd, source: period.sources[code] })}>{formatMoney(period.values[code] ?? 0, currentCompany.default_currency)}</button></td>)}</tr>)}</tbody></table></div></section>
        </div>
      )}

      {!loading && tab === "import" && (
        <div className="fa-import-layout">
          <section className="fa-import-steps">{["1. เลือกไฟล์", "2. ตรวจ Mapping", "3. Validation", "4. บันทึกและวิเคราะห์"].map((step, index) => <span className={(preview ? index <= 2 : index === 0) ? "active" : ""} key={step}>{step}</span>)}</section>
          <section className="fa-panel fa-import-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">CSV / EXCEL IMPORT</span><h3>นำเข้า Balance Sheet</h3></div></div>
            <div className="fa-import-meta"><label><span>บริษัท</span><select value={selectedCompanyId ?? ""} onChange={(event) => setSelectedCompanyId(event.target.value ? Number(event.target.value) : null)}><option value="">เลือกบริษัท</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label><label><span>ขอบเขตงบ</span><select value={preferredScope} onChange={(event) => { const nextScope = event.target.value as FinancialScope; setPreferredScope(nextScope); if (file?.name.toLowerCase().endsWith(".xlsx")) void processFile(file, nextScope); }}><option value="CONSOLIDATED">งบการเงินรวม</option><option value="SEPARATE">งบเฉพาะกิจการ</option></select></label><label><span>สกุลเงิน</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>THB</option><option>USD</option><option>EUR</option><option>JPY</option></select></label><label><span>หน่วยในไฟล์</span><select value={unit} onChange={(event) => setUnit(event.target.value as FinancialUnit)}><option value="ONES">หน่วย</option><option value="THOUSAND">พัน</option><option value="MILLION">ล้าน</option><option value="BILLION">พันล้าน</option></select></label></div>
            <div className="fa-dropzone" onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = event.dataTransfer.files[0]; if (dropped) void processFile(dropped); }}><input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void processFile(selected); }} /><i className="pi pi-cloud-upload" /><h4>{file ? file.name : "วางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์"}</h4><p>XLSX ใช้ AI อ่านหลาย sheet เป็น format กลาง · ตัวเลขทุกค่าตรวจกลับกับ cell ต้นทางก่อนแสดง</p>{busy && <span><i className="pi pi-spin pi-spinner" /> กำลังอ่านและตรวจสอบไฟล์</span>}</div>
          </section>
          {preview && <><section className="fa-panel"><div className="fa-panel-heading"><div><span className="fa-eyebrow">MAPPING REVIEW</span><h3>ตรวจสอบบัญชีมาตรฐาน</h3></div><span className={preview.requiresMapping ? "fa-count warning" : "fa-count success"}>{preview.rows.filter((row) => row.canonicalCode).length}/{preview.rows.length} mapped</span></div><div className="fa-table-wrap"><table className="fa-mapping-table"><thead><tr><th>ต้นฉบับ</th><th>Canonical Account</th><th>Confidence</th><th>งวดที่พบ</th></tr></thead><tbody>{preview.rows.map((row, index) => <tr className={!row.canonicalCode ? "needs-review" : ""} key={`${row.sourceSheet ?? "sheet"}-${row.sourceRow}-${row.originalLabel}`}><td><strong>{row.originalLabel}</strong><small>{row.sourceSheet ? `${row.sourceSheet} · ` : ""}แถว {row.sourceRow}</small></td><td><select value={row.canonicalCode ?? ""} onChange={(event) => changeMapping(index, event.target.value)}><option value="">— เลือกบัญชี —</option>{["ASSET", "LIABILITY", "EQUITY"].map((category) => <optgroup label={category} key={category}>{accounts.filter((account) => account.category === category).map((account) => <option value={account.code} key={account.code}>{account.name} ({account.code})</option>)}</optgroup>)}</select></td><td><span className={`fa-confidence ${row.confidence >= 0.85 ? "high" : row.confidence >= 0.7 ? "medium" : "low"}`}>{Math.round(row.confidence * 100)}%</span><small>{row.mappingSource}</small></td><td>{row.values.map((value) => value.periodEnd.slice(0, 4)).join(", ")}</td></tr>)}</tbody></table></div><div className="fa-panel-actions"><button className="fa-button secondary" type="button" onClick={() => void revalidate()} disabled={busy}><i className="pi pi-refresh" /> ตรวจสมการใหม่</button></div></section>
          <section className="fa-validation-grid">{preview.validation.map((item) => <article className={item.status.toLowerCase()} key={item.periodEnd}><div><i className={`pi ${item.status === "PASS" ? "pi-check-circle" : "pi-exclamation-triangle"}`} /><span>{item.periodEnd}</span><strong>{item.status}</strong></div><p>Assets = Liabilities + Equity</p><dl><div><dt>Assets</dt><dd>{formatMoney(item.totalAssets, currency)}</dd></div><div><dt>Liabilities + Equity</dt><dd>{formatMoney(item.totalLiabilities + item.totalEquity, currency)}</dd></div><div><dt>Difference</dt><dd>{formatMoney(item.difference, currency)} ({item.differencePercent.toFixed(2)}%)</dd></div></dl></article>)}</section>
          {preview.duplicates.length > 0 && <div className="fa-alert error"><i className="pi pi-clone" /><span>พบบัญชีซ้ำ {preview.duplicates.map((item) => `${item.canonicalCode} (${item.periodEnd})`).join(", ")}</span></div>}
          <div className="fa-import-submit"><div><strong>พร้อมนำเข้า {preview.rows.length} บัญชี</strong><p>ระบบจะเก็บค่าต้นฉบับ, แถวต้นทาง และ mapping confidence ไว้ตรวจสอบย้อนหลัง</p></div><button className="fa-button primary" type="button" disabled={busy || preview.rows.some((row) => !row.canonicalCode) || preview.duplicates.length > 0} onClick={() => void saveImport()}>{busy ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-check" />} บันทึกและวิเคราะห์</button></div></>}
        </div>
      )}

      {showCompanyForm && <div className="fa-modal-backdrop" onMouseDown={() => !busy && setShowCompanyForm(false)}><section className="fa-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="fa-panel-heading"><div><span className="fa-eyebrow">NEW COMPANY</span><h3>เพิ่มบริษัท</h3></div><button className="fa-icon-button" type="button" onClick={() => setShowCompanyForm(false)} aria-label="ปิด"><i className="pi pi-times" /></button></div><form onSubmit={(event) => void createCompany(event)}><label><span>ชื่อบริษัท *</span><input required value={companyDraft.name} onChange={(event) => setCompanyDraft({ ...companyDraft, name: event.target.value })} placeholder="บริษัท ตัวอย่าง จำกัด (มหาชน)" /></label><div className="fa-form-grid"><label><span>ชื่อย่อ</span><input value={companyDraft.ticker} onChange={(event) => setCompanyDraft({ ...companyDraft, ticker: event.target.value })} placeholder="GULF" /></label><label><span>ตลาด</span><input value={companyDraft.market} onChange={(event) => setCompanyDraft({ ...companyDraft, market: event.target.value })} placeholder="SET" /></label><label><span>อุตสาหกรรม</span><input value={companyDraft.industry} onChange={(event) => setCompanyDraft({ ...companyDraft, industry: event.target.value })} placeholder="Energy" /></label><label><span>สกุลเงินหลัก</span><select value={companyDraft.defaultCurrency} onChange={(event) => setCompanyDraft({ ...companyDraft, defaultCurrency: event.target.value })}><option>THB</option><option>USD</option><option>EUR</option></select></label></div><div className="fa-panel-actions"><button className="fa-button secondary" type="button" onClick={() => setShowCompanyForm(false)}>ยกเลิก</button><button className="fa-button primary" disabled={busy} type="submit">บันทึกบริษัท</button></div></form></section></div>}
      {selectedSource && <div className="fa-modal-backdrop" onMouseDown={() => setSelectedSource(null)}><section className="fa-modal fa-source-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="fa-panel-heading"><div><span className="fa-eyebrow">SOURCE TRACE</span><h3>{selectedSource.label}</h3></div><button className="fa-icon-button" type="button" onClick={() => setSelectedSource(null)} aria-label="ปิด"><i className="pi pi-times" /></button></div><dl><div><dt>งวด</dt><dd>{selectedSource.period}</dd></div><div><dt>ไฟล์ต้นทาง</dt><dd>{dashboard?.documents.find((item) => item.id === selectedSource.source.documentId)?.file_name || `Document #${selectedSource.source.documentId}`}</dd></div>{selectedSource.source.sourceSheet && <div><dt>Sheet</dt><dd>{selectedSource.source.sourceSheet}</dd></div>}<div><dt>Original label</dt><dd>{selectedSource.source.originalLabel}</dd></div><div><dt>Original value</dt><dd>{selectedSource.source.originalValue}</dd></div><div><dt>Source cell</dt><dd>R{selectedSource.source.sourceRow}{selectedSource.source.sourceColumn ? `C${selectedSource.source.sourceColumn}` : ""}</dd></div><div><dt>Mapping confidence</dt><dd>{Math.round(selectedSource.source.confidence * 100)}%</dd></div></dl></section></div>}
    </div>
  );
}
