import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./VideoPlayer.css";
import UploadFileService from "../../services/uploadfile";

interface Comment {
  id: number;
  user: string;
  text: string;
  timestamp: string;
  avatar: string;
}

const uploadFileService = new UploadFileService();

const VideoPlayer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("v");
  const [title, setTitle] = useState<String | null>(null);
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      user: "User123",
      text: "วิดีโอนี้มีประโยชน์มากครับ ขอบคุณสำหรับการแบ่งปัน!",
      timestamp: "2 ชั่วโมงที่แล้ว",
      avatar: "U",
    },
    {
      id: 2,
      user: "JaneDoe",
      text: "ภาพชัดมาก ระบบเสียงก็ดีสุดๆ 👍",
      timestamp: "5 ชั่วโมงที่แล้ว",
      avatar: "J",
    },
  ]);
  const [newComment, setNewComment] = useState("");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now(),
      user: "Me (Current User)",
      text: newComment,
      timestamp: "เมื่อสักครู่นี้",
      avatar: "M",
    };

    setComments([comment, ...comments]);
    setNewComment("");
  };

  const getfile = async () => {
    try {
      const id = searchParams.get("v");
      console.log("id", id);

      const body = JSON.stringify({
        id: Number(id),
      });
      console.log("typeof ", typeof body);

      const res = await uploadFileService.getVideoPresignUrl(body);
      const jsonRes = await res.json();

      // เอา url ไปใส่ใน state ตรงๆ เลย ไม่ต้อง fetch เพิ่ม
      setStreamUrl(jsonRes.url);
      setTitle(jsonRes.original_file_name)
    } catch (error) {}
  };

  useEffect(() => {
    getfile();
  }, []);

  return (
    <div className="video-page-container">
      <div className="video-content-wrapper">
        {/* Video Player Section */}
        <div className="video-player-section">
          <div className="video-player-container">
            {streamUrl && (
              <video className="video-player" controls>
                <source src={streamUrl} type="video/x-matroska" />
              </video>
            )}
          </div>

          <div className="video-info">
            <h1 className="video-title">{title}</h1>
            {/* <div className="video-stats">
              <div className="channel-info">
                <div className="channel-avatar">T</div>
                <div>
                  <div className="channel-name">Tech Channel</div>
                  <div className="subscriber-count">ผู้ติดตาม 1.2M คน</div>
                </div>
                <button className="subscribe-btn">ติดตาม</button>
              </div>
              <div className="action-buttons">
                <button className="action-btn">
                  <span className="icon">👍</span> 12K
                </button>
                <button className="action-btn">
                  <span className="icon">👎</span>
                </button>
                <button className="action-btn">
                  <span className="icon">↗️</span> แชร์
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
