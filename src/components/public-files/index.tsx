import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadFileService from "../../services/uploadfile";
import { errortoast } from "../../utilities/toast";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DOCUMENT_CATEGORIES = ["pdf", "document", "presentation", "text"];
const MEDIA_CATEGORIES = ["image", "video"];

interface FileItem {
  id: number;
  fileName: string;
  originalName: string;
  category: string;
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

export default function PublicFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [counts, setCounts] = useState<{
    total: number;
    byCategory: Record<string, number>;
  }>({ total: 0, byCategory: {} });

  const navigate = useNavigate();
  const uploadService = useMemo(() => new UploadFileService(), []);

  // Reset to page 1 when filter or pageSize changes
  useEffect(() => {
    setPage(1);
  }, [filterCategory, pageSize]);

  // Fetch paginated files
  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, page, pageSize]);

  // Fetch category counts once on mount
  useEffect(() => {
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFiles() {
    setLoading(true);
    try {
      const res = await uploadService.getPublicFiles({
        category: filterCategory === "all" ? undefined : filterCategory,
        page,
        pageSize,
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (error) {
      console.error("Error fetching public files:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      const res = await uploadService.getPublicFilesCounts();
      if (res.ok) {
        const data = await res.json();
        setCounts({
          total: data.total ?? 0,
          byCategory: data.byCategory ?? {},
        });
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
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

  const categories = useMemo(
    () => ["all", ...Object.keys(counts.byCategory)],
    [counts.byCategory],
  );
  const currentPage = Math.min(page, totalPages);

  const sumByCategories = (cats: string[]) =>
    cats.reduce((sum, c) => sum + (counts.byCategory[c] ?? 0), 0);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            ไฟล์สาธารณะ
          </h1>
          <p className="text-gray-500">ไฟล์ทั้งหมดที่ถูกแชร์เป็นสาธารณะ</p>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">ไฟล์ทั้งหมด</p>
            <p className="text-2xl font-bold text-purple-primary">
              {counts.total}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">เอกสาร</p>
            <p className="text-2xl font-bold text-blue-600">
              {sumByCategories(DOCUMENT_CATEGORIES)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Excel / CSV</p>
            <p className="text-2xl font-bold text-green-600">
              {counts.byCategory.excel ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">รูปภาพ / วิดีโอ</p>
            <p className="text-2xl font-bold text-purple-600">
              {sumByCategories(MEDIA_CATEGORIES)}
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
                ? ` (${counts.total})`
                : ` (${counts.byCategory[cat] ?? 0})`}
            </button>
          ))}
        </div>

        {/* File list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-purple-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-4">กำลังโหลด...</p>
          </div>
        ) : files.length === 0 ? (
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
            <p className="text-gray-400 mt-4">ยังไม่มีไฟล์สาธารณะ</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {files.map((file) => (
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
                  <p className="font-medium truncate">{file.originalName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {getCategoryLabel(file.category)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(file.createdAt)}
                    </span>
                  </div>
                </div>

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

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-3">
            <div className="text-sm text-gray-500">
              ทั้งหมด <span className="font-semibold text-gray-700">{total}</span>{" "}
              ไฟล์ • หน้า{" "}
              <span className="font-semibold text-gray-700">{currentPage}</span>/
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
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
                aria-label="หน้าแรก"
              >
                «
              </PageBtn>
              <PageBtn
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ก่อนหน้า
              </PageBtn>

              {getPageNumbers(currentPage, totalPages).map((p, i) =>
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
                    active={p === currentPage}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </PageBtn>
                ),
              )}

              <PageBtn
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ถัดไป
              </PageBtn>
              <PageBtn
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="หน้าสุดท้าย"
              >
                »
              </PageBtn>
            </div>
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
