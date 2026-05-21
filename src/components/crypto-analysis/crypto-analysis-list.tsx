import { useEffect, useMemo, useState } from "react";
import CryptoAnalysisService, {
  type CryptoAnalysis,
} from "../../services/crypto-analysis.service";
import { errortoast, successtoast } from "../../utilities/toast";

const COMMON_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];

function trendColor(trend?: string | null) {
  const v = (trend || "").toUpperCase();
  if (v.includes("BULL")) return "text-green-600 bg-green-50 border-green-200";
  if (v.includes("BEAR")) return "text-red-600 bg-red-50 border-red-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

function recommendationColor(rec?: string | null) {
  const v = (rec || "").toLowerCase();
  if (v.includes("long")) return "text-green-600 bg-green-50 border-green-200";
  if (v.includes("short")) return "text-red-600 bg-red-50 border-red-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function CryptoAnalysisList() {
  const service = useMemo(() => new CryptoAnalysisService(), []);
  const [items, setItems] = useState<CryptoAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<string>("");
  const [coin, setCoin] = useState<string>("");
  const [filters, setFilters] = useState<{
    timeframes: string[];
    coins: string[];
  }>({ timeframes: [], coins: [] });
  const [expanded, setExpanded] = useState<number | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await service.list({
        timeframe: timeframe || undefined,
        coin: coin || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      errortoast({ text: e.message || "โหลดข้อมูลไม่สำเร็จ" });
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    service.getFilters().then(setFilters).catch(() => {});
  }, [service]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [timeframe, coin, pageSize]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, coin, page, pageSize]);

  const tfOptions = useMemo(() => {
    const set = new Set<string>([...COMMON_TIMEFRAMES, ...filters.timeframes]);
    return Array.from(set);
  }, [filters.timeframes]);

  const handleDelete = async (id: number) => {
    if (!confirm("ยืนยันลบรายการนี้?")) return;
    try {
      await service.remove(id);
      successtoast({ text: "ลบสำเร็จ" });
      refresh();
    } catch (e: any) {
      errortoast({ text: e.message || "ลบไม่สำเร็จ" });
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            รายการที่บันทึกไว้
          </h1>
        </header>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Timeframe</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimeframe("")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  timeframe === ""
                    ? "bg-purple-primary text-white border-purple-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                ทั้งหมด
              </button>
              {tfOptions.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    timeframe === tf
                      ? "bg-purple-primary text-white border-purple-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 ml-auto">
            <label className="text-xs text-gray-500 font-medium">เหรียญ</label>
            <select
              value={coin}
              onChange={(e) => setCoin(e.target.value)}
              className="block border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">ทั้งหมด</option>
              {filters.coins.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            กำลังโหลด...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            ไม่พบข้อมูล
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const open = expanded === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-bold">{item.coin}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-primary text-xs font-semibold border border-purple-200">
                      {item.timeframe}
                    </span>
                    {item.trend && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${trendColor(
                          item.trend,
                        )}`}
                      >
                        {item.trend}
                      </span>
                    )}
                    {item.recommendation && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${recommendationColor(
                          item.recommendation,
                        )}`}
                      >
                        {item.recommendation}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-500">
                      {new Date(item.analyzed_at).toLocaleString("th-TH")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                    <Mini label="Entry" value={item.entry_price} />
                    <Mini label="SL" value={item.stop_loss} />
                    <Mini label="T1" value={item.target_1} />
                    <Mini label="T2" value={item.target_2} />
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setExpanded(open ? null : item.id)}
                      className="text-sm text-purple-primary hover:text-purple-hover font-medium"
                    >
                      {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                    </button>
                    {/* <button
                      onClick={() => handleDelete(item.id)}
                      className="ml-auto text-sm text-red-500 hover:text-red-600"
                    >
                      ลบ
                    </button> */}
                  </div>

                  {open && (
                    <div className="mt-3 border-t border-gray-100 pt-3 space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Mini label="แนวต้าน 1" value={item.resistance_1} />
                        <Mini label="แนวต้าน 2" value={item.resistance_2} />
                        <Mini label="แนวรับ 1" value={item.support_1} />
                        <Mini label="แนวรับ 2" value={item.support_2} />
                        <Mini label="RSI" value={item.rsi} />
                        <Mini label="ATR" value={item.atr} />
                      </div>
                      {item.trend_reason && (
                        <p className="text-gray-600">
                          <span className="font-semibold">เหตุผลแนวโน้ม: </span>
                          {item.trend_reason}
                        </p>
                      )}
                      {item.recommendation_reason && (
                        <p className="text-gray-600">
                          <span className="font-semibold">เหตุผลคำแนะนำ: </span>
                          {item.recommendation_reason}
                        </p>
                      )}
                      <details className="bg-gray-50 rounded-lg p-3">
                        <summary className="cursor-pointer text-gray-500 text-xs font-semibold">
                          ดูข้อความต้นฉบับ
                        </summary>
                        <pre className="whitespace-pre-wrap text-xs text-gray-700 mt-2 font-mono">
                          {item.raw_text}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-3">
            <div className="text-sm text-gray-500">
              ทั้งหมด <span className="font-semibold text-gray-700">{total}</span>{" "}
              รายการ • หน้า{" "}
              <span className="font-semibold text-gray-700">{page}</span>/
              {totalPages}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-gray-500">ต่อหน้า</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <PageBtn
                disabled={page <= 1}
                onClick={() => setPage(1)}
                aria-label="หน้าแรก"
              >
                «
              </PageBtn>
              <PageBtn
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ก่อนหน้า
              </PageBtn>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span
                    key={`dot-${i}`}
                    className="px-2 text-gray-400 select-none"
                  >
                    …
                  </span>
                ) : (
                  <PageBtn
                    key={p}
                    active={p === page}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </PageBtn>
                ),
              )}

              <PageBtn
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ถัดไป
              </PageBtn>
              <PageBtn
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="หน้าสุดท้าย"
              >
                »
              </PageBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PageBtn({
  active,
  disabled,
  onClick,
  children,
  ...rest
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-9 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? "bg-purple-primary text-white border-purple-primary"
          : disabled
            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

function Mini({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-gray-50 rounded-md px-2.5 py-1.5 border border-gray-100">
      <span className="text-xs text-gray-500 mr-1.5">{label}:</span>
      <span className="font-semibold">{value ?? "-"}</span>
    </div>
  );
}
