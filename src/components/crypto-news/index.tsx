import { useEffect, useMemo, useState } from "react";
import Container from "../../utilities/container";
import CryptoNewsService, {
  type CryptoNews,
  type NewsFilters,
} from "../../services/crypto-news.service";
import { errortoast, successtoast } from "../../utilities/toast";

const SENTIMENTS = ["Bullish", "Bearish", "Neutral"] as const;
const CREDIBILITIES = ["High", "Medium", "Low"] as const;

function sentimentStyle(s?: string | null) {
  if (s === "Bullish") return "bg-green-50 text-green-700 border-green-200";
  if (s === "Bearish") return "bg-red-50 text-red-700 border-red-200";
  return "bg-gray-50 text-gray-600 border-gray-200";
}
function sentimentEmoji(s?: string | null) {
  if (s === "Bullish") return "🟢";
  if (s === "Bearish") return "🔴";
  return "🟡";
}
function credibilityStyle(c?: string | null) {
  if (c === "High") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  if (c === "Low") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-gray-50 text-gray-600 border-gray-200";
}
function credibilityEmoji(c?: string | null) {
  if (c === "High") return "✅";
  if (c === "Medium") return "⚠️";
  if (c === "Low") return "❌";
  return "❓";
}

export default function CryptoNews() {
  const service = useMemo(() => new CryptoNewsService(), []);

  const [items, setItems] = useState<CryptoNews[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState<string>("");
  const [credibility, setCredibility] = useState<string>("");
  const [coin, setCoin] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(3);
  const [filters, setFilters] = useState<NewsFilters>({
    sentiments: [],
    credibilities: [],
    coins: [],
  });
  const [expanded, setExpanded] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await service.list({
        sentiment: sentiment || undefined,
        credibility: credibility || undefined,
        coin: coin || undefined,
        search: search || undefined,
        minScore: minScore || undefined,
      });
      setItems(data);
    } catch (e: any) {
      errortoast({ text: e.message || "โหลดข้อมูลไม่สำเร็จ" });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    service
      .getFilters()
      .then(setFilters)
      .catch(() => {});
  }, [service]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentiment, credibility, coin, minScore]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refresh();
  };

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

  const coinOptions = useMemo(() => {
    const set = new Set<string>(filters.coins);
    return Array.from(set).sort();
  }, [filters.coins]);

  return (
    <Container>
      <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-6">
          <header className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
              ข่าวคริปโต
            </h1>
            <p className="text-gray-500">
              ข่าวที่ระบบดึงและวิเคราะห์ทุกชั่วโมง
            </p>
          </header>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Sentiment */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Sentiment
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterPill
                    active={sentiment === ""}
                    onClick={() => setSentiment("")}
                  >
                    ทั้งหมด
                  </FilterPill>
                  {SENTIMENTS.map((s) => (
                    <FilterPill
                      key={s}
                      active={sentiment === s}
                      onClick={() => setSentiment(s)}
                    >
                      {sentimentEmoji(s)} {s}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* Credibility */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  ความน่าเชื่อถือ
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterPill
                    active={credibility === ""}
                    onClick={() => setCredibility("")}
                  >
                    ทั้งหมด
                  </FilterPill>
                  {CREDIBILITIES.map((c) => (
                    <FilterPill
                      key={c}
                      active={credibility === c}
                      onClick={() => setCredibility(c)}
                    >
                      {credibilityEmoji(c)} {c}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* Coin */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  เหรียญ
                </label>
                <select
                  value={coin}
                  onChange={(e) => setCoin(e.target.value)}
                  className="block border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-32"
                >
                  <option value="">ทั้งหมด</option>
                  {coinOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Score */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Score ≥ {minScore}
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-32 accent-purple-primary"
                />
              </div>
            </div>

            {/* Search */}
            <form onSubmit={onSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาในชื่อข่าว..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-purple-primary hover:bg-purple-hover text-white text-sm"
              >
                ค้นหา
              </button>
            </form>
          </div>

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              กำลังโหลด...
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              ไม่พบข่าว
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
                    {/* Header */}
                    <div className="flex flex-wrap items-start gap-3">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-gray-800 hover:text-purple-primary line-clamp-2 flex-1 min-w-0"
                      >
                        {item.title}
                      </a>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {item.sentiment && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sentimentStyle(item.sentiment)}`}
                        >
                          {sentimentEmoji(item.sentiment)} {item.sentiment}
                        </span>
                      )}
                      {item.credibility && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${credibilityStyle(item.credibility)}`}
                        >
                          {credibilityEmoji(item.credibility)} {item.credibility}
                        </span>
                      )}
                      {item.source_attribution_score != null && (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-primary text-xs font-semibold border border-purple-200">
                          Score {item.source_attribution_score}/10
                        </span>
                      )}
                      {item.coins_mentioned && item.coins_mentioned.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.coins_mentioned.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {new Date(item.analyzed_at).toLocaleString("th-TH")}
                      </span>
                    </div>

                    {/* Summary */}
                    {item.summary_th && (
                      <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                        {item.summary_th}
                      </p>
                    )}

                    {/* Red flags */}
                    {item.red_flags && item.red_flags.length > 0 && (
                      <div className="mt-2 text-xs text-rose-600">
                        🚩 Red flags: {item.red_flags.join(", ")}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      <button
                        onClick={() => setExpanded(open ? null : item.id)}
                        className="text-purple-primary hover:text-purple-hover font-medium"
                      >
                        {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                      </button>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-purple-primary"
                      >
                        เปิดข่าว ↗
                      </a>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="ml-auto text-red-500 hover:text-red-600"
                      >
                        ลบ
                      </button>
                    </div>

                    {open && (
                      <div className="mt-3 border-t border-gray-100 pt-3 space-y-2 text-sm text-gray-700">
                        {item.sentiment_reason && (
                          <Detail label="เหตุผล Sentiment">
                            {item.sentiment_reason}
                          </Detail>
                        )}
                        {item.recommended_action && (
                          <Detail label="คำแนะนำ">
                            {item.recommended_action}
                          </Detail>
                        )}
                        {item.source_attribution_notes && (
                          <Detail label="หมายเหตุ Attribution">
                            {item.source_attribution_notes}
                          </Detail>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>
                            <b>Source:</b> {item.source ?? "-"}
                          </span>
                          {item.pub_date && (
                            <span>
                              <b>เผยแพร่:</b>{" "}
                              {new Date(item.pub_date).toLocaleString("th-TH")}
                            </span>
                          )}
                          <span>
                            <b>pre_score:</b> {item.pre_score ?? "-"}
                          </span>
                          {item.parse_ok === false && (
                            <span className="text-amber-600">
                              ⚠️ AI parse error
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? "bg-purple-primary text-white border-purple-primary"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p>
      <span className="font-semibold text-gray-800">{label}: </span>
      {children}
    </p>
  );
}
