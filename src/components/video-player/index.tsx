import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './VideoPlayer.css';
import UploadFileService from '../../services/uploadfile';

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
    const videoId = searchParams.get('v');

    const [comments, setComments] = useState<Comment[]>([
        {
            id: 1,
            user: 'User123',
            text: 'วิดีโอนี้มีประโยชน์มากครับ ขอบคุณสำหรับการแบ่งปัน!',
            timestamp: '2 ชั่วโมงที่แล้ว',
            avatar: 'U'
        },
        {
            id: 2,
            user: 'JaneDoe',
            text: 'ภาพชัดมาก ระบบเสียงก็ดีสุดๆ 👍',
            timestamp: '5 ชั่วโมงที่แล้ว',
            avatar: 'J'
        }
    ]);
    const [newComment, setNewComment] = useState('');
    const [streamUrl, setStreamUrl] = useState<string | null>(null);

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: Date.now(),
            user: 'Me (Current User)',
            text: newComment,
            timestamp: 'เมื่อสักครู่นี้',
            avatar: 'M'
        };

        setComments([comment, ...comments]);
        setNewComment('');
    };


    const getfile = async () => {
        try {
            const id = searchParams.get("v")
            console.log('id', id);

            const body = JSON.stringify({
                id: Number(id)
            })
            console.log('typeof ', typeof body);

            const res = await uploadFileService.getDowloadPresignUrl(body);
            const jsonRes = await res.json();


            // เอา url ไปใส่ใน state ตรงๆ เลย ไม่ต้อง fetch เพิ่ม
            setStreamUrl(jsonRes.url);
        } catch (error) { }
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
                        <h1 className="video-title">ตัวอย่างวิดีโอ - การสอนเขียนโปรแกรมเบื้องต้น</h1>
                        <div className="video-stats">
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
                        </div>
                        <div className="video-description">
                            <p className="views-date">ยอดเข้าชม 250,431 ครั้ง • 10 ม.ค. 2026</p>
                            <p>นี่คือวิดีโอตัวอย่างที่ใช้สำหรับการแสดงผล Video Player หากคุณชอบโปรดกดไลก์และติดตาม!</p>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="comments-section">
                    <h2 className="comments-count">{comments.length} ความคิดเห็น</h2>

                    <form className="comment-form" onSubmit={handleAddComment}>
                        <div className="user-avatar">M</div>
                        <div className="comment-input-wrapper">
                            <input
                                type="text"
                                placeholder="เพิ่มความคิดเห็น..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="comment-input"
                            />
                            {newComment && (
                                <div className="comment-actions">
                                    <button type="button" className="cancel-btn" onClick={() => setNewComment('')}>ยกเลิก</button>
                                    <button type="submit" className="submit-btn" disabled={!newComment.trim()}>แสดงความคิดเห็น</button>
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="comments-list">
                        {comments.map((comment) => (
                            <div key={comment.id} className="comment-item">
                                <div className="comment-avatar">{comment.avatar}</div>
                                <div className="comment-content">
                                    <div className="comment-header">
                                        <span className="comment-user">@{comment.user}</span>
                                        <span className="comment-time">{comment.timestamp}</span>
                                    </div>
                                    <p className="comment-text">{comment.text}</p>
                                    <div className="comment-footer">
                                        <button className="comment-action-btn">👍 <span className="count"></span></button>
                                        <button className="comment-action-btn">👎</button>
                                        <button className="comment-action-btn reply">ตอบกลับ</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
