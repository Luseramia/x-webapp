import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './VideoFeed.css';
import UploadFileService from '../../services/uploadfile';

interface VideoInfo {
    id: number;
    title: string;
    thumbnail: string;
    // channelName: string;
    // views: string;
    // timestamp: string;
    // duration: string;
}

// const mockVideos: VideoInfo[] = [
//     {
//         id: "1",
//         title: "ตัวอย่างวิดีโอ - การสอนเขียนโปรแกรมเบื้องต้น",
//         thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "T",
//         channelName: "Tech Channel",
//         views: "250K ครั้ง",
//         timestamp: "2 ชั่วโมงที่แล้ว",
//         duration: "10:05"
//     },
//     {
//         id: "2",
//         title: "สรุปข่าวไอทีประจำสัปดาห์ | อัปเดตล่าสุดเทคโนโลยี",
//         thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "N",
//         channelName: "News Update",
//         views: "1.2M ครั้ง",
//         timestamp: "1 วันที่แล้ว",
//         duration: "15:20"
//     },
//     {
//         id: "3",
//         title: "10 วิธีเพิ่ม Productivity ในการทำงาน",
//         thumbnail: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "C",
//         channelName: "Creator Hub",
//         views: "45K ครั้ง",
//         timestamp: "3 วันที่แล้ว",
//         duration: "8:45"
//     },
//     {
//         id: "4",
//         title: "พาทัวร์ออฟฟิศใหม่ ย่านใจกลางเมือง!",
//         thumbnail: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "O",
//         channelName: "Office Life",
//         views: "890K ครั้ง",
//         timestamp: "1 สัปดาห์ที่แล้ว",
//         duration: "20:11"
//     },
//     {
//         id: "5",
//         title: "สอนสร้างเว็บไซต์ด้วย React 2026 แบบจับมือทำ",
//         thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "W",
//         channelName: "Web Dev TH",
//         views: "50K ครั้ง",
//         timestamp: "5 ชั่วโมงที่แล้ว",
//         duration: "45:30"
//     },
//     {
//         id: "6",
//         title: "รีวิวเกมใหม่ ที่ภาพสวยที่สุดในตอนนี้",
//         thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "G",
//         channelName: "Gamer Zone",
//         views: "300K ครั้ง",
//         timestamp: "1 เดือนที่แล้ว",
//         duration: "12:00"
//     },
//     {
//         id: "7",
//         title: "จัดโต๊ะคอมพิวเตอร์สไตล์มินิมอล งบประหยัด",
//         thumbnail: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "M",
//         channelName: "Minimal Setup",
//         views: "1.5M ครั้ง",
//         timestamp: "2 เดือนที่แล้ว",
//         duration: "14:15"
//     },
//     {
//         id: "8",
//         title: "เคล็ดลับการถ่ายภาพให้ดูแพง ด้วยมือถือเครื่องเดียว",
//         thumbnail: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
//         channelAvatar: "P",
//         channelName: "Photo trick",
//         views: "22K ครั้ง",
//         timestamp: "15 นาทีที่แล้ว",
//         duration: "5:50"
//     }
// ];




const VideoFeed: React.FC = () => {

    const [allVideo, setAllVideo] = useState<VideoInfo[]>([]);

    const uploadFileService = new UploadFileService();
    const getAllThumnail = async () => {
        try {
            const res = await uploadFileService.getAllThumnail();
            const body = await res.json();
            // if (body.status === 200) {
            setAllVideo(body);
            // }
        } catch (error) { }
    };

    useEffect(() => {
        getAllThumnail();
    }, []);

    return (
        <div className="video-feed-container">

            <div className="video-grid">
                {allVideo.map((video) => (
                    <Link to={`/watch?v=${video.id}`} key={video.id} className="video-card-link">
                        <div className="video-card">
                            <div className="video-thumbnail-wrapper">
                                <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
                                {/* <span className="video-duration">{video.duration}</span> */}
                            </div>
                            <div className="video-details">
                                {/* <div className="channel-avatar">{video.channelAvatar}</div> */}
                                <div className="video-meta">
                                    <h3 className="video-title">{video.title}</h3>
                                    {/* <div className="channel-name">{video.channelName}</div> */}
                                    <div className="video-stats">
                                        {/* {video.timestamp} */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default VideoFeed;
