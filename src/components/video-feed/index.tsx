import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./VideoFeed.css";
import UploadFileService from "../../services/uploadfile";

interface VideoInfo {
  id: number;
  title: string;
  thumbnail: string;
}

const PAGE_SIZE = 12;

const VideoFeed: React.FC = () => {
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const uploadFileService = useMemo(() => new UploadFileService(), []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await uploadFileService.getAllThumnail({
        page: pageRef.current,
        pageSize: PAGE_SIZE,
      });
      if (res.ok) {
        const body = await res.json();
        const items: VideoInfo[] = body.items ?? [];
        const totalPages: number = body.totalPages ?? 1;
        setVideos((prev) => [...prev, ...items]);
        const more = pageRef.current < totalPages;
        hasMoreRef.current = more;
        setHasMore(more);
        pageRef.current += 1;
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [uploadFileService]);

  // Initial load
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver — fires when sentinel approaches viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="video-feed-container">
      <div className="video-grid">
        {videos.map((video) => (
          <Link
            to={`/watch?v=${video.id}`}
            key={video.id}
            className="video-card-link"
          >
            <div className="video-card">
              <div className="video-thumbnail-wrapper">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="video-thumbnail"
                  loading="lazy"
                />
              </div>
              <div className="video-details">
                <div className="video-meta">
                  <h3 className="video-title">{video.title}</h3>
                  <div className="video-stats" />
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* Skeleton placeholders while loading */}
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="video-card">
              <div className="video-thumbnail-wrapper video-skeleton-shimmer" />
              <div className="video-details">
                <div className="video-meta" style={{ width: "100%" }}>
                  <div className="video-skeleton-line video-skeleton-shimmer" />
                  <div
                    className="video-skeleton-line video-skeleton-shimmer"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Sentinel — triggers next page load when near viewport */}
      <div ref={sentinelRef} className="video-feed-sentinel" />

      {!hasMore && videos.length > 0 && (
        <div className="video-feed-end">— หมดแล้ว —</div>
      )}
      {!loading && videos.length === 0 && (
        <div className="video-feed-end">ยังไม่มีวิดีโอ</div>
      )}
    </div>
  );
};

export default VideoFeed;
