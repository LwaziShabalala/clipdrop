"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoRecord } from "@/lib/videoStore";

function hasAlreadyViewed(videoId: string): boolean {
    try {
        return localStorage.getItem(`viewed:${videoId}`) !== null;
    } catch {
        return false;
    }
}

function markViewed(videoId: string) {
    try {
        localStorage.setItem(`viewed:${videoId}`, "1");
    } catch {
        // localStorage unavailable — worst case this browser can recount once
    }
}

export function VideoFeed({ videos }: { videos: VideoRecord[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
    const cooldown = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || videos.length === 0) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (cooldown.current) return;

            const direction = e.deltaY > 0 ? 1 : -1;
            const nextIndex = activeIndex + direction;
            if (nextIndex < 0 || nextIndex >= videos.length) return;

            cooldown.current = true;
            setActiveIndex(nextIndex);
            slideRefs.current[nextIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });

            setTimeout(() => {
                cooldown.current = false;
            }, 700);
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => container.removeEventListener("wheel", handleWheel);
    }, [activeIndex, videos.length]);

    if (videos.length === 0) {
        return <EmptyState />;
    }

    return (
        <div
            ref={containerRef}
            className="overflow-y-auto no-scrollbar"
            style={{
                height: "min(calc(100dvh - 100px), 860px)",
                scrollSnapType: "y mandatory",
            }}
        >
            {videos.map((video, i) => (
                <div
                    key={video.videoId}
                    ref={(el) => {
                        slideRefs.current[i] = el;
                    }}
                    className="flex items-center justify-center"
                    style={{ height: "100%", scrollSnapAlign: "start" }}
                >
                    <FeedCard video={video} />
                </div>
            ))}
        </div>
    );
}

function FeedCard({ video }: { video: VideoRecord }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(false);

    // Landscape videos get shrunk-to-fit (with letterboxing) instead of
    // cropped to fill — cropping a wide video into this tall 9:16 slot
    // would slice off both sides and only show a thin vertical strip of
    // the middle.
    const isLandscape = video.width > video.height;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setPlaying(entry.isIntersecting);
                if (entry.isIntersecting && !hasAlreadyViewed(video.videoId)) {
                    fetch(`/api/video/${video.videoId}/view`, { method: "POST" })
                        .then(() => markViewed(video.videoId))
                        .catch(() => { });
                }
            },
            { threshold: 0.6 }
        );

        observer.observe(container);
        return () => observer.disconnect();
    }, [video.videoId]);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        if (playing) {
            videoEl.play().catch(() => { });
        } else {
            videoEl.pause();
        }
    }, [playing]);

    const handleFullscreen = () => {
        const el = videoRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        } else {
            el.requestFullscreen().catch(() => { });
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative mx-auto rounded-xl overflow-hidden border border-[#26262c] bg-black"
            style={{
                height: "100%",
                width: "auto",
                maxWidth: 420,
                aspectRatio: "9 / 16",
            }}
        >
            <video
                ref={videoRef}
                src={video.videoUrl}
                poster={video.thumbUrl}
                muted={muted}
                loop
                playsInline
                preload="metadata"
                onClick={() => setPlaying((p) => !p)}
                className={`w-full h-full cursor-pointer ${isLandscape ? "object-contain" : "object-cover"}`}
            />

            {!playing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                        <PlayIcon />
                    </div>
                </div>
            )}

            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3">
                <div className="flex flex-col items-center gap-1 px-2.5 py-2 rounded-full bg-black/50 backdrop-blur">
                    <EyeIcon />
                    <span className="text-xs font-medium text-white leading-none">
                        {formatCount(video.views ?? 0)}
                    </span>
                </div>
                <button
                    onClick={handleFullscreen}
                    className="w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
                    aria-label="Fullscreen"
                >
                    <ExpandIcon />
                </button>
                <button
                    onClick={() => setMuted((m) => !m)}
                    className="w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
                    aria-label={muted ? "Unmute" : "Mute"}
                >
                    {muted ? <MutedIcon /> : <UnmutedIcon />}
                </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pt-10 pb-3 pr-24 bg-gradient-to-t from-black/80 to-transparent">
                {video.uploaderName && (
                    <a
                        href={`/u/${encodeURIComponent(video.uploaderName)}`}
                        className="flex items-center gap-2 mb-2 w-fit"
                    >
                        {video.uploaderImageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={video.uploaderImageUrl}
                                alt={video.uploaderName}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        )}
                        <span className="text-sm font-medium text-[#d4d4d8] hover:text-white transition-colors">
                            {video.uploaderName}
                        </span>
                    </a>
                )}
                <a href={`/v/${video.videoId}`} className="block">
                    <p className="text-sm font-medium text-[#f2f2f0] truncate">{video.title}</p>
                    <p className="text-[11px] text-[#c8c8cc]/70 mt-0.5">{timeAgo(video.createdAt)}</p>
                </a>
            </div>

            <a
                href={`/upload?videoId=${video.videoId}`}
                className="absolute bottom-3 right-3 z-10 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
            >
                make a clip
            </a>
        </div>
    );
}

function EmptyState() {
    return (
        <div
            className="flex flex-col items-center justify-center gap-3 py-24 mx-auto rounded-2xl border-2 border-dashed border-[#26262c] text-center"
            style={{ width: "100%", maxWidth: 420 }}
        >
            <div className="w-12 h-12 rounded-full bg-[#1c1c20] flex items-center justify-center text-xl">
                🎬
            </div>
            <p className="text-sm font-medium">No videos yet</p>
            <p className="text-xs text-[#5a5a62] max-w-xs">
                The feed fills up as videos get uploaded. Be the first.
            </p>
            <a
                href="/upload"
                className="mt-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
            >
                upload a video
            </a>
        </div>
    );
}

function PlayIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}

function ExpandIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function MutedIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
    );
}

function UnmutedIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
    );
}

function formatCount(n: number): string {
    if (n < 1000) return String(n);
    if (n < 1000000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}K`;
    return `${(n / 1000000).toFixed(1)}M`;
}

function timeAgo(iso: string) {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}