import type { Metadata } from "next";
import { getVideo } from "@/lib/videoStore";
import { notFound } from "next/navigation";
import { DeleteButton } from "./DeleteButton";
import { ViewTracker } from "./ViewTracker";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ videoId: string }>;
}): Promise<Metadata> {
    const { videoId } = await params;
    const video = await getVideo(videoId);

    if (!video) {
        return { title: "Video not found" };
    }

    const pageUrl = `${SITE_URL}/v/${video.videoId}`;

    return {
        title: `${video.title} — ClipDrop`,
        openGraph: {
            title: video.title,
            type: "video.other",
            url: pageUrl,
            images: [{ url: video.thumbUrl, width: video.width, height: video.height }],
        },
        twitter: {
            card: "summary_large_image",
            title: video.title,
            images: [video.thumbUrl],
        },
    };
}

export default async function WatchPage({
    params,
}: {
    params: Promise<{ videoId: string }>;
}) {
    const { videoId } = await params;
    const video = await getVideo(videoId);

    if (!video) notFound();

    return (
        <main className="min-h-screen bg-[#0a0a0c] text-[#f2f2f0]">
            <ViewTracker videoId={video.videoId} />

            <header className="border-b border-[#1c1c20] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-20">
                <a href="/" className="font-bold tracking-tight text-lg">
                    clip<span className="text-[#ff3d6e]">drop</span>
                </a>
                <a
                    href="/upload"
                    className="text-sm font-medium px-3.5 py-1.5 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
                >
                    upload
                </a>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-8">
                <a
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-[#8a8a92] hover:text-[#f2f2f0] mb-5 transition-colors"
                >
                    ← back to all videos
                </a>

                <div className="rounded-xl overflow-hidden border border-[#26262c] bg-black">
                    <video
                        src={video.videoUrl}
                        poster={video.thumbUrl}
                        controls
                        playsInline
                        className="w-full h-auto block max-h-[70vh]"
                    />
                </div>

                <div className="flex items-start justify-between gap-4 mt-5">
                    <div>
                        {video.uploaderName && (
                            <div className="flex items-center gap-2 mb-2">
                                {video.uploaderImageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={video.uploaderImageUrl}
                                        alt={video.uploaderName}
                                        className="w-6 h-6 rounded-full object-cover"
                                    />
                                )}
                                <span className="text-sm font-medium text-[#d4d4d8]">{video.uploaderName}</span>
                            </div>
                        )}
                        <h1 className="text-xl font-semibold text-[#f2f2f0]">{video.title}</h1>
                        <p className="text-xs text-[#5a5a62] mt-1">
                            {formatCount(video.views ?? 0)} views · {timeAgo(video.createdAt)}
                        </p>
                    </div>
                    <a
                        href={`/upload?videoId=${video.videoId}`}
                        className="shrink-0 text-sm font-medium px-4 py-2.5 rounded-lg bg-[#ff3d6e] text-white hover:bg-[#ff5580] transition-colors"
                    >
                        make a clip
                    </a>
                </div>

                <div className="mt-3">
                    <DeleteButton videoId={video.videoId} />
                </div>
            </div>
        </main>
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