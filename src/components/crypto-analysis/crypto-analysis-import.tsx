import { useMemo, useState } from "react";
import CryptoAnalysisService, {
  parseAnalysisText,
  type CryptoAnalysisInput,
} from "../../services/crypto-analysis.service";
import { errortoast, successtoast, warntoast } from "../../utilities/toast";

const SAMPLE = `วิเคราะห์ที่เวลา : 19/5/2569 21:02:35
เหรียญ : BNB/USDT
timeframe : 1D
ผลการวิเคราะห์ : ## 📊 สรุปแนวโน้ม
BEARISH - เหตุผล: ...`;

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

export default function CryptoAnalysisImport() {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<CryptoAnalysisInput | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const service = useMemo(() => new CryptoAnalysisService(), []);

  const handleParse = () => {
    if (!text.trim()) {
      warntoast({ text: "กรุณาวางข้อมูลก่อน" });
      return;
    }
    const result = parseAnalysisText(text);
    setParsed(result.data);
    setErrors(result.errors);
    if (!result.ok) {
      warntoast({ text: "ข้อมูลบางส่วนไม่ครบ ตรวจสอบรายการที่ขาด" });
    }
  };

  const handleSave = async () => {
    if (!parsed) {
      warntoast({ text: "กรุณากด 'แสดงตัวอย่าง' ก่อนบันทึก" });
      return;
    }
    setSaving(true);
    try {
      await service.save(parsed);
      successtoast({ text: "บันทึกสำเร็จ" });
      setText("");
      setParsed(null);
      setErrors([]);
    } catch (e: any) {
      errortoast({ text: e.message || "บันทึกไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            บันทึกผลการวิเคราะห์
          </h1>
          <p className="text-gray-500">วางข้อมูลผลวิเคราะห์ทั้งก้อน ระบบจะแยก field อัตโนมัติ</p>
        </header>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <label className="text-sm font-medium text-gray-700">
            ผลการวิเคราะห์ (วางทั้งก้อน)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={SAMPLE}
            rows={14}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-purple-primary"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setText("");
                setParsed(null);
                setErrors([]);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ล้าง
            </button>
            <button
              onClick={handleParse}
              className="px-4 py-2 rounded-lg bg-purple-primary hover:bg-purple-hover text-white"
            >
              แสดงตัวอย่าง
            </button>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            <p className="font-semibold mb-1">⚠️ ข้อมูลบางส่วนยังไม่ครบ:</p>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {parsed && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-2xl font-bold">{parsed.coin}</span>
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-primary text-sm font-semibold border border-purple-200">
                  {parsed.timeframe}
                </span>
                {parsed.trend && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold border ${trendColor(
                      parsed.trend,
                    )}`}
                  >
                    {parsed.trend}
                  </span>
                )}
                {parsed.recommendation && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold border ${recommendationColor(
                      parsed.recommendation,
                    )}`}
                  >
                    {parsed.recommendation}
                  </span>
                )}
                <span className="ml-auto text-sm text-gray-500">
                  {new Date(parsed.analyzed_at).toLocaleString("th-TH")}
                </span>
              </div>

              {parsed.trend_reason && (
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">เหตุผล: </span>
                  {parsed.trend_reason}
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Entry" value={parsed.entry_price} />
                <Stat label="Stop Loss" value={parsed.stop_loss} />
                <Stat label="Target 1" value={parsed.target_1} />
                <Stat label="Target 2" value={parsed.target_2} />
                <Stat label="แนวต้าน 1" value={parsed.resistance_1} />
                <Stat label="แนวต้าน 2" value={parsed.resistance_2} />
                <Stat label="แนวรับ 1" value={parsed.support_1} />
                <Stat label="แนวรับ 2" value={parsed.support_2} />
                <Stat label="RSI" value={parsed.rsi} />
                <Stat label="ATR" value={parsed.atr} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                {parsed.ema_note && <Note label="EMA" value={parsed.ema_note} />}
                {parsed.macd_note && <Note label="MACD" value={parsed.macd_note} />}
                {parsed.bollinger_note && (
                  <Note label="Bollinger" value={parsed.bollinger_note} />
                )}
                {parsed.volume_note && (
                  <Note label="Volume" value={parsed.volume_note} />
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95 ${
                  saving
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-purple-primary hover:bg-purple-hover text-white"
                }`}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value ?? "-"}</p>
    </div>
  );
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5">{value}</p>
    </div>
  );
}
