import { useRef, useState } from "react";
import Button from "../../utilities/button";
import UploadFileService from "../../services/uploadfile";
import { errortoast, successtoast, warntoast } from "../../utilities/toast";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

const ACCEPT_STRING =
  ".pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.mp4,.webm,.ogg,.mov";

function getFileIcon(type: string): string {
  if (type === "application/pdf") return "PDF";
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return "XLS";
  if (type.includes("word")) return "DOC";
  if (type.includes("presentation") || type.includes("powerpoint")) return "PPT";
  if (type.startsWith("image/")) return "IMG";
  if (type.startsWith("video/")) return "VID";
  if (type === "text/plain") return "TXT";
  return "FILE";
}

function getIconColor(label: string): string {
  switch (label) {
    case "PDF":
      return "bg-red-500";
    case "XLS":
      return "bg-green-600";
    case "DOC":
      return "bg-blue-600";
    case "PPT":
      return "bg-orange-500";
    case "IMG":
      return "bg-purple-primary";
    case "VID":
      return "bg-purple-600";
    case "TXT":
      return "bg-gray-500";
    default:
      return "bg-gray-400";
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = URL.createObjectURL(file);

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageUrl = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(video.src);
      resolve(imageUrl);
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      reject(e);
    };
  });
}

export default function FileUpload() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const openFileDialog = () => {
    fileRef.current?.click();
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles = Array.from(fileList).filter(
      (file) =>
        ACCEPTED_TYPES.includes(file.type) || file.type.startsWith("video/"),
    );

    if (newFiles.length < (fileList?.length ?? 0)) {
      warntoast({ text: "บางไฟล์ไม่รองรับและถูกข้ามไป" });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    if (fileRef.current) fileRef.current.value = "";
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

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  async function sendFiles() {
    if (files.length === 0) {
      warntoast({ text: "กรุณาเลือกไฟล์ก่อน" });
      return;
    }

    setUploading(true);
    setProgress(0);

    const uploadService = new UploadFileService();
    let completed = 0;

    try {
      for (const file of files) {
        let thumbnailUrl: string | undefined;

        if (file.type.startsWith("video/")) {
          try {
            thumbnailUrl = await generateVideoThumbnail(file);
          } catch {
            // thumbnail generation failed — upload without it
          }
        }

        const body = JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
        });

        const res = await uploadService.getUploadPresignUrl(body);
        const resJson = await res.json();

        await uploadService.putByPresign(resJson.url, file, (percent) => {
          const fileProgress = (completed + percent / 100) / files.length;
          setProgress(Math.round(fileProgress * 100));
        });

        completed++;
      }

      setProgress(100);
      successtoast({ text: "อัปโหลดไฟล์สำเร็จ!" });
      setFiles([]);
    } catch (error) {
      console.error("Error uploading files:", error);
      errortoast({ text: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์" });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-primary to-purple-hover">
            อัปโหลดไฟล์
          </h1>
          <p className="text-gray-500">
            รองรับวิดีโอ, รูปภาพ, PDF, Excel, Word, PowerPoint และอื่นๆ
          </p>
        </header>

        <input
          type="file"
          ref={fileRef}
          accept={ACCEPT_STRING}
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium">
              ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก
            </p>
            <p className="text-sm text-gray-400 mt-1">
              MP4, WebM, PNG, JPEG, PDF, Excel, Word, PowerPoint, CSV, TXT
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button name="เลือกไฟล์" fn={openFileDialog} />
          <Button name={uploading ? "กำลังอัปโหลด..." : "อัปโหลด"} fn={sendFiles} />
        </div>

        {uploading && progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-purple-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
            <p className="text-center text-sm text-gray-500 mt-2">{progress}%</p>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center mt-8">
              รายการไฟล์ที่เลือก ({files.length})
            </h2>
            <div className="space-y-3">
              {files.map((file, index) => {
                const label = getFileIcon(file.type);
                const color = getIconColor(label);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-transform hover:-translate-y-0.5"
                  >
                    <div
                      className={`${color} text-white text-xs font-bold w-12 h-12 rounded-lg flex items-center justify-center shrink-0`}
                    >
                      {label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-gray-400">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="w-8 h-8 bg-gray-100 hover:bg-red-500 hover:text-white text-gray-400 rounded-full flex items-center justify-center transition-colors shrink-0"
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
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
