import { Button } from "primereact/button";
import { useRef, useState } from "react";
// import Button from "../../utilities/button";
import { Image } from 'primereact/image';
type PreviewFile = {
  file: File;
  preview: string;
};

export default function IncomeExpense() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const openFileDialog = () => {
    fileRef.current?.click();
  };

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
    <>
      <input
        type="file"
        id="file"
        name="file"
        ref={fileRef}
        accept="image/png, image/jpeg"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      {/* <div
        onClick={openFileDialog}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: "2px dashed #aaa",
          padding: "40px",
          textAlign: "center",
          cursor: "pointer",
          background: dragActive ? "#f0f8ff" : "#fff",
        }}
      >
        <p>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
      </div> */}
      {/* <Button name={"เลือกไฟล์"} fn={openFileDialog}></Button> */}
      <Image
        src="/images/galleria/galleria14.jpg"
        zoomSrc="/images/galleria/galleria14.jpg"
        alt="Image"
        width="80"
        height="60"
        preview
      />

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        {files.map((item, index) => (
          <div key={index} style={{ position: "relative" }}>
            <img
              src={item.preview}
              alt="preview"
              width={120}
              height={120}
              style={{ objectFit: "cover", borderRadius: "8px" }}
            />
            <button
              onClick={() => removeFile(index)}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: "red",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              X
            </button>
          </div>
        ))}
      </div>

      {/* <Button name={"ส่งไฟล์"} fn={addF}></Button> */}
    </>
  );
}
