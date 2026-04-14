import { useEffect, useMemo, useState } from "react";
import { Chart } from "primereact/chart";
import BankStatementService, {
  type Transaction,
} from "../../services/bank-statement.service";

type ChartType = "pie" | "bar" | "doughnut" | "line";
type FilterMode = "year" | "month" | "day";
type GroupBy = "type" | "details";

const CHART_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "pie", label: "วงกลม (Pie)" },
  { value: "doughnut", label: "โดนัท (Doughnut)" },
  { value: "bar", label: "แท่ง (Bar)" },
  { value: "line", label: "เส้น (Line)" },
];

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDate(datetime: string) {
  // format: "DD/MM/YYYY HH:mm:ss"
  const [datePart] = datetime.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  return { day, month, year };
}

export default function Dashboard() {
  const now = new Date();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [groupBy, setGroupBy] = useState<GroupBy>("type");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const service = useMemo(() => new BankStatementService(), []);

  // Fetch transactions when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: { year?: number; month?: number; day?: number } = {
          year: selectedYear,
        };
        if (filterMode === "month" || filterMode === "day") {
          params.month = selectedMonth;
        }
        if (filterMode === "day") {
          params.day = selectedDay;
        }
        const data = await service.getTransactions(params);
        setTransactions(data);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedMonth, selectedDay, filterMode, service]);

  // Group transactions by type or details
  const byGroup = useMemo(() => {
    const map: Record<string, { withdrawal: number; deposit: number }> = {};
    transactions.forEach((t) => {
      let key: string;
      if (groupBy === "details") {
        // Use first line of details as key (e.g. "SCB นาง ณัฐริณีย์ เฮนนิงส์")
        const firstLine = (t.details || "").split("\n")[0].trim();
        key = firstLine || "(ไม่มีรายละเอียด)";
      } else {
        key = t.transaction_type;
      }
      if (!map[key]) map[key] = { withdrawal: 0, deposit: 0 };
      map[key].withdrawal += parseFloat(t.withdrawal) || 0;
      map[key].deposit += parseFloat(t.deposit) || 0;
    });
    return map;
  }, [transactions, groupBy]);

  // Group by time bucket for trend chart
  const byTime = useMemo(() => {
    const map: Record<string, { withdrawal: number; deposit: number }> = {};

    transactions.forEach((t) => {
      const { day, month } = parseDate(t.datetime);
      let key: string;
      if (filterMode === "year") {
        key = MONTHS[month - 1];
      } else if (filterMode === "month") {
        key = `${day}`;
      } else {
        // day mode — group by hour
        const timePart = t.datetime.split(" ")[1];
        const hour = timePart ? timePart.split(":")[0] : "00";
        key = `${hour}:00`;
      }

      if (!map[key]) map[key] = { withdrawal: 0, deposit: 0 };
      map[key].withdrawal += parseFloat(t.withdrawal) || 0;
      map[key].deposit += parseFloat(t.deposit) || 0;
    });
    return map;
  }, [transactions, filterMode]);

  // Summary totals
  const totalWithdrawal = transactions.reduce(
    (s, t) => s + (parseFloat(t.withdrawal) || 0),
    0
  );
  const totalDeposit = transactions.reduce(
    (s, t) => s + (parseFloat(t.deposit) || 0),
    0
  );

  // ---- Chart Data ----

  const COLORS = [
    "#7c3aed", "#6d28d9", "#a78bfa", "#c4b5fd", "#ddd6fe",
    "#f472b6", "#fb923c", "#facc15", "#4ade80", "#22d3ee",
    "#60a5fa", "#e879f9", "#f87171", "#34d399", "#fbbf24",
  ];

  // Pie / Doughnut — separate data for withdrawal and deposit
  const pieWithdrawalData = useMemo(() => {
    const entries = Object.entries(byGroup).filter(([, v]) => v.withdrawal > 0);
    return {
      labels: entries.map(([k]) => k),
      datasets: [
        {
          data: entries.map(([, v]) => v.withdrawal),
          backgroundColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        },
      ],
    };
  }, [byGroup]);

  const pieDepositData = useMemo(() => {
    const entries = Object.entries(byGroup).filter(([, v]) => v.deposit > 0);
    return {
      labels: entries.map(([k]) => k),
      datasets: [
        {
          data: entries.map(([, v]) => v.deposit),
          backgroundColor: entries.map((_, i) => COLORS[i % COLORS.length]),
        },
      ],
    };
  }, [byGroup]);

  // Bar / Line — withdrawal vs deposit over time
  const timeLabels = useMemo(() => {
    const keys = Object.keys(byTime);
    if (filterMode === "year") {
      // sort by month index
      return keys.sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
    }
    return keys.sort((a, b) => {
      const na = parseInt(a);
      const nb = parseInt(b);
      return na - nb;
    });
  }, [byTime, filterMode]);

  const barData = useMemo(
    () => ({
      labels: timeLabels,
      datasets: [
        {
          label: "รายจ่าย",
          data: timeLabels.map((l) => byTime[l]?.withdrawal || 0),
          backgroundColor: "#f87171",
          borderColor: "#ef4444",
          borderWidth: 1,
        },
        {
          label: "รายรับ",
          data: timeLabels.map((l) => byTime[l]?.deposit || 0),
          backgroundColor: "#4ade80",
          borderColor: "#22c55e",
          borderWidth: 1,
        },
      ],
    }),
    [timeLabels, byTime]
  );

  const isPieType = chartType === "pie" || chartType === "doughnut";

  const chartOptions = useMemo(() => {
    if (chartType === "pie" || chartType === "doughnut") {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" as const, labels: { boxWidth: 14 } },
        },
      };
    }
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v: number) => v.toLocaleString("th-TH"),
          },
        },
      },
    };
  }, [chartType]);

  // Year range
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            Dashboard
          </h1>
          <p className="text-gray-500">สรุปรายรับ-รายจ่ายจากรายการเดินบัญชี</p>
        </header>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
          {/* Filter mode */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">มุมมอง</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["year", "month", "day"] as FilterMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filterMode === mode
                      ? "bg-purple-primary text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {mode === "year" ? "ปี" : mode === "month" ? "เดือน" : "วัน"}
                </button>
              ))}
            </div>
          </div>

          {/* Year */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">ปี</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="block border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          {(filterMode === "month" || filterMode === "day") && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">เดือน</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="block border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day */}
          {filterMode === "day" && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">วัน</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="block border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group by */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">จัดกลุ่มตาม</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="block border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="type">ประเภทรายการ</option>
              <option value="details">รายละเอียด (ปลายทาง)</option>
            </select>
          </div>

          {/* Chart type */}
          <div className="space-y-1 ml-auto">
            <label className="text-xs text-gray-500 font-medium">รูปแบบกราฟ</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="block border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {CHART_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-500">จำนวนรายการ</p>
            <p className="text-3xl font-bold text-purple-primary mt-1">
              {loading ? "..." : transactions.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-500">รวมรายจ่าย</p>
            <p className="text-3xl font-bold text-red-500 mt-1">
              {loading
                ? "..."
                : totalWithdrawal.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-500">รวมรายรับ</p>
            <p className="text-3xl font-bold text-green-500 mt-1">
              {loading
                ? "..."
                : totalDeposit.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
            </p>
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-80 flex items-center justify-center text-gray-400">
            กำลังโหลด...
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-80 flex items-center justify-center text-gray-400">
            ไม่พบข้อมูลในช่วงเวลาที่เลือก
          </div>
        ) : isPieType ? (
          /* Pie / Doughnut — two charts side by side */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-red-500">
                รายจ่ายตาม{groupBy === "details" ? "รายละเอียด" : "ประเภท"}
              </h2>
              {pieWithdrawalData.labels.length > 0 ? (
                <div className="h-72">
                  <Chart type={chartType} data={pieWithdrawalData} options={chartOptions} />
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-gray-400 text-sm">ไม่มีรายจ่าย</div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-green-500">
                รายรับตาม{groupBy === "details" ? "รายละเอียด" : "ประเภท"}
              </h2>
              {pieDepositData.labels.length > 0 ? (
                <div className="h-72">
                  <Chart type={chartType} data={pieDepositData} options={chartOptions} />
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-gray-400 text-sm">ไม่มีรายรับ</div>
              )}
            </div>
          </div>
        ) : (
          /* Bar / Line — withdrawal vs deposit over time */
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              รายรับ-รายจ่ายตามช่วงเวลา
            </h2>
            <div className="h-80">
              <Chart type={chartType} data={barData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Top lists — withdrawal & deposit side by side */}
        {!loading && transactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top withdrawal */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-red-500">
                รายจ่ายสูงสุดตาม{groupBy === "details" ? "รายละเอียด" : "ประเภท"}
              </h2>
              <div className="space-y-3">
                {Object.entries(byGroup)
                  .filter(([, v]) => v.withdrawal > 0)
                  .sort((a, b) => b[1].withdrawal - a[1].withdrawal)
                  .map(([name, val]) => {
                    const pct =
                      totalWithdrawal > 0
                        ? (val.withdrawal / totalWithdrawal) * 100
                        : 0;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium truncate mr-2">{name}</span>
                          <span className="text-gray-500 shrink-0">
                            {val.withdrawal.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-red-400 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {Object.values(byGroup).every((v) => v.withdrawal === 0) && (
                  <p className="text-sm text-gray-400 text-center">ไม่มีรายจ่าย</p>
                )}
              </div>
            </div>

            {/* Top deposit */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 text-green-500">
                รายรับสูงสุดตาม{groupBy === "details" ? "รายละเอียด" : "ประเภท"}
              </h2>
              <div className="space-y-3">
                {Object.entries(byGroup)
                  .filter(([, v]) => v.deposit > 0)
                  .sort((a, b) => b[1].deposit - a[1].deposit)
                  .map(([name, val]) => {
                    const pct =
                      totalDeposit > 0
                        ? (val.deposit / totalDeposit) * 100
                        : 0;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium truncate mr-2">{name}</span>
                          <span className="text-gray-500 shrink-0">
                            {val.deposit.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-green-400 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {Object.values(byGroup).every((v) => v.deposit === 0) && (
                  <p className="text-sm text-gray-400 text-center">ไม่มีรายรับ</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
