import { useRef, useState } from "react";
import Button from "../../utilities/button";
import BankStatementService, {
  type Transaction,
} from "../../services/bank-statement.service";

type Step = "upload" | "review";

export default function BankStatement() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const service = new BankStatementService();

  const openFileDialog = () => fileRef.current?.click();

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      alert("รองรับเฉพาะไฟล์ PDF เท่านั้น");
      return;
    }
    setFile(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const processFile = async () => {
    if (!file) {
      alert("กรุณาเลือกไฟล์ PDF ก่อน");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const data = await service.processStatement(formData);
      setTransactions(data.transactions);
      setStep("review");
    } catch (error: any) {
      console.error("Error processing statement:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message || "ไม่สามารถประมวลผลไฟล์ได้"}`);
    } finally {
      setLoading(false);
    }
  };

  const removeTransaction = (index: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  const saveTransactions = async () => {
    if (transactions.length === 0) {
      alert("ไม่มีรายการที่จะบันทึก");
      return;
    }

    setSaving(true);
    try {
      const response = await service.saveTransactions(transactions);
      if (response.ok) {
        alert("บันทึกสำเร็จ!");
        setTransactions([]);
        setFile(null);
        setStep("upload");
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(
          `บันทึกไม่สำเร็จ: ${errorData.message || response.statusText}`
        );
      }
    } catch (error: any) {
      console.error("Error saving transactions:", error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setStep("upload");
    setTransactions([]);
  };

  const totalWithdrawal = transactions.reduce(
    (sum, t) => sum + (parseFloat(t.withdrawal) || 0),
    0
  );
  const totalDeposit = transactions.reduce(
    (sum, t) => sum + (parseFloat(t.deposit) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            Bank Statement
          </h1>
          <p className="text-gray-500">
            อัปโหลดไฟล์ PDF รายการเดินบัญชีเพื่อประมวลผล
          </p>
        </header>

        {step === "upload" && (
          <>
            <input
              type="file"
              ref={fileRef}
              accept="application/pdf"
              className="hidden"
              onChange={handleChange}
            />

            <div
              onClick={openFileDialog}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                flex flex-col items-center justify-center space-y-4
                ${
                  dragActive
                    ? "border-purple-primary bg-purple-primary/10"
                    : "border-gray-200 hover:border-purple-primary hover:bg-gray-50"
                }
              `}
            >
              <div className="w-16 h-16 bg-purple-primary/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-purple-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium">
                  ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่อเลือก
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  รองรับไฟล์ PDF รายการเดินบัญชีธนาคาร
                </p>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <svg
                  className="w-6 h-6 text-red-500 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 3.5L18.5 8H14V3.5zM6 20V4h7v5h5v11H6z" />
                </svg>
                <span className="text-sm font-medium truncate">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button name="เลือกไฟล์" fn={openFileDialog} />
              <button
                onClick={processFile}
                disabled={!file || loading}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95
                  ${
                    !file || loading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-purple-primary hover:bg-purple-hover text-white"
                  }
                `}
              >
                {loading ? "กำลังประมวลผล..." : "ประมวลผล"}
              </button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">จำนวนรายการ</p>
                <p className="text-2xl font-bold text-purple-primary">
                  {transactions.length}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">รวมถอน</p>
                <p className="text-2xl font-bold text-red-500">
                  {totalWithdrawal.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">รวมฝาก</p>
                <p className="text-2xl font-bold text-green-500">
                  {totalDeposit.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {/* Transaction list */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">
                รายการทั้งหมด ({transactions.length})
              </h2>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {transactions.map((t, index) => (
                  <div
                    key={index}
                    className="group bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 hover:shadow-md transition-shadow"
                  >
                    {/* Icon */}
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        t.deposit
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {t.deposit ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {t.transaction_type}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {t.channel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.datetime}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line break-all">
                        {t.details}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-lg font-bold ${
                          t.deposit ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {t.deposit
                          ? `+${parseFloat(t.deposit).toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}`
                          : `-${parseFloat(t.withdrawal).toLocaleString(
                              "th-TH",
                              { minimumFractionDigits: 2 }
                            )}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        คงเหลือ{" "}
                        {parseFloat(t.balance).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeTransaction(index)}
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="ลบรายการนี้"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4 pb-8">
              <button
                onClick={goBack}
                className="px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={saveTransactions}
                disabled={saving || transactions.length === 0}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95
                  ${
                    saving || transactions.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-purple-primary hover:bg-purple-hover text-white"
                  }
                `}
              >
                {saving ? "กำลังบันทึก..." : `บันทึก (${transactions.length} รายการ)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
