// import { Button } from "primereact/button";
import { useRef, useState } from "react";
import Button from "../../utilities/button";
import { Image } from "primereact/image";
import IncomeExpenseService from "../../services/income-expense.service";
import uploadFileService from "../../services/uploadfile";
import UploadFileService from "../../services/uploadfile";

type PreviewFile = {
  file: File;
  preview: string;
};

export default function IncomeExpense() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const openFileDialog = () => {
    fileRef.current?.click();
  };

  async function sendFile() {
    if (files.length === 0) {
      alert("กรุณาเลือกไฟล์ก่อน");
      return;
    }

    const formData = new FormData();
    files.forEach((item) => {
      formData.append("images", item.file);
    });

    try {
      const incomeExpenseService = new IncomeExpenseService();
      const response = await incomeExpenseService.uploadOcrBatch(
        formData,
        setProgress,
      );

      if (response.ok) {
        alert("ส่งไฟล์สำเร็จ!");
        setFiles([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`ส่งไฟล์ไม่สำเร็จ: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("เกิดข้อผิดพลาดในการส่งไฟล์");
    }
  }

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: PreviewFile[] = [];

    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  // ลบไฟล์
  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            Income & Expense
          </h1>
          <p className="text-gray-500">จัดการรายรับ-รายจ่ายผ่าน OCR</p>
        </header>

        <input
          type="file"
          id="file"
          name="file"
          ref={fileRef}
          accept="image/png, image/jpeg"
          className="hidden"
          onChange={handleChange}
          multiple
        />

        <div
          onClick={openFileDialog}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            flex flex-col items-center justify-center space-y-4
            ${dragActive
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
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium">
              ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก
            </p>
            <p className="text-sm text-gray-400 mt-1">รองรับไฟล์ PNG, JPEG</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button name={"เลือกไฟล์"} fn={openFileDialog} />
          <Button name={"ส่งไฟล์"} fn={sendFile} />
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center mt-8">
              รายการไฟล์ที่เลือก ({files.length})
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              {files.map((item, index) => (
                <div
                  key={index}
                  className="group relative bg-white rounded-xl shadow-lg border border-gray-100 p-2 transition-transform hover:-translate-y-1"
                >
                  <Image
                    src={item.preview}
                    zoomSrc={item.preview}
                    alt={`Preview ${index}`}
                    width="160"
                    height="160"
                    preview
                    className="rounded-lg overflow-hidden"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove file"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
