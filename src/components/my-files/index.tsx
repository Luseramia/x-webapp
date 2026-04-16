import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadFileService from "../../services/uploadfile";
import { errortoast } from "../../utilities/toast";

interface FileItem {
  id: number;
  fileName: string;
  originalName: string;
  category: string;
  isPublic: boolean;
  createdAt: string;
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "video":
      return "Video";
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "excel":
      return "Excel";
    case "document":
      return "Document";
    case "presentation":
      return "Presentation";
    case "text":
      return "Text";
    default:
      return "Other";
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "video":
      return "bg-purple-600 text-white";
    case "image":
      return "bg-purple-primary text-white";
    case "pdf":
      return "bg-red-500 text-white";
    case "excel":
      return "bg-green-600 text-white";
    case "document":
      return "bg-blue-600 text-white";
    case "presentation":
      return "bg-orange-500 text-white";
    case "text":
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const navigate = useNavigate();
  const uploadService = new UploadFileService();

  useEffect(() => {
    fetchFiles();
  }, []);

  async function fetchFiles() {
    setLoading(true);
    try {
      const res = await uploadService.getMyFiles();
      if (res.ok) {
        const data: FileItem[] = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisibility(file: FileItem) {
    setToggling(file.id);
    try {
      const res = await uploadService.updateFileVisibility(
        file.id,
        !file.isPublic,
      );
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, isPublic: !f.isPublic } : f,
          ),
        );
      } else {
        const err = await res.json().catch(() => ({}));
        errortoast({ text: err.error || "ไม่สามารถเปลี่ยนสิทธิ์ได้" });
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
      errortoast({ text: "เกิดข้อผิดพลาด" });
    } finally {
      setToggling(null);
    }
  }

  async function previewImage(file: FileItem) {
    setPreviewLoading(file.id);
    try {
      const body = JSON.stringify({ id: file.id });
      const res = await uploadService.getDowloadPresignUrl(body);
      const data = await res.json();
      if (data.url) {
        setPreviewUrl(data.url);
      }
    } catch (error) {
      console.error("Error loading preview:", error);
      errortoast({ text: "ไม่สามารถโหลดตัวอย่างภาพได้" });
    } finally {
      setPreviewLoading(null);
    }
  }

  async function downloadFile(file: FileItem) {
    setDownloading(file.id);
    try {
      const body = JSON.stringify({ id: file.id });
      const res = await uploadService.getDowloadPresignUrl(body);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      errortoast({ text: "เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์" });
    } finally {
      setDownloading(null);
    }
  }

  const categories = ["all", ...new Set(files.map((f) => f.category))];
  const filtered =
    filterCategory === "all"
      ? files
      : files.filter((f) => f.category === filterCategory);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            ไฟล์ของฉัน
          </h1>
          <p className="text-gray-500">ดูและดาวน์โหลดไฟล์ที่คุณอัปโหลด</p>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">ไฟล์ทั้งหมด</p>
            <p className="text-2xl font-bold text-purple-primary">
              {files.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">เอกสาร</p>
            <p className="text-2xl font-bold text-blue-600">
              {
                files.filter((f) =>
                  ["pdf", "document", "presentation", "text"].includes(
                    f.category,
                  ),
                ).length
              }
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Excel / CSV</p>
            <p className="text-2xl font-bold text-green-600">
              {files.filter((f) => f.category === "excel").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">รูปภาพ / วิดีโอ</p>
            <p className="text-2xl font-bold text-purple-600">
              {
                files.filter((f) =>
                  ["image", "video"].includes(f.category),
                ).length
              }
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === cat
                  ? "bg-purple-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all" ? "ทั้งหมด" : getCategoryLabel(cat)}
              {cat === "all"
                ? ` (${files.length})`
                : ` (${files.filter((f) => f.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* File list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-purple-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="text-gray-400 mt-4">ยังไม่มีไฟล์</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((file) => (
              <div
                key={file.id}
                className="group bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Category badge */}
                <div
                  className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold ${getCategoryColor(file.category)}`}
                >
                  {getCategoryLabel(file.category).slice(0, 3).toUpperCase()}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{file.originalName}</p>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        file.isPublic
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {file.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {getCategoryLabel(file.category)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(file.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Visibility toggle */}
                <button
                  onClick={() => toggleVisibility(file)}
                  disabled={toggling === file.id}
                  title={file.isPublic ? "เปลี่ยนเป็น Private" : "เปลี่ยนเป็น Public"}
                  className={`shrink-0 relative w-12 h-7 rounded-full transition-colors ${
                    toggling === file.id
                      ? "opacity-50 cursor-wait"
                      : "cursor-pointer"
                  } ${file.isPublic ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      file.isPublic ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Play video button */}
                {file.category === "video" && (
                  <button
                    onClick={() => navigate(`/watch?v=${file.id}`)}
                    className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-purple-primary text-purple-primary hover:bg-purple-primary hover:text-white"
                  >
                    <span className="flex items-center gap-2">
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
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      เล่นวิดีโอ
                    </span>
                  </button>
                )}

                {/* Preview button (image only) */}
                {file.category === "image" && (
                  <button
                    onClick={() => previewImage(file)}
                    disabled={previewLoading === file.id}
                    className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-purple-primary text-purple-primary hover:bg-purple-primary hover:text-white disabled:border-gray-300 disabled:text-gray-400"
                  >
                    {previewLoading === file.id ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-purple-primary border-t-transparent rounded-full animate-spin" />
                        โหลด
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        ดูตัวอย่าง
                      </span>
                    )}
                  </button>
                )}

                {/* Download button */}
                <button
                  onClick={() => downloadFile(file)}
                  disabled={downloading === file.id}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-purple-primary hover:bg-purple-hover text-white disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {downloading === file.id ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังโหลด
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      ดาวน์โหลด
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 w-10 h-10 bg-white text-gray-700 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-colors z-10"
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
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
