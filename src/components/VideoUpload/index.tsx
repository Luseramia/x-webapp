import React, { useState, useRef } from "react";
import "./VideoUpload.css";
import UploadFileService from "../../services/uploadfile";
import type { PresignModel } from "../../models/presign.model";
import Input from "../../utilities/input";
import Login from "../login/login";

const VideoUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [fileExtension, setFileExtension] = useState<string>("");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const uploadFileService = new UploadFileService();

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = URL.createObjectURL(file);
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2); // จับภาพที่วินาทีที่ 1
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
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      const lastDotIndex = file.name.lastIndexOf(".");
      if (lastDotIndex !== -1) {
        setFilename(file.name.substring(0, lastDotIndex));
        setFileExtension(file.name.substring(lastDotIndex));
      } else {
        setFilename(file.name);
        setFileExtension("");
      }
      setSelectedFile(file);
      setUploadStatus("idle");
      setProgress(0);

      // Create preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Generate thumbnail
      generateVideoThumbnail(file).then(thumbUrl => {
        setThumbnailUrl(thumbUrl);
      }).catch(err => console.error("Error generating thumbnail:", err));
    } else if (file) {
      alert("กรุณาเลือกไฟล์วิดีโอเท่านั้น");
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file);
      const lastDotIndex = file.name.lastIndexOf(".");
      if (lastDotIndex !== -1) {
        setFilename(file.name.substring(0, lastDotIndex));
        setFileExtension(file.name.substring(lastDotIndex));
      } else {
        setFilename(file.name);
        setFileExtension("");
      }
      setUploadStatus("idle");
      setProgress(0);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Generate thumbnail
      generateVideoThumbnail(file).then(thumbUrl => {
        setThumbnailUrl(thumbUrl);
      }).catch(err => console.error("Error generating thumbnail:", err));
    } else if (file) {
      alert("กรุณาเลือกไฟล์วิดีโอเท่านั้น");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus("uploading");
    const formData = new FormData();

    formData.append("file", selectedFile, filename + fileExtension);
    try {
      const response = await uploadFileService.uploadFileSteam(
        selectedFile,
        setProgress,
      );
      if (response!.status == 200) {
        setUploadStatus("success");
        setIsUploading(false);
      }
    } catch (error) {
      setUploadStatus("idle");
      setIsUploading(false);
    }
  };

  const handleUploadV2 = async () => {
    if (!selectedFile) return;
    const name = filename + fileExtension;
    const type = selectedFile.type;
    const size = selectedFile.size;

    setIsUploading(true);
    setUploadStatus("uploading");
    const body = JSON.stringify({
      name,
      type,
      size,
      thumbnailUrl
    });
    try {
      const res = await uploadFileService.getUploadPresignUrl(body);
      const resJson = await res.json();

      const sendFile = await uploadFileService.putByPresign(
        resJson.url,
        selectedFile,
        setProgress,
      );
      if (sendFile.status === 200) {
        setUploadStatus("success");
        setIsUploading(false);
      }
      else {
        setUploadStatus("error");

      }
    } catch (error) {
      setUploadStatus("error");
      setIsUploading(false);
    }
  };

  // const setFileName = async () => {
  //   selectedFile?.name;
  // };

  // const getfile = async () => {
  //   try {
  //     const res = await uploadFileService.getByPresign();
  //     const body = await res.json();
  //     console.log("body", body.url);

  //     // เอา url ไปใส่ใน state ตรงๆ เลย ไม่ต้อง fetch เพิ่ม
  //     setStreamUrl(body.url);
  //   } catch (error) {}
  // };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setThumbnailUrl(null);
    setProgress(0);
    setUploadStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="video-upload-container">
      <div className="upload-header">
        <h2>อัพโหลดวิดีโอ</h2>
        <p>คุณสามารถอัพโหลดไฟล์วิดีโอของคุณได้ที่นี่</p>
      </div>

      <div
        className={`drop-zone ${selectedFile ? "has-file" : ""} ${isUploading ? "uploading" : ""}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
        />

        {!selectedFile ? (
          <div className="drop-zone-content">
            <div className="upload-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 16V8M12 8L9 11M12 8L15 11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 15V16C3 18.2091 4.79086 20 7 20H17C19.2091 20 21 18.2091 21 16V15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="main-text">
              ลากวิดีโอมาวางที่นี่ หรือ <span>คลิกเพื่อเลือกไฟล์</span>
            </p>
            <p className="sub-text">รองรับไฟล์ MP4, WebM, Ogg (สูงสุด 500MB)</p>
          </div>
        ) : (
          <div className="selected-file-preview">
            {previewUrl && (
              <video className="video-player-preview" controls>
                <source src={previewUrl} type={selectedFile.type} />
                เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ
              </video>
            )}
            <div className="file-info-overlay">
              <span className="file-name">
                {filename}
                {fileExtension}
              </span>
              <span className="file-size">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            {!isUploading && uploadStatus !== "success" && (
              <button
                className="remove-file"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {selectedFile && uploadStatus === "idle" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <Input name="ชื่อไฟล์" value={filename} fn={setFilename}></Input>
            <span
              style={{ fontSize: "1.25rem", fontWeight: "500", color: "#fff" }}
            >
              {fileExtension}
            </span>
          </div>
          {/* {thumbnailUrl && (
             <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                <p style={{ color: "#a3a3a3", fontSize: "0.9rem", margin: 0 }}>รูปภาพปกจำลอง (Thumbnail)</p>
                <img src={thumbnailUrl} alt="Video Thumbnail" style={{ width: "240px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)", objectFit: "cover", aspectRatio: "16/9" }} />
             </div>
          )} */}
          <button className="upload-button" onClick={handleUploadV2}>
            เริ่มการอัพโหลด
          </button>
        </>
      )}

      {/* <button className="upload-button" onClick={getfile}>
        โหลดไฟล์เทส
      </button>

      {streamUrl && (
        <video controls style={{ width: "100%", marginTop: "16px" }}>
          <source src={streamUrl} type="video/x-matroska" />
        </video>
      )} */}

      {uploadStatus === "uploading" && (
        <div className="upload-progress-container">
          <div className="progress-bar-wrapper">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-details">
            <span>กำลังอัพโหลด... {Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {uploadStatus === "success" && (
        <div className="upload-success-message">
          <div className="success-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3>อัพโหลดสำเร็จ!</h3>
          <p>วิดีโอของคุณได้รับการอัพโหลดเรียบร้อยแล้ว</p>
          <button className="reset-button" onClick={clearSelection}>
            อัพโหลดไฟล์ใหม่
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
