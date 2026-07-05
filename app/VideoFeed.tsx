"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoRecord } from "@/lib/videoStore";

export function VideoFeed({ videos }: { videos: VideoRecord[] }) {
    if (videos.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="flex flex-col items-center gap-6">
            {videos.map((video) => (
                <FeedCard key={video.videoId} video={video} />
            ))}
        </div>
    );
}

function FeedCard({ video }: { video: VideoRecord }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasCountedView = useRef(false);
    const [muted, setMuted] = useState(true);

    // Only the card mostly in view plays — like a TikTok/Reels feed, not
    // every video on the page playing at once. Counts one view the first
    // time it autoplays, not every time you scroll back over it.
    useEffect(() => {
        const videoEl = videoRef.current;
        const container = containerRef.current;
        if (!videoEl || !container) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    videoEl.play().catch(() => { });
                    if (!hasCountedView.current) {
                        hasCountedView.current = true;
                        fetch(`/api/video/${video.videoId}/view`, { method: "POST" }).catch(() => { });
                    }
                } else {
                    videoEl.pause();
                }
            },
            { threshold: 0.6 }
        );

        observer.observe(container);
        return () => observer.disconnect();
    }, [video.videoId]);

    return (
        <div
            ref={containerRef}
            className="relative mx-auto rounded-xl overflow-hidden border border-[#26262c] bg-black"
            style={{ width: "100%", maxWidth: 420, aspectRatio: "9 / 16" }}
        >
            <video
                ref={videoRef}
                src={video.videoUrl}
                poster={video.thumbUrl}
                muted={muted}
                loop
                playsInline
                className="w-full h-full object-cover"
            />

            <div className="absolute top-3 right-3 z-10 flex flex-col items-center gap-2">
                <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-full bg-black/50 backdrop-blur">
                    <EyeIcon />
                    <span className="text-[10px] font-medium text-white leading-none">
                        {formatCount(video.views ?? 0)}
                    </span>
                </div>
                <button
                    onClick={() => setMuted((m) => !m)}
                    className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
                    aria-label={muted ? "Unmute" : "Mute"}
                >
                    {muted ? <MutedIcon /> : <UnmutedIcon />}
                </button>
            </div>

            <a
                href={`/v/${video.videoId}`}
                className="absolute bottom-0 left-0 right-0 z-10 px-4 pt-10 pb-3 pr-24 bg-gradient-to-t from-black/80 to-transparent"
            >
                {video.uploaderName && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                        {video.uploaderImageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={video.uploaderImageUrl}
                                alt={video.uploaderName}
                                className="w-5 h-5 rounded-full object-cover"
                            />
                        )}
                        <span className="text-xs font-medium text-[#d4d4d8]">{video.uploaderName}</span>
                    </div>
                )}
                <p className="text-sm font-medium text-[#f2f2f0] truncate">{video.title}</p>
                <p className="text-[11px] text-[#c8c8cc]/70 mt-0.5">{timeAgo(video.createdAt)}</p>
            </a>

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

function EyeIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function MutedIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
    );
}

function UnmutedIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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